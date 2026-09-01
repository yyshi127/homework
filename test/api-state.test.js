import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));

async function availablePort() {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  server.close();
  await once(server, 'close');
  return port;
}

async function waitForServer(url) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return;
    } catch {
      // The child process may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('临时 API 服务启动超时');
}

function createSseReader(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  return {
    async next() {
      while (true) {
        const boundary = buffer.indexOf('\n\n');
        if (boundary >= 0) {
          const block = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const data = block.split('\n').find((line) => line.startsWith('data: '));
          if (data) return JSON.parse(data.slice(6));
          continue;
        }
        const { done, value } = await reader.read();
        if (done) throw new Error('SSE connection closed before an event arrived');
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
      }
    },
  };
}

const validState = {
  months: [{
    id: 'month-1',
    year: 2026,
    month: 7,
    categories: [{ id: 'cat-1', name: '语文', tasks: [] }],
    readingBooks: [],
    redeemedRewards: [],
    checks: {},
    notes: {},
  }],
  rewardConfig: [],
  profile: {},
  snapshots: [],
};

test('state API deduplicates repeated saves and rejects real conflicts', { timeout: 20_000 }, async () => {
  const port = await availablePort();
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'homework-api-test-'));
  const baseUrl = `http://127.0.0.1:${port}`;
  const legacyDb = new Database(path.join(dataDir, 'homework.sqlite'));
  legacyDb.exec(`
    CREATE TABLE app_state (
      key TEXT PRIMARY KEY,
      state_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE ai_config (
      key TEXT PRIMARY KEY,
      config_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  legacyDb.prepare('INSERT INTO app_state (key, state_json, updated_at) VALUES (?, ?, ?)')
    .run('main', JSON.stringify(validState), new Date().toISOString());
  legacyDb.close();
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: projectRoot,
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir },
    stdio: 'ignore',
    windowsHide: true,
  });
  const eventController = new AbortController();

  try {
    await waitForServer(baseUrl);

    const initial = await fetch(`${baseUrl}/api/state`).then((response) => response.json());
    assert.equal(initial.version, 0);
    assert.equal(initial.state.months[0].id, 'month-1');

    const eventResponse = await fetch(`${baseUrl}/api/state/events`, { signal: eventController.signal });
    assert.equal(eventResponse.status, 200);
    assert.match(eventResponse.headers.get('content-type'), /text\/event-stream/);
    const events = createSseReader(eventResponse.body);
    assert.equal((await events.next()).version, 0);

    const firstState = structuredClone(validState);
    firstState.months[0].goal = '第一次保存';
    const firstResponse = await fetch(`${baseUrl}/api/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: firstState, expectedVersion: 0, clientId: 'computer-test' }),
    });
    assert.equal(firstResponse.status, 200);
    assert.equal((await firstResponse.json()).version, 1);
    const savedEvent = await events.next();
    assert.equal(savedEvent.version, 1);
    assert.equal(savedEvent.sourceClientId, 'computer-test');
    assert.match(savedEvent.updatedAt, /^\d{4}-\d{2}-\d{2}T/);

    const repeatedResponse = await fetch(`${baseUrl}/api/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: firstState, expectedVersion: 0, clientId: 'computer-test' }),
    });
    assert.equal(repeatedResponse.status, 200);
    assert.deepEqual(await repeatedResponse.json().then(({ ok, version, unchanged }) => ({ ok, version, unchanged })), {
      ok: true,
      version: 1,
      unchanged: true,
    });

    const foreignState = structuredClone(firstState);
    foreignState.months[0].goal = '手机端修改';
    const conflictResponse = await fetch(`${baseUrl}/api/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: foreignState, expectedVersion: 0, clientId: 'phone-test' }),
    });
    assert.equal(conflictResponse.status, 409);
    assert.deepEqual(await conflictResponse.json(), {
      code: 'STATE_CONFLICT',
      error: '服务器数据版本已变化，请同步后重试',
      currentVersion: 1,
    });

    const recoveredState = structuredClone(firstState);
    recoveredState.months[0].goal = '同一页面继续保存';
    const recoveredResponse = await fetch(`${baseUrl}/api/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: recoveredState, expectedVersion: 0, clientId: 'computer-test' }),
    });
    assert.equal(recoveredResponse.status, 200);
    assert.deepEqual(await recoveredResponse.json().then(({ version, recoveredOwnWrite }) => ({ version, recoveredOwnWrite })), {
      version: 2,
      recoveredOwnWrite: true,
    });
    const recoveredEvent = await events.next();
    assert.equal(recoveredEvent.version, 2);
    assert.equal(recoveredEvent.sourceClientId, 'computer-test');

    const malformedState = structuredClone(validState);
    malformedState.months[0].checks = [];
    const malformedResponse = await fetch(`${baseUrl}/api/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: malformedState, expectedVersion: 2 }),
    });
    assert.equal(malformedResponse.status, 400);
    assert.equal((await malformedResponse.json()).code, 'INVALID_STATE');

    const current = await fetch(`${baseUrl}/api/state`).then((response) => response.json());
    assert.equal(current.version, 2);
    assert.equal(current.state.months[0].goal, '同一页面继续保存');
  } finally {
    eventController.abort();
    child.kill();
    await Promise.race([once(child, 'exit'), new Promise((resolve) => setTimeout(resolve, 2_000))]);
    await rm(dataDir, { recursive: true, force: true });
  }
});
