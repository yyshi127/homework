import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DeepSeekHomeworkError,
  callDeepSeekHomeworkReview,
  constrainQuestionAreas,
  createDeepSeekGradingRequest,
  createDeepSeekLocalizationRequest,
  createDeepSeekRequest,
  deriveQuestionAnnotationArea,
  deriveQuestionCropArea,
  extractDeepSeekOutput,
  mergeDeepSeekGrading,
  mergeDeepSeekLocalization,
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

function deepSeekRequestName(request) {
  if (request?.text?.format?.name) return request.text.format.name;
  const inputText = request?.input?.[0]?.content?.find(({ type }) => type === 'input_text')?.text;
  if (!inputText) return '';
  const input = JSON.parse(inputText);
  if (Array.isArray(input.targets)) return 'homework_mistake_localization';
  return '';
}

function sampleResponseForRequest(request) {
  const name = deepSeekRequestName(request);
  if (name === 'homework_text_grading') return sampleGrading();
  return sampleRecognition();
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

test('infers mathematics from recognized exercises when the model leaves the subject undecided', () => {
  const result = normalizeDeepSeekResult(sampleResult({
    detectedSubject: '无法判断',
    subjectConfidence: '低',
  }));

  assert.equal(result.detectedSubject, '数学');
  assert.equal(result.subjectConfidence, '中');
});

test('infers Chinese from language exercise content when the model leaves the subject undecided', () => {
  const result = normalizeDeepSeekResult(sampleResult({
    detectedSubject: '无法判断',
    subjectConfidence: '低',
    detectedTitle: '词语搭配练习',
    questions: [{
      order: 1,
      printedNumber: '二.1',
      questionText: '根据词义填空（填序号）',
      studentAnswer: '②',
      gradingContext: '近义词、反义词和词语搭配',
      verdict: 'correct',
      correctAnswer: '②',
      shortComment: '',
      explanation: '',
      area: { left: 5, top: 20, width: 80, height: 12 },
    }],
  }));

  assert.equal(result.detectedSubject, '语文');
  assert.equal(result.subjectConfidence, '中');
});

test('infers English from a readable English exercise when the model leaves the subject undecided', () => {
  const result = normalizeDeepSeekResult(sampleResult({
    detectedSubject: '无法判断',
    subjectConfidence: '低',
    detectedTitle: 'Choose the correct word',
    questions: [{
      order: 1,
      printedNumber: '1',
      questionText: 'This is an apple.',
      studentAnswer: 'apple',
      gradingContext: '',
      verdict: 'correct',
      correctAnswer: 'apple',
      shortComment: '',
      explanation: '',
      area: { left: 5, top: 20, width: 80, height: 12 },
    }],
  }));

  assert.equal(result.detectedSubject, '英语');
  assert.equal(result.subjectConfidence, '中');
});

test('keeps the subject undecided when recognized content has no reliable subject evidence', () => {
  const result = normalizeDeepSeekResult(sampleResult({
    detectedSubject: '无法判断',
    subjectConfidence: '低',
    detectedTitle: '练习',
    questions: [{
      order: 1,
      printedNumber: '1',
      questionText: '请完成下面各题',
      studentAnswer: '',
      gradingContext: '',
      verdict: 'uncertain',
      correctAnswer: '',
      shortComment: '',
      explanation: '',
      area: { left: 5, top: 20, width: 80, height: 12 },
    }],
  }));

  assert.equal(result.detectedSubject, '无法判断');
  assert.equal(result.subjectConfidence, '低');
});

test('keeps only the final answer after the model corrects itself', () => {
  const result = normalizeDeepSeekResult(sampleResult({
    questions: [{
      order: 1,
      printedNumber: '2',
      questionText: '10元钱正好可以买下面的（ ）。',
      studentAnswer: '①',
      gradingContext: 'A. ①④ B. ②④ C. ②③ D. ①③',
      verdict: 'wrong',
      correctAnswer: 'B. ②④（复核后不对；所以正确答案应是D. ①③）',
      shortComment: '应选择D',
      errorReason: '选择的两件物品总价不是10元。',
      knowledgePoint: '元角换算',
      errorType: '计算或拼写错误',
      solutionSteps: ['统一换算成角。', '逐项相加，①③正好是100角。'],
      explanation: '先统一单位，再比较各组选项。',
      area: { left: 5, top: 30, width: 80, height: 16 },
    }],
  }));

  assert.equal(result.mistakes[0].correctAnswer, 'D. ①③');
  assert.equal(result.mistakes[0].answer, 'A. ①④');
  assert.equal(result.mistakes[0].shortComment, '应选 D，不是 A');
  assert.equal(result.mistakes[0].errorReason, '学生选择了 A. ①④，正确答案是 D. ①③。需要按题目条件比较完整选项。');
  assert.equal(result.mistakes[0].question.includes('（①）'), false);
  assert.equal(result.summary, '共批改 1 个作答点，发现 1 道错题。');
});

test('maps option letters when the model writes the answer content before 选项D', () => {
  const result = normalizeDeepSeekResult(sampleResult({ questions: [
    {
      order: 1,
      printedNumber: '2',
      questionText: '10元钱正好可以买下面的（①）。选项：①橡皮9元2角，②本子2元5角，③羽毛球8角，④水壶5元。A.①④ B.②④ C.②③ D.①③',
      studentAnswer: '①',
      gradingContext: '人民币单位换算（1元=10角）及组合购物。',
      verdict: 'wrong',
      correctAnswer: '①③（或选项D）',
      shortComment: '只选了一个物品。',
      errorReason: '只关注了单个物品。',
      knowledgePoint: '元角换算',
      errorType: '审题错误',
      solutionSteps: ['统一换算成角。', '逐项计算组合价格。'],
      explanation: '①和③正好合计10元。',
      area: { left: 5, top: 30, width: 80, height: 16 },
    },
  ] }));

  assert.equal(result.mistakes[0].answer, 'A. ①④');
  assert.equal(result.mistakes[0].correctAnswer, 'D. ①③');
  assert.equal(result.mistakes[0].shortComment, '应选 D，不是 A');
  assert.equal(result.mistakes[0].question.includes('（①）'), false);
});

test('uses the complete option list when another field contains only B through D', () => {
  const result = normalizeDeepSeekResult(sampleResult({ questions: [
    {
      order: 1,
      printedNumber: '2',
      questionText: '10元钱正好可以买下面的（①）。①9元2角 ②2元5角 ③8角 ④5元 A.①④ B.②④ C.②③ D.①③',
      studentAnswer: '①',
      gradingContext: '价格选项为A.①④ B.②④ C.②③ D.①③，要求组合正好为10元。',
      verdict: 'wrong',
      correctAnswer: 'D（①③）',
      shortComment: '单选①不对。',
      errorReason: '只挑选了物品①。',
      knowledgePoint: '元角换算',
      errorType: '审题错误',
      solutionSteps: ['统一单位。', '计算各组合。'],
      explanation: '①和③合计10元。',
      area: { left: 5, top: 30, width: 80, height: 16 },
    },
  ] }));

  assert.equal(result.mistakes[0].answer, 'A. ①④');
  assert.equal(result.mistakes[0].correctAnswer, 'D. ①③');
  assert.equal(result.mistakes[0].shortComment, '应选 D，不是 A');
  assert.equal(result.mistakes[0].errorReason, '学生选择了 A. ①④，正确答案是 D. ①③。需要按题目条件比较完整选项。');
});

test('removes a false choice error when the selected option matches the correct answer', () => {
  const raw = sampleResult({ questions: [
    {
      order: 1,
      printedNumber: '1',
      questionText: '应选择（ ）。',
      studentAnswer: '①',
      gradingContext: 'A. 苹果 B. 香蕉 C. 梨 D. 桃',
      verdict: 'wrong',
      correctAnswer: 'A. 苹果',
      shortComment: '答案不完整',
      errorReason: '只写了序号。',
      knowledgePoint: '选择题作答',
      errorType: '表达不完整',
      solutionSteps: ['比较选项。', '选择A。'],
      explanation: '应选择A。',
      area: { left: 5, top: 10, width: 80, height: 12 },
    },
  ] });

  const result = normalizeDeepSeekResult(raw);
  assert.equal(result.score, 100);
  assert.deepEqual(result.mistakes, []);
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

test('splits a grouped multi-question word problem by its written equations', () => {
  const result = normalizeDeepSeekRecognition({
    detectedSubject: '数学',
    subjectConfidence: '高',
    detectedTitle: '应用题',
    questions: [{
      order: 1,
      printedNumber: '3',
      questionText: '玻璃瓶比塑料瓶少7个，玻璃瓶有多少个？一共分拣多少个瓶子？',
      studentAnswer: '46-7=39\n46+39=85',
      gradingContext: '塑料瓶46个。',
      area: { left: 6, top: 50, width: 88, height: 20 },
    }],
  });

  assert.equal(result.questions.length, 2);
  assert.deepEqual(result.questions.map((question) => question.printedNumber), ['3(1)', '3(2)']);
  assert.deepEqual(result.questions.map((question) => question.studentAnswer), ['46-7=39', '46+39=85']);
  assert.deepEqual(result.questions.map((question) => question.area.top), [50, 60]);
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

test('rejects missing decisions and contradictory wrong verdicts', () => {
  const recognition = normalizeDeepSeekRecognition(sampleRecognition());
  assert.throws(
    () => mergeDeepSeekGrading(recognition, { decisions: sampleGrading().decisions.slice(0, 3) }),
    (error) => error.code === 'INVALID_GRADING',
  );

  const nonArithmeticRecognition = normalizeDeepSeekRecognition(sampleRecognition());
  nonArithmeticRecognition.questions[0].questionText = '请写出数字二十';
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
    () => mergeDeepSeekGrading(nonArithmeticRecognition, contradictory),
    (error) => error.code === 'INCONSISTENT_GRADING',
  );
});

test('overrides a missed obvious arithmetic error such as 98 - 9 = 9', () => {
  const recognition = normalizeDeepSeekRecognition({
    detectedSubject: '数学',
    subjectConfidence: '高',
    detectedTitle: '口算练习',
    questions: [{
      order: 1,
      printedNumber: '1',
      questionText: '98 - 9 =',
      studentAnswer: '9',
      gradingContext: '',
      area: { left: 8, top: 20, width: 45, height: 8 },
    }],
  });
  const result = mergeDeepSeekGrading(recognition, {
    decisions: [{
      order: 1,
      verdict: 'correct',
      correctAnswer: '9',
      shortComment: '',
      errorReason: '',
      knowledgePoint: '',
      errorType: '',
      solutionSteps: [],
      explanation: '',
    }],
  });

  assert.equal(result.mistakes.length, 1);
  assert.equal(result.mistakes[0].answer, '9');
  assert.equal(result.mistakes[0].correctAnswer, '89');
  assert.equal(result.mistakes[0].errorType, '计算或拼写错误');
  assert.match(result.mistakes[0].shortComment, /98 - 9 = 89/);
});

test('checks a complete arithmetic equation written as the answer to a word problem', () => {
  const recognition = normalizeDeepSeekRecognition({
    detectedSubject: '数学',
    subjectConfidence: '高',
    detectedTitle: '应用题',
    questions: [{
      order: 1,
      printedNumber: '2',
      questionText: '有98本书，借走9本，还剩多少本？',
      studentAnswer: '98-9=9（本）',
      gradingContext: '',
      area: { left: 8, top: 20, width: 70, height: 12 },
    }],
  });
  const result = mergeDeepSeekGrading(recognition, {
    decisions: [{
      order: 1,
      verdict: 'correct',
      correctAnswer: '9本',
      shortComment: '',
      errorReason: '',
      knowledgePoint: '',
      errorType: '',
      solutionSteps: [],
      explanation: '',
    }],
  });

  assert.equal(result.mistakes.length, 1);
  assert.equal(result.mistakes[0].correctAnswer, '89');
  assert.match(result.mistakes[0].errorReason, /计算成了 9/);
});

test('removes a false AI error when deterministic arithmetic is correct', () => {
  const recognition = normalizeDeepSeekRecognition({
    detectedSubject: '数学',
    subjectConfidence: '高',
    detectedTitle: '口算练习',
    questions: [{
      order: 1,
      printedNumber: '1',
      questionText: '12 + 8 =',
      studentAnswer: '20',
      gradingContext: '',
      area: { left: 8, top: 20, width: 45, height: 8 },
    }],
  });
  const result = mergeDeepSeekGrading(recognition, {
    decisions: [{
      order: 1,
      verdict: 'wrong',
      correctAnswer: '21',
      shortComment: '请重新计算',
      errorReason: '模型误判。',
      knowledgePoint: '20以内加法',
      errorType: '计算或拼写错误',
      solutionSteps: ['重新计算。'],
      explanation: '重新计算。',
    }],
  });

  assert.equal(result.mistakes.length, 0);
  assert.equal(result.score, 100);
});

test('rejects a wrong answer without a correction and explanation', () => {
  const raw = sampleResult();
  raw.questions[1].questionText = '根据短文回答问题';
  raw.questions[1].studentAnswer = '不完整回答';
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
    detailImages: [{
      imageData: 'data:image/jpeg;base64,DETAIL',
      area: { left: 0, top: 25, width: 100, height: 46 },
    }],
    term: '二年级上学期',
    title: '第3页',
    subject: '数学',
  });
  const userInput = JSON.stringify(request.input);

  assert.equal(request.model, 'deepseek-v4-flash-vision-exp');
  assert.equal(request.input[0].content[1].detail, 'original');
  assert.equal(request.input[0].content[2].text.includes('Y=25%-71%'), true);
  assert.equal(request.input[0].content[3].image_url, 'data:image/jpeg;base64,DETAIL');
  assert.equal(request.text.format.strict, true);
  assert.equal(request.text.format.name, 'homework_image_recognition');
  assert.equal(request.reasoning.effort, 'none');
  assert.equal(request.max_output_tokens, 8000);
  assert.equal(userInput.includes('数学'), false);
  assert.equal(request.instructions.includes('不判断答案对错'), true);
  assert.equal(request.instructions.includes('面积最大的作业纸'), true);
});

test('grading request judges recognized text once and deduplicates shared context', () => {
  const rawRecognition = sampleRecognition();
  rawRecognition.detectedSubject = '语文';
  rawRecognition.questions[0].gradingContext = '小明先读短文，再回答问题。';
  rawRecognition.questions[1].gradingContext = '小明先读短文，再回答问题。';
  const recognition = normalizeDeepSeekRecognition(rawRecognition);
  const request = createDeepSeekGradingRequest({
    recognition,
    term: '二年级上学期',
  });
  const gradingInput = JSON.parse(request.input);

  assert.equal(request.reasoning.effort, 'high');
  assert.equal(request.max_output_tokens, 12000);
  assert.equal(request.text.format.name, 'homework_text_grading');
  assert.equal(request.text.format.strict, true);
  assert.deepEqual(gradingInput.sharedContexts, [{ id: 'context-1', text: '小明先读短文，再回答问题。' }]);
  assert.deepEqual(gradingInput.questions.slice(0, 2).map((question) => question.gradingContextRef), ['context-1', 'context-1']);
  assert.equal(request.input.match(/小明先读短文，再回答问题。/g)?.length, 1);
  assert.equal(gradingInput.questions.every((question) => question.studentAnswer !== undefined), true);
  assert.equal(request.input.includes('data:image/'), false);
  assert.equal(request.instructions.includes('绝不能改写 studentAnswer'), true);
});

test('localization request sends only wrong questions using compact JSON output', () => {
  const recognition = normalizeDeepSeekRecognition(sampleRecognition());
  const request = createDeepSeekLocalizationRequest({
    recognition,
    mistakeOrders: [2, 3],
    imageData: 'data:image/jpeg;base64,GRID',
  });
  const targets = JSON.parse(request.input[0].content[0].text).targets;

  assert.deepEqual(request.text.format, { type: 'json_object' });
  assert.deepEqual(targets.map((target) => target.order), [2, 3]);
  assert.equal(targets[0].previousQuestion.includes('12 + 8'), true);
  assert.equal(targets[0].nextQuestion.includes('50 - 18'), true);
  assert.equal(targets[0].studentAnswer, '55');
  assert.equal(request.input[0].content[1].image_url, 'data:image/jpeg;base64,GRID');
  assert.equal(request.instructions.includes('0 到 1000'), true);
  assert.equal(request.instructions.includes('蓝色坐标网格'), true);
  assert.equal(request.instructions.includes('不要输出格式说明'), true);
});

test('combines recognition and grid localization before the next question boundary', () => {
  const recognition = normalizeDeepSeekRecognition(sampleRecognition());
  const result = mergeDeepSeekGrading(recognition, sampleGrading());
  const localized = mergeDeepSeekLocalization(result, {
    locations: [
      { order: 2, box: { x1: 85, y1: 383, x2: 804, y2: 525 } },
      { order: 3, box: { x1: 90, y1: 600, x2: 850, y2: 720 } },
    ],
  });

  assert.equal(localized.annotationQuality, 'precise');
  assert.deepEqual(localized.imageAnnotations[0].area, { left: 6, top: 26, width: 74.9, height: 17.6 });
  assert.deepEqual(localized.mistakes[0].cropArea, { left: 5, top: 25, width: 76.9, height: 19.6 });
});

test('keeps a localized question inside its detected column', () => {
  const recognition = normalizeDeepSeekRecognition({
    detectedSubject: '语文',
    subjectConfidence: '高',
    detectedTitle: '词语连线',
    questions: [
      { order: 1, printedNumber: '一(1)', questionText: '左侧连线题', studentAnswer: '甲—乙', gradingContext: '甲；乙；丙；丁', area: { left: 5, top: 18, width: 45, height: 12 } },
      { order: 2, printedNumber: '一(2)', questionText: '右侧连线题', studentAnswer: '丙—丁', gradingContext: '甲；乙；丙；丁', area: { left: 50, top: 24, width: 45, height: 12 } },
      { order: 3, printedNumber: '二.1', questionText: '下一道填空题', studentAnswer: '答案', gradingContext: '', area: { left: 5, top: 34, width: 70, height: 5 } },
    ],
  });
  const result = mergeDeepSeekGrading(recognition, {
    decisions: [
      { order: 1, verdict: 'wrong', correctAnswer: '甲—丁', shortComment: '连线错误', errorReason: '词语搭配错误。', knowledgePoint: '词语搭配', errorType: '知识点错误', solutionSteps: ['先理解左侧词语。', '再连接正确搭配。'], explanation: '根据词义完成搭配。' },
      { order: 2, verdict: 'correct', correctAnswer: '丙—丁', shortComment: '', errorReason: '', knowledgePoint: '', errorType: '', solutionSteps: [], explanation: '' },
      { order: 3, verdict: 'correct', correctAnswer: '答案', shortComment: '', errorReason: '', knowledgePoint: '', errorType: '', solutionSteps: [], explanation: '' },
    ],
  });
  const localized = mergeDeepSeekLocalization(result, {
    locations: [{ order: 1, box: { x1: 109, y1: 125, x2: 744, y2: 181 } }],
  });

  assert.deepEqual(localized.imageAnnotations[0].area, { left: 5, top: 12, width: 44.8, height: 18 });
  assert.ok(localized.imageAnnotations[0].area.left + localized.imageAnnotations[0].area.width < 50);
});

test('clips a localized mistake box before the next question begins', () => {
  const recognition = normalizeDeepSeekRecognition(sampleRecognition());
  const result = mergeDeepSeekGrading(recognition, sampleGrading());
  const localized = mergeDeepSeekLocalization(result, {
    locations: [
      { order: 2, box: { x1: 85, y1: 383, x2: 804, y2: 650 } },
      { order: 3, box: { x1: 90, y1: 400, x2: 850, y2: 520 } },
    ],
  });

  const current = localized.questions.find(({ order }) => order === 2).area;
  const next = localized.questions.find(({ order }) => order === 3).area;
  assert.ok(current.top + current.height <= next.top - 0.4);
  assert.deepEqual(localized.imageAnnotations.find(({ order }) => order === 2).area, current);
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
    const name = deepSeekRequestName(request);
    const result = name === 'homework_mistake_localization'
        ? {
            locations: [
              { order: 2, box: { x1: 85, y1: 383, x2: 804, y2: 525 } },
              { order: 3, box: { x1: 90, y1: 600, x2: 850, y2: 720 } },
            ],
          }
        : sampleResponseForRequest(request);
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

  assert.equal(calls, 3);
  assert.equal(result.annotationQuality, 'precise');
  assert.deepEqual(result.attempts.map((attempt) => attempt.stage), ['vision', 'grading', 'localization']);
});

test('retries an invalid localization result before using approximate boxes', async () => {
  let localizationCalls = 0;
  const fetchImpl = async (_url, options) => {
    const request = JSON.parse(options.body);
    const name = deepSeekRequestName(request);
    let result = sampleResponseForRequest(request);
    if (name === 'homework_mistake_localization') {
      localizationCalls += 1;
      result = localizationCalls === 1
        ? { locations: [{ order: 2, box: { x1: 85, y1: 383, x2: 804, y2: 525 } }] }
        : {
            locations: [
              { order: 2, box: { x1: 85, y1: 383, x2: 804, y2: 525 } },
              { order: 3, box: { x1: 90, y1: 600, x2: 850, y2: 720 } },
            ],
          };
    }
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

  assert.equal(result.annotationQuality, 'precise');
  assert.equal(localizationCalls, 2);
  assert.deepEqual(result.attempts.map(({ stage, status }) => `${stage}:${status}`), [
    'vision:success',
    'grading:success',
    'localization:failed',
    'localization:success',
  ]);
});

test('retries when the model returns no questions', async () => {
  let calls = 0;
  let visionCalls = 0;
  const fetchImpl = async (_url, options) => {
    calls += 1;
    const request = JSON.parse(options.body);
    const name = deepSeekRequestName(request);
    if (name === 'homework_image_recognition') visionCalls += 1;
    const result = name === 'homework_image_recognition'
      ? (visionCalls === 1 ? sampleRecognition({ questions: [] }) : sampleRecognition())
      : sampleResponseForRequest(request);
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

  assert.equal(calls, 3);
  assert.equal(result.recognizedQuestionCount, 4);
  assert.deepEqual(result.attempts.map(({ stage, status, code }) => [stage, status, code || '']), [
    ['vision', 'failed', 'NO_QUESTIONS'],
    ['vision', 'success', ''],
    ['grading', 'success', ''],
  ]);
});

test('retries incomplete high-accuracy grading once in fast mode', async () => {
  const gradingRequests = [];
  const fetchImpl = async (_url, options) => {
    const request = JSON.parse(options.body);
    const name = deepSeekRequestName(request);
    let payload;
    if (name === 'homework_text_grading') {
      gradingRequests.push(request);
      payload = gradingRequests.length === 1
        ? { status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } }
        : completedPayload(sampleGrading());
    } else {
      payload = completedPayload(sampleResponseForRequest(request));
    }
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify(payload),
    };
  };

  const result = await callDeepSeekHomeworkReview({
    apiKey: 'test-key',
    imageData: 'data:image/jpeg;base64,AA==',
    fetchImpl,
    sleep: async () => {},
  });

  assert.equal(gradingRequests.length, 2);
  assert.deepEqual(gradingRequests.map((request) => request.reasoning.effort), ['high', 'low']);
  assert.deepEqual(gradingRequests.map((request) => request.max_output_tokens), [12000, 10000]);
  assert.match(result.gradingWarning, /快速模式重试/);
  assert.deepEqual(result.attempts.map(({ stage, status, code }) => [stage, status, code || '']), [
    ['vision', 'success', ''],
    ['grading', 'failed', 'INCOMPLETE_RESPONSE'],
    ['grading', 'success', ''],
  ]);
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
    const result = sampleResponseForRequest(request);
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

  assert.equal(calls, 3);
  assert.deepEqual(result.attempts.map((item) => item.status), ['failed', 'success', 'success']);
  assert.deepEqual(result.attempts.map((item) => item.stage), ['vision', 'vision', 'grading']);
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
