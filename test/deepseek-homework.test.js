import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DeepSeekHomeworkError,
  callDeepSeekHomeworkReview,
  constrainQuestionAreas,
  createDeepSeekGradingRequest,
  createDeepSeekLocalizationRequest,
  createDeepSeekRequest,
  createDeepSeekVerificationRequest,
  deriveQuestionAnnotationArea,
  deriveQuestionCropArea,
  extractDeepSeekOutput,
  mergeDeepSeekGrading,
  mergeDeepSeekLocalization,
  mergeDeepSeekVerification,
  normalizeDeepSeekRecognition,
  normalizeDeepSeekResult,
} from '../server/deepseek-homework.js';

function sampleResult(overrides = {}) {
  return {
    detectedSubject: '数学',
    subjectConfidence: '高',
    detectedTitle: '口算练习',
    summary: '共识别四题。',
    suggestions: ['订正错题。'],
    questions: [
      {
        order: 1,
        printedNumber: '1',
        questionText: '12 + 8 =',
        studentAnswer: '20',
        verdict: 'correct',
        correctAnswer: '20',
        shortComment: '',
        explanation: '',
        area: { left: 5, top: 8, width: 40, height: 12 },
      },
      {
        order: 2,
        printedNumber: '2',
        questionText: '38 + 27 =',
        studentAnswer: '55',
        verdict: 'wrong',
        correctAnswer: '65',
        shortComment: '个位满十要进一',
        errorReason: '个位相加满十后没有向十位进一。',
        knowledgePoint: '两位数进位加法',
        errorType: '计算或拼写错误',
        solutionSteps: ['先算个位：8 + 7 = 15。', '个位写5，向十位进1。', '十位算3 + 2 + 1 = 6，结果是65。'],
        explanation: '8 加 7 等于 15，向十位进一。',
        area: { left: 6, top: 26, width: 44, height: 13 },
      },
      {
        order: 3,
        printedNumber: '3',
        questionText: '50 - 18 =',
        studentAnswer: '',
        verdict: 'blank',
        correctAnswer: '32',
        shortComment: '本题漏答',
        errorReason: '本题没有填写答案。',
        knowledgePoint: '两位数退位减法',
        errorType: '漏答',
        solutionSteps: ['先算50 - 10 = 40。', '再算40 - 8 = 32。'],
        explanation: '50 减 18 等于 32。',
        area: { left: 5, top: 44, width: 42, height: 12 },
      },
      {
        order: 4,
        printedNumber: '4',
        questionText: '开放题',
        studentAnswer: '略',
        verdict: 'uncertain',
        correctAnswer: '',
        shortComment: '',
        explanation: '',
        area: { left: 4, top: 64, width: 92, height: 18 },
      },
    ],
    ...overrides,
  };
}

function completedPayload(result = sampleResult()) {
  return {
    status: 'completed',
    output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(result) }] }],
  };
}

function sampleRecognition(overrides = {}) {
  return {
    detectedSubject: '数学',
    subjectConfidence: '高',
    detectedTitle: '口算练习',
    questions: sampleResult().questions.map((question) => ({
      order: question.order,
      printedNumber: question.printedNumber,
      questionText: question.questionText,
      studentAnswer: question.studentAnswer,
      gradingContext: '',
      area: question.area,
    })),
    ...overrides,
  };
}

function sampleGrading(overrides = {}) {
  return {
    decisions: sampleResult().questions.map((question) => ({
      order: question.order,
      verdict: question.verdict,
      correctAnswer: question.correctAnswer,
      shortComment: question.shortComment,
      errorReason: question.errorReason || '',
      knowledgePoint: question.knowledgePoint || '',
      errorType: question.errorType || '',
      solutionSteps: question.solutionSteps || [],
      explanation: question.explanation,
    })),
    ...overrides,
  };
}

test('derives image annotations and mistake details from the same wrong questions', () => {
  const raw = sampleResult();
  raw.questions[1].gradingContext = 'A. 55\nB. 65';
  const result = normalizeDeepSeekResult(raw);

  assert.equal(result.detectedSubject, '数学');
  assert.equal(result.recognizedQuestionCount, 4);
  assert.equal(result.uncertainQuestionCount, 1);
  assert.equal(result.score, 33);
  assert.deepEqual(result.mistakes.map((item) => item.correctAnswer), ['65', '32']);
  assert.deepEqual(result.imageAnnotations.map((item) => item.correctAnswer), ['65', '32']);
  assert.deepEqual(result.imageAnnotations.map((item) => item.label), ['错', '漏']);
  assert.deepEqual(result.imageAnnotations.map((item) => item.questionNumber), ['2', '3']);
  assert.equal(result.mistakes[0].question, '2 38 + 27 =\nA. 55\nB. 65');
  assert.equal(result.mistakes[0].errorReason, '个位相加满十后没有向十位进一。');
  assert.equal(result.mistakes[0].knowledgePoint, '两位数进位加法');
  assert.equal(result.mistakes[0].errorType, '计算或拼写错误');
  assert.equal(result.mistakes[1].errorType, '漏答');
  assert.equal(result.mistakes[0].solutionSteps.length, 3);
});

test('prevents a question box from extending into the next vertically stacked question', () => {
  const questions = [
    { order: 1, area: { left: 8, top: 40, width: 80, height: 22 } },
    { order: 2, area: { left: 10, top: 54, width: 76, height: 12 } },
  ];

  const [first] = constrainQuestionAreas(questions);
  assert.deepEqual(first.area, { left: 8, top: 40, width: 80, height: 13.6 });
});

test('expands a mistake crop to the worksheet bounds and the next question boundary', () => {
  const questions = sampleResult().questions;

  assert.deepEqual(deriveQuestionCropArea(questions[1], questions), {
    left: 4,
    top: 18.85,
    width: 92,
    height: 20.55,
  });
});

test('caps an unusually tall annotation before it reaches the next question', () => {
  const questions = [
    { order: 1, gradingContext: 'A. ①④ B. ②④ C. ②③ D. ①③', area: { left: 5, top: 46, width: 85, height: 14 } },
    { order: 2, area: { left: 8, top: 65, width: 80, height: 16 } },
  ];

  assert.deepEqual(deriveQuestionAnnotationArea(questions[0], questions), {
    left: 5,
    top: 38.3,
    width: 85,
    height: 15,
  });
});

test('returns no image annotations when every recognized answer is correct', () => {
  const raw = sampleResult({ questions: [sampleResult().questions[0]] });
  const result = normalizeDeepSeekResult(raw);

  assert.equal(result.score, 100);
  assert.deepEqual(result.mistakes, []);
  assert.deepEqual(result.imageAnnotations, []);
});

test('normalizes out-of-range coordinates without moving a box outside the image', () => {
  const raw = sampleResult();
  raw.questions[1].area = { left: -8, top: 97, width: 120, height: 20 };

  const [annotation] = normalizeDeepSeekResult(raw).imageAnnotations;
  assert.deepEqual(annotation.area, { left: 0, top: 97, width: 100, height: 3 });
});

test('keeps repeated question text when it appears in different image regions', () => {
  const repeated = structuredClone(sampleResult().questions[0]);
  repeated.order = 5;
  repeated.area = { left: 5, top: 48, width: 40, height: 12 };
  const result = normalizeDeepSeekResult(sampleResult({ questions: [...sampleResult().questions, repeated] }));

  assert.equal(result.recognizedQuestionCount, 5);
});

test('normalizes vision recognition without accepting grading fields from the image pass', () => {
  const raw = sampleRecognition();
  raw.questions[0].verdict = 'wrong';

  const result = normalizeDeepSeekRecognition(raw);
  assert.equal(result.questions.length, 4);
  assert.equal(result.questions[0].verdict, undefined);
  assert.equal(result.questions[0].questionText, '12 + 8 =');
});

test('merges textbook grading with the original question coordinates', () => {
  const recognition = normalizeDeepSeekRecognition(sampleRecognition());
  const result = mergeDeepSeekGrading(recognition, sampleGrading());

  assert.equal(result.recognizedQuestionCount, 4);
  assert.deepEqual(result.mistakes.map((item) => item.correctAnswer), ['65', '32']);
  assert.deepEqual(result.imageAnnotations[0].area, { left: 6, top: 26, width: 44, height: 13 });
});

test('falls back to legacy correction text when structured analysis is missing', () => {
  const recognition = normalizeDeepSeekRecognition(sampleRecognition());
  const grading = sampleGrading();
  grading.decisions[1].errorReason = '';
  grading.decisions[1].solutionSteps = [];

  const result = mergeDeepSeekGrading(recognition, grading);

  assert.equal(result.mistakes[0].errorReason, '个位满十要进一');
  assert.deepEqual(result.mistakes[0].solutionSteps, ['8 加 7 等于 15，向十位进一。']);
});

test('provides safe classification defaults when a grading response is unrecognized', () => {
  const recognition = normalizeDeepSeekRecognition(sampleRecognition());
  const grading = sampleGrading();
  grading.decisions[1].knowledgePoint = '';
  grading.decisions[1].errorType = '粗心';

  const result = mergeDeepSeekGrading(recognition, grading);

  assert.equal(result.mistakes[0].knowledgePoint, '待分类');
  assert.equal(result.mistakes[0].errorType, '其他');
  assert.equal(result.mistakes[1].errorType, '漏答');
});

test('removes numbering that the model repeats inside solution steps', () => {
  const recognition = normalizeDeepSeekRecognition(sampleRecognition());
  const grading = sampleGrading();
  grading.decisions[1].solutionSteps = ['1. 先算个位：8 + 7 = 15。', '2、个位写5，向十位进1。'];

  const result = mergeDeepSeekGrading(recognition, grading);

  assert.deepEqual(result.mistakes[0].solutionSteps, ['先算个位：8 + 7 = 15。', '个位写5，向十位进1。']);
});

test('uses the verification box without expanding it into a neighboring question', () => {
  const recognition = normalizeDeepSeekRecognition(sampleRecognition());
  const verification = sampleRecognition();
  verification.questions[1].area = { left: 4, top: 24, width: 80, height: 10 };

  const verified = mergeDeepSeekVerification(recognition, verification);
  const result = mergeDeepSeekGrading(verified, sampleGrading());

  assert.deepEqual(result.imageAnnotations[0].area, { left: 4, top: 24, width: 80, height: 10 });
});

test('rejects verification output when the question numbers shift', () => {
  const recognition = normalizeDeepSeekRecognition(sampleRecognition());
  const verification = sampleRecognition();
  verification.questions[1].printedNumber = '99';

  assert.throws(
    () => mergeDeepSeekVerification(recognition, verification),
    (error) => error.code === 'INVALID_VERIFICATION',
  );
});

test('uses the dedicated verification answer and keeps only line questions uncertain', () => {
  const recognition = normalizeDeepSeekRecognition(sampleRecognition());
  const verification = sampleRecognition();
  verification.questions[0].studentAnswer = '21';
  verification.questions[1].questionText = '想一想，连一连。';
  const verified = mergeDeepSeekVerification(recognition, verification);
  const result = mergeDeepSeekGrading(verified, sampleGrading());

  assert.equal(verified.questions[0].studentAnswer, '21');
  assert.equal(verified.questions[0].visualUncertain, false);
  assert.equal(result.uncertainQuestionCount, 2);
  assert.deepEqual(result.mistakes.map((item) => item.correctAnswer), ['32']);
});

test('rejects missing decisions and contradictory wrong verdicts', () => {
  const recognition = normalizeDeepSeekRecognition(sampleRecognition());
  assert.throws(
    () => mergeDeepSeekGrading(recognition, { decisions: sampleGrading().decisions.slice(0, 3) }),
    (error) => error.code === 'INVALID_GRADING',
  );

  const contradictory = sampleGrading();
  contradictory.decisions[0] = {
    ...contradictory.decisions[0],
    verdict: 'wrong',
    shortComment: '答案错误',
    errorReason: '学生答案与标准答案不一致。',
    solutionSteps: ['重新计算本题。'],
    explanation: '请重新计算。',
  };
  assert.throws(
    () => mergeDeepSeekGrading(recognition, contradictory),
    (error) => error.code === 'INCONSISTENT_GRADING',
  );
});

test('rejects a wrong answer without a correction and explanation', () => {
  const raw = sampleResult();
  raw.questions[1].correctAnswer = '';
  raw.questions[1].explanation = '';

  assert.throws(
    () => normalizeDeepSeekResult(raw),
    (error) => error instanceof DeepSeekHomeworkError && error.code === 'INCOMPLETE_CORRECTION',
  );
});

test('rejects empty and invalid JSON responses', () => {
  assert.throws(
    () => extractDeepSeekOutput({ status: 'completed', output: [] }),
    (error) => error.code === 'EMPTY_RESPONSE',
  );
  assert.throws(
    () => extractDeepSeekOutput({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: '{nope' }] }] }),
    (error) => error.code === 'INVALID_JSON',
  );
});

test('repairs trailing commas in an otherwise valid structured response', () => {
  const payload = completedPayload();
  payload.output[0].content[0].text = `${JSON.stringify(sampleResult()).slice(0, -1)},}`;

  const result = extractDeepSeekOutput(payload);

  assert.equal(result.detectedSubject, '数学');
  assert.equal(result.recognizedQuestionCount, 4);
});

test('extracts the first complete JSON value when the model appends extra output', () => {
  const payload = completedPayload();
  payload.output[0].content[0].text = `${JSON.stringify(sampleResult())}\n额外说明 {"ignored":true}`;

  const result = extractDeepSeekOutput(payload);

  assert.equal(result.detectedSubject, '数学');
  assert.equal(result.recognizedQuestionCount, 4);
});

test('vision request auto-detects subject without asking the image pass to grade answers', () => {
  const request = createDeepSeekRequest({
    imageData: 'data:image/jpeg;base64,AA==',
    term: '二年级上学期',
    title: '第3页',
    subject: '数学',
  });
  const userInput = JSON.stringify(request.input);

  assert.equal(request.model, 'deepseek-v4-flash-vision-exp');
  assert.equal(request.input[0].content[1].detail, 'original');
  assert.equal(request.text.format.strict, true);
  assert.equal(request.text.format.name, 'homework_image_recognition');
  assert.equal(request.reasoning.effort, 'none');
  assert.equal(request.max_output_tokens, 8000);
  assert.equal(userInput.includes('数学'), false);
  assert.equal(request.instructions.includes('不判断答案对错'), true);
});

test('grading request uses the recognized text without resending the image', () => {
  const recognition = normalizeDeepSeekRecognition(sampleRecognition());
  const request = createDeepSeekGradingRequest({ recognition, term: '二年级上学期' });

  assert.equal(request.model, 'deepseek-v4-flash-vision-exp');
  assert.equal(request.reasoning.effort, 'high');
  assert.equal(request.max_output_tokens, 10000);
  assert.equal(request.text.format.name, 'homework_textbook_grading');
  assert.equal(request.text.format.schema.properties.decisions.items.required.includes('knowledgePoint'), true);
  assert.equal(request.text.format.schema.properties.decisions.items.required.includes('errorType'), true);
  assert.equal(request.input.includes('38 + 27 ='), true);
  assert.equal(request.input.includes('data:image'), false);
  assert.equal(request.instructions.includes('studentAnswer 为“①”表示选择 A'), true);
});

test('Chinese grading uses low reasoning and deduplicates shared reading context', () => {
  const rawRecognition = sampleRecognition();
  rawRecognition.detectedSubject = '语文';
  rawRecognition.questions[0].gradingContext = '小明先读短文，再回答问题。';
  rawRecognition.questions[1].gradingContext = '小明先读短文，再回答问题。';
  const recognition = normalizeDeepSeekRecognition(rawRecognition);
  const request = createDeepSeekGradingRequest({ recognition, term: '二年级上学期' });
  const gradingInput = JSON.parse(request.input);

  assert.equal(request.reasoning.effort, 'low');
  assert.equal(request.max_output_tokens, 8000);
  assert.deepEqual(gradingInput.sharedContexts, [{ id: 'context-1', text: '小明先读短文，再回答问题。' }]);
  assert.deepEqual(gradingInput.questions.slice(0, 2).map((question) => question.gradingContextRef), ['context-1', 'context-1']);
  assert.equal(request.input.match(/小明先读短文，再回答问题。/g)?.length, 1);
});

test('verification request resends the image and asks only to verify the recognized answers', () => {
  const recognition = normalizeDeepSeekRecognition(sampleRecognition());
  const request = createDeepSeekVerificationRequest({
    recognition,
    imageData: 'data:image/jpeg;base64,AA==',
  });

  assert.equal(request.reasoning.effort, 'none');
  assert.equal(request.max_output_tokens, 8000);
  assert.equal(request.text.format.name, 'verified_homework_recognition');
  assert.equal(request.input[0].content[1].image_url, 'data:image/jpeg;base64,AA==');
  assert.equal(request.instructions.includes('不判断答案对错'), true);
  assert.equal(request.instructions.includes('沿可见线条追踪'), true);
  assert.equal(request.instructions.includes('在文中画出/圈出'), true);
});

test('localization request sends only wrong questions with a strict 0-1000 box schema', () => {
  const recognition = normalizeDeepSeekRecognition(sampleRecognition());
  const request = createDeepSeekLocalizationRequest({
    recognition,
    mistakeOrders: [2, 3],
    imageData: 'data:image/jpeg;base64,GRID',
  });
  const targets = JSON.parse(request.input[0].content[0].text).targets;

  assert.equal(request.text.format.name, 'homework_mistake_localization');
  assert.equal(request.text.format.strict, true);
  assert.deepEqual(targets.map((target) => target.order), [2, 3]);
  assert.equal(targets[0].previousQuestion.includes('12 + 8'), true);
  assert.equal(targets[0].nextQuestion.includes('50 - 18'), true);
  assert.equal(request.input[0].content[1].image_url, 'data:image/jpeg;base64,GRID');
  assert.equal(request.instructions.includes('0 到 1000'), true);
  assert.equal(request.instructions.includes('蓝色坐标网格'), true);
});

test('replaces approximate mistake positions with grid-localized coordinates', () => {
  const recognition = normalizeDeepSeekRecognition(sampleRecognition());
  const result = mergeDeepSeekGrading(recognition, sampleGrading());
  const localized = mergeDeepSeekLocalization(result, {
    locations: [
      { order: 2, box: { x1: 85, y1: 383, x2: 804, y2: 525 } },
      { order: 3, box: { x1: 90, y1: 600, x2: 850, y2: 720 } },
    ],
  });

  assert.equal(localized.annotationQuality, 'precise');
  assert.deepEqual(localized.imageAnnotations[0].area, { left: 7.5, top: 35.3, width: 73.9, height: 17.7 });
  assert.deepEqual(localized.mistakes[0].cropArea, { left: 6.5, top: 34.3, width: 75.9, height: 19.7 });
});

test('rejects missing and out-of-range localization boxes', () => {
  const recognition = normalizeDeepSeekRecognition(sampleRecognition());
  const result = mergeDeepSeekGrading(recognition, sampleGrading());

  assert.throws(
    () => mergeDeepSeekLocalization(result, { locations: [{ order: 2, box: { x1: 80, y1: 300, x2: 700, y2: 500 } }] }),
    (error) => error.code === 'INVALID_LOCALIZATION',
  );
  assert.throws(
    () => mergeDeepSeekLocalization(result, {
      locations: [
        { order: 2, box: { x1: 80, y1: 300, x2: 1001, y2: 500 } },
        { order: 3, box: { x1: 80, y1: 500, x2: 700, y2: 700 } },
      ],
    }),
    (error) => error.code === 'INVALID_LOCALIZATION',
  );
});

test('runs the dedicated localization stage when a grid image is supplied', async () => {
  let calls = 0;
  const fetchImpl = async (_url, options) => {
    calls += 1;
    const request = JSON.parse(options.body);
    const name = request.text.format.name;
    const result = name === 'homework_textbook_grading'
      ? sampleGrading()
      : name === 'homework_mistake_localization'
        ? {
            locations: [
              { order: 2, box: { x1: 85, y1: 383, x2: 804, y2: 525 } },
              { order: 3, box: { x1: 90, y1: 600, x2: 850, y2: 720 } },
            ],
          }
        : sampleRecognition();
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify(completedPayload(result)),
    };
  };

  const result = await callDeepSeekHomeworkReview({
    apiKey: 'test-key',
    imageData: 'data:image/jpeg;base64,AA==',
    localizationImageData: 'data:image/jpeg;base64,GRID',
    fetchImpl,
    sleep: async () => {},
  });

  assert.equal(calls, 4);
  assert.equal(result.annotationQuality, 'precise');
  assert.deepEqual(result.attempts.map((attempt) => attempt.stage), ['vision', 'verification', 'grading', 'localization']);
});

test('retries a 429 response and keeps the failed attempt in metadata', async () => {
  let calls = 0;
  const fetchImpl = async (_url, options) => {
    calls += 1;
    assert.equal(options.headers.Authorization, 'Bearer test-key');
    if (calls === 1) {
      return {
        ok: false,
        status: 429,
        text: async () => JSON.stringify({ error: { message: 'rate limited' } }),
      };
    }
    const request = JSON.parse(options.body);
    const result = request.text.format.name === 'homework_textbook_grading'
      ? sampleGrading()
      : sampleRecognition();
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify(completedPayload(result)),
    };
  };

  const result = await callDeepSeekHomeworkReview({
    apiKey: 'test-key',
    imageData: 'data:image/jpeg;base64,AA==',
    fetchImpl,
    sleep: async () => {},
  });

  assert.equal(calls, 4);
  assert.deepEqual(result.attempts.map((item) => item.status), ['failed', 'success', 'success', 'success']);
  assert.deepEqual(result.attempts.map((item) => item.stage), ['vision', 'vision', 'verification', 'grading']);
  assert.equal(result.attempts[0].httpStatus, 429);
});

test('times out while reading an unfinished response body and does not retry', async () => {
  let calls = 0;
  const fetchImpl = async (_url, options) => {
    calls += 1;
    return {
      ok: true,
      status: 200,
      text: () => new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        }, { once: true });
      }),
    };
  };

  await assert.rejects(
    callDeepSeekHomeworkReview({
      apiKey: 'test-key',
      imageData: 'data:image/jpeg;base64,AA==',
      fetchImpl,
      sleep: async () => {},
      timeoutMs: 10,
    }),
    (error) => error.code === 'TIMEOUT' && error.stage === 'vision',
  );
  assert.equal(calls, 1);
});

test('cancels an in-flight review without retrying', async () => {
  let calls = 0;
  const controller = new AbortController();
  const fetchImpl = async (_url, options) => {
    calls += 1;
    return new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      }, { once: true });
    });
  };

  const reviewPromise = callDeepSeekHomeworkReview({
    apiKey: 'test-key',
    imageData: 'data:image/jpeg;base64,AA==',
    fetchImpl,
    sleep: async () => {},
    signal: controller.signal,
  });
  controller.abort();

  await assert.rejects(reviewPromise, (error) => error.code === 'CANCELLED');
  assert.equal(calls, 1);
});
