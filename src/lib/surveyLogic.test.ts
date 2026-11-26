import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateSurveyReport,
  buildSanitizedResponse,
  fromVietnamInputParts,
  generateSurveyCsv,
  getSurveyStatus,
  toVietnamInputParts,
  validateSurveyDraft,
  validateSurveySubmission,
} from './surveyLogic';
import type { Survey, SurveyDraft } from '../types/survey';

const sampleSurvey: Survey = {
  id: 'srv-test',
  code: 'KS-2026-01',
  title: 'Khảo sát tình hình đơn vị tháng 01/2026',
  purpose: 'Nắm tình hình toàn diện của đơn vị.',
  instructions: 'Đọc kỹ câu hỏi trước khi trả lời.',
  startTime: '2026-11-01T07:00:00+07:00',
  endTime: '2026-12-01T17:00:00+07:00',
  targetScope: 'all',
  targetUnits: [],
  isAnonymous: true,
  manualLocked: false,
  createdAt: '2026-11-01T00:00:00+07:00',
  questions: [
    {
      id: 'q1',
      order: 1,
      type: 'single_choice',
      prompt: 'Đánh giá công tác tư tưởng',
      required: true,
      options: ['Rất tốt', 'Tốt', 'Cần cải thiện'],
    },
    {
      id: 'q2',
      order: 2,
      type: 'multiple_choice',
      prompt: 'Nội dung cần quan tâm',
      required: true,
      options: ['Bảo vệ an ninh', 'Đời sống vật chất'],
    },
    {
      id: 'q3',
      order: 3,
      type: 'open_text',
      prompt: 'Ý kiến đề xuất',
      required: false,
      options: [],
    },
  ],
};

test('Vietnam UTC+7 conversion roundtrips accurately', () => {
  const iso = fromVietnamInputParts('2026-11-02', '07:00');
  assert.equal(iso, '2026-11-02T07:00:00+07:00');
  const parts = toVietnamInputParts(iso);
  assert.deepEqual(parts, { date: '2026-11-02', time: '07:00' });
});

test('getSurveyStatus computes upcoming, active, closed, and manualLocked correctly', () => {
  const beforeStart = Date.parse('2026-10-31T12:00:00+07:00');
  const during = Date.parse('2026-11-15T12:00:00+07:00');
  const afterEnd = Date.parse('2026-12-02T12:00:00+07:00');

  assert.equal(getSurveyStatus(sampleSurvey, beforeStart), 'upcoming');
  assert.equal(getSurveyStatus(sampleSurvey, during), 'active');
  assert.equal(getSurveyStatus(sampleSurvey, afterEnd), 'closed');
  assert.equal(getSurveyStatus({ ...sampleSurvey, manualLocked: true }, during), 'closed');
});

test('validateSurveyDraft rejects missing required fields and invalid date order', () => {
  const badDraft: SurveyDraft = {
    title: '',
    purpose: '',
    instructions: '',
    startDate: '2026-11-03',
    startTime: '17:00',
    endDate: '2026-11-02',
    endTime: '07:00',
    targetScope: 'specific_units',
    targetUnits: [],
    isAnonymous: true,
    questions: [],
  };

  const result = validateSurveyDraft(badDraft);
  assert.equal(result.valid, false);
  assert.ok(result.errors.title);
  assert.ok(result.errors.purpose);
  assert.ok(result.errors.endTime);
  assert.ok(result.errors.targetUnits);
  assert.ok(result.errors.questions);
});

test('buildSanitizedResponse strips respondentName when survey is anonymous', () => {
  const sanitized = buildSanitizedResponse(
    sampleSurvey,
    [{ questionId: 'q1', selectedOptions: ['Tốt'] }],
    { name: 'Nguyễn Văn A', unit: 'Tiểu đoàn 1' },
    'res-1',
    'PH-001',
    '2026-11-15T08:00:00+07:00',
  );
  assert.equal(sanitized.respondentName, undefined);
  assert.equal(sanitized.respondentUnit, 'Tiểu đoàn 1');
});

test('validateSurveySubmission enforces required questions and blocks closed surveys', () => {
  const during = Date.parse('2026-11-15T12:00:00+07:00');
  const afterEnd = Date.parse('2026-12-05T12:00:00+07:00');

  const missingResult = validateSurveySubmission(sampleSurvey, {}, {}, during);
  assert.equal(missingResult.valid, false);
  assert.ok(missingResult.errors.q1);
  assert.ok(missingResult.errors.q2);
  assert.equal(missingResult.errors.q3, undefined);

  const closedResult = validateSurveySubmission(
    sampleSurvey,
    {
      q1: { questionId: 'q1', selectedOptions: ['Rất tốt'] },
      q2: { questionId: 'q2', selectedOptions: ['Bảo vệ an ninh'] },
    },
    {},
    afterEnd,
  );
  assert.equal(closedResult.valid, false);
  assert.ok(closedResult.errors.survey);
});

test('aggregateSurveyReport computes counts, percentages, and text entries accurately', () => {
  const r1 = buildSanitizedResponse(
    sampleSurvey,
    [
      { questionId: 'q1', selectedOptions: ['Rất tốt'] },
      { questionId: 'q2', selectedOptions: ['Bảo vệ an ninh', 'Đời sống vật chất'] },
      { questionId: 'q3', textValue: 'Đề nghị tăng cường sinh hoạt chuyên đề.' },
    ],
    { unit: 'Tiểu đoàn 1' },
    'r1',
    'PH-101',
    '2026-11-15T08:00:00+07:00',
  );
  const r2 = buildSanitizedResponse(
    sampleSurvey,
    [
      { questionId: 'q1', selectedOptions: ['Tốt'] },
      { questionId: 'q2', selectedOptions: ['Bảo vệ an ninh'] },
    ],
    { unit: 'Tiểu đoàn 2' },
    'r2',
    'PH-102',
    '2026-11-15T09:00:00+07:00',
  );

  const report = aggregateSurveyReport(sampleSurvey, [r1, r2]);
  assert.equal(report.totalResponses, 2);
  assert.equal(report.anonymousCount, 2);
  assert.equal(report.questionReports[0].optionStats[0].percentage, 50);
  assert.equal(report.questionReports[1].optionStats[0].count, 2);
  assert.equal(report.questionReports[1].optionStats[0].percentage, 100);
  assert.equal(report.questionReports[2].textResponses.length, 1);

  const csv = generateSurveyCsv(sampleSurvey, report);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('Đề nghị tăng cường sinh hoạt chuyên đề.'));
});
