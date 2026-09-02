import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer as createHttpServer } from 'node:http';
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

    const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const imageUploadResponse = await fetch(`${baseUrl}/api/mistake-images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData: `data:image/jpeg;base64,${jpegBytes.toString('base64')}` }),
    });
    assert.equal(imageUploadResponse.status, 201);
    const imageUpload = await imageUploadResponse.json();
    assert.match(imageUpload.url, /^\/api\/mistake-images\/[0-9]+-[0-9a-f-]+\.jpg$/);
    const storedImageResponse = await fetch(`${baseUrl}${imageUpload.url}`);
    assert.equal(storedImageResponse.status, 200);
    assert.equal(storedImageResponse.headers.get('content-type'), 'image/jpeg');
    assert.deepEqual(Buffer.from(await storedImageResponse.arrayBuffer()), jpegBytes);

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

test('homework grading runs as an idempotent background job with precise localization', { timeout: 20_000 }, async () => {
  const apiPort = await availablePort();
  const deepSeekPort = await availablePort();
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'homework-grading-test-'));
  const baseUrl = `http://127.0.0.1:${apiPort}`;
  const modelUrl = `http://127.0.0.1:${deepSeekPort}`;
  const modelCalls = [];
  const modelRequests = [];
  const recognition = {
    detectedSubject: '数学',
    subjectConfidence: '高',
    detectedTitle: '加法练习',
    questions: [{
      order: 1,
      printedNumber: '2',
      questionText: '3 + 4 =',
      studentAnswer: '8',
      gradingContext: '',
      area: { left: 8, top: 30, width: 72, height: 12 },
    }],
  };
  const grading = {
    decisions: [{
      order: 1,
      verdict: 'wrong',
      correctAnswer: '7',
      shortComment: '请重新计算',
      errorReason: '把 3 加 4 错算成了 8。',
      knowledgePoint: '10以内加法',
      errorType: '计算或拼写错误',
      solutionSteps: ['从 3 开始继续数 4 个数。', '4、5、6、7，所以结果是 7。'],
      explanation: '加法表示把两部分合在一起。',
    }],
  };
  const localization = {
    locations: [{ order: 1, box: { x1: 70, y1: 260, x2: 820, y2: 420 } }],
  };
  const fakeDeepSeek = createHttpServer((req, res) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      const request = JSON.parse(body);
      modelRequests.push(request);
      const inputText = request.input?.[0]?.content?.find(({ type }) => type === 'input_text')?.text;
      const input = request.text.format.name || !inputText ? {} : JSON.parse(inputText);
      const name = request.text.format.name
        || (Array.isArray(input.targets)
          ? 'homework_mistake_localization'
          : 'unknown');
      modelCalls.push(name);
      const result = name === 'homework_text_grading'
        ? grading
        : name === 'homework_mistake_localization'
          ? localization
          : recognition;
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'completed',
          output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(result) }] }],
        }));
      }, 40);
    });
  });
  fakeDeepSeek.listen(deepSeekPort, '127.0.0.1');
  await once(fakeDeepSeek, 'listening');
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(apiPort),
      DATA_DIR: dataDir,
      DEEPSEEK_API_KEY: 'test-key',
      DEEPSEEK_API_BASE_URL: modelUrl,
    },
    stdio: 'ignore',
    windowsHide: true,
  });

  const requestId = 'grading-idempotency-test';
  const requestBody = {
    requestId,
    term: '二年级上学期',
    imageData: 'data:image/jpeg;base64,/9j/2Q==',
    detailImages: [{
      imageData: 'data:image/jpeg;base64,/9j/2Q==',
      area: { left: 0, top: 0, width: 100, height: 46 },
    }],
    localizationImageData: 'data:image/jpeg;base64,/9j/2Q==',
  };

  try {
    await waitForServer(baseUrl);
    const invalidDetailResponse = await fetch(`${baseUrl}/api/grade-homework`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...requestBody,
        requestId: 'invalid-detail-image-test',
        detailImages: [{
          imageData: 'data:image/jpeg;base64,/9j/2Q==',
          area: { left: 0, top: 0, width: 0, height: 46 },
        }],
      }),
    });
    assert.equal(invalidDetailResponse.status, 400);
    assert.equal((await invalidDetailResponse.json()).code, 'INVALID_DETAIL_IMAGES');
    assert.equal(modelCalls.length, 0);

    const startResponse = await fetch(`${baseUrl}/api/grade-homework`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    assert.equal(startResponse.status, 202);
    let job = await startResponse.json();
    assert.equal(job.requestId, requestId);
    assert.match(job.status, /^(?:queued|running)$/);

    const deadline = Date.now() + 5_000;
    while (job.status !== 'completed' && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 30));
      const response = await fetch(`${baseUrl}/api/grade-homework/${requestId}`);
      assert.equal(response.status, 200);
      job = await response.json();
      if (job.status === 'failed') assert.fail(job.error);
    }
    assert.equal(job.status, 'completed');
    assert.equal(job.result.annotationQuality, 'precise');
    assert.deepEqual(job.result.imageAnnotations[0].area, { left: 6.5, top: 25.5, width: 76, height: 17 });
    assert.deepEqual(modelCalls, [
      'homework_image_recognition',
      'homework_text_grading',
      'homework_mistake_localization',
    ]);
    assert.equal(modelRequests[0].input[0].content[3].image_url, requestBody.detailImages[0].imageData);

    const repeatedResponse = await fetch(`${baseUrl}/api/grade-homework`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    assert.equal(repeatedResponse.status, 200);
    assert.equal((await repeatedResponse.json()).status, 'completed');
    assert.equal(modelCalls.length, 3);

    const conflictResponse = await fetch(`${baseUrl}/api/grade-homework`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...requestBody, imageData: 'data:image/jpeg;base64,/9j/4A==' }),
    });
    assert.equal(conflictResponse.status, 409);
    assert.equal((await conflictResponse.json()).code, 'REQUEST_ID_CONFLICT');

    const cancelRequestId = 'grading-cancellation-test';
    const cancelStart = await fetch(`${baseUrl}/api/grade-homework`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...requestBody, requestId: cancelRequestId }),
    });
    assert.equal(cancelStart.status, 202);
    const cancelResponse = await fetch(`${baseUrl}/api/grade-homework/${cancelRequestId}`, { method: 'DELETE' });
    assert.equal(cancelResponse.status, 200);
    let cancelledJob = await cancelResponse.json();
    const cancelDeadline = Date.now() + 2_000;
    while (cancelledJob.status !== 'cancelled' && Date.now() < cancelDeadline) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      cancelledJob = await fetch(`${baseUrl}/api/grade-homework/${cancelRequestId}`).then((response) => response.json());
    }
    assert.equal(cancelledJob.status, 'cancelled');
    assert.equal(cancelledJob.code, 'CANCELLED');
  } finally {
    child.kill();
    await Promise.race([once(child, 'exit'), new Promise((resolve) => setTimeout(resolve, 2_000))]);
    await new Promise((resolve) => fakeDeepSeek.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  }
});
