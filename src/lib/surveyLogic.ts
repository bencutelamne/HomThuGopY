import type {
  QuestionReport,
  Survey,
  SurveyAnswerValue,
  SurveyDraft,
  SurveyQuestion,
  SurveyReport,
  SurveyResponse,
  SurveyStatus,
} from '../types/survey';

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Converts a YYYY-MM-DD and HH:mm pair (Vietnam Time, UTC+7) into an ISO-8601 string with +07:00 offset.
 */
export function fromVietnamInputParts(dateStr: string, timeStr: string): string {
  if (!dateStr || !timeStr) {
    return '';
  }
  return `${dateStr}T${timeStr}:00+07:00`;
}

/**
 * Extracts Vietnam Time (UTC+7) YYYY-MM-DD and HH:mm from an ISO string.
 */
export function toVietnamInputParts(isoString: string): { date: string; time: string } {
  const ms = Date.parse(isoString);
  if (Number.isNaN(ms)) {
    return { date: '', time: '' };
  }
  const vnDate = new Date(ms + VN_OFFSET_MS);
  const year = vnDate.getUTCFullYear();
  const month = String(vnDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(vnDate.getUTCDate()).padStart(2, '0');
  const hours = String(vnDate.getUTCHours()).padStart(2, '0');
  const minutes = String(vnDate.getUTCMinutes()).padStart(2, '0');
  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
}

/**
 * Formats an ISO timestamp in clean Vietnamese format (DD/MM/YYYY HH:mm, Giờ VN).
 */
export function formatVietnamDateTime(isoString: string): string {
  const { date, time } = toVietnamInputParts(isoString);
  if (!date) return '—';
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y} ${time}`;
}

/**
 * Computes current status of a survey strictly against Vietnam time & manual lock flag.
 */
export function getSurveyStatus(survey: Survey, nowMs: number = Date.now()): SurveyStatus {
  if (survey.manualLocked) {
    return 'closed';
  }
  const startMs = Date.parse(survey.startTime);
  const endMs = Date.parse(survey.endTime);

  if (!Number.isNaN(endMs) && nowMs > endMs) {
    return 'closed';
  }
  if (!Number.isNaN(startMs) && nowMs < startMs) {
    return 'upcoming';
  }
  return 'active';
}

export function getStatusLabel(status: SurveyStatus): string {
  switch (status) {
    case 'active':
      return 'Đang mở';
    case 'upcoming':
      return 'Sắp diễn ra';
    case 'closed':
      return 'Đã khóa & tổng hợp';
  }
}

export function getQuestionTypeLabel(type: SurveyQuestion['type']): string {
  switch (type) {
    case 'single_choice':
      return 'Chọn 1 đáp án';
    case 'multiple_choice':
      return 'Chọn nhiều đáp án';
    case 'open_text':
      return 'Ý kiến tự luận';
  }
}

export interface SurveyDraftValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates a survey draft before publishing.
 */
export function validateSurveyDraft(draft: SurveyDraft): SurveyDraftValidationResult {
  const errors: Record<string, string> = {};

  if (!draft.title.trim()) {
    errors.title = 'Vui lòng nhập tên khảo sát.';
  }
  if (!draft.purpose.trim()) {
    errors.purpose = 'Vui lòng nhập mục đích khảo sát.';
  }
  if (!draft.startDate || !draft.startTime) {
    errors.startTime = 'Vui lòng chọn đầy đủ ngày và giờ bắt đầu.';
  }
  if (!draft.endDate || !draft.endTime) {
    errors.endTime = 'Vui lòng chọn đầy đủ ngày và giờ kết thúc.';
  }

  if (draft.startDate && draft.startTime && draft.endDate && draft.endTime) {
    const startMs = Date.parse(fromVietnamInputParts(draft.startDate, draft.startTime));
    const endMs = Date.parse(fromVietnamInputParts(draft.endDate, draft.endTime));
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      errors.endTime = 'Thời gian không hợp lệ.';
    } else if (endMs <= startMs) {
      errors.endTime = 'Thời gian kết thúc phải sau thời gian bắt đầu.';
    }
  }

  if (draft.targetScope === 'specific_units' && draft.targetUnits.length === 0) {
    errors.targetUnits = 'Vui lòng chọn ít nhất một đơn vị tham gia.';
  }

  if (draft.questions.length === 0) {
    errors.questions = 'Phiếu khảo sát phải có ít nhất 1 câu hỏi.';
  } else {
    draft.questions.forEach((q, idx) => {
      if (!q.prompt.trim()) {
        errors[`question_${q.id}`] = `Câu hỏi ${idx + 1} chưa có nội dung.`;
      }
      if (q.type !== 'open_text') {
        const cleanOpts = q.options.map((o) => o.trim()).filter(Boolean);
        if (cleanOpts.length < 2) {
          errors[`question_opts_${q.id}`] = `Câu hỏi ${idx + 1} cần ít nhất 2 phương án trả lời.`;
        }
      }
    });
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface SubmissionValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates answers submitted by a participant for a given survey.
 */
export function validateSurveySubmission(
  survey: Survey,
  answersByQuestionId: Record<string, SurveyAnswerValue>,
  respondent: { name?: string; unit?: string },
  nowMs: number = Date.now(),
): SubmissionValidationResult {
  const errors: Record<string, string> = {};
  const status = getSurveyStatus(survey, nowMs);

  if (status === 'closed') {
    errors.survey = 'Cuộc khảo sát đã hết thời gian hoặc đã được khóa, không thể gửi thêm phiếu.';
    return { valid: false, errors };
  }
  if (status === 'upcoming') {
    errors.survey = 'Cuộc khảo sát chưa đến thời gian mở phiếu.';
    return { valid: false, errors };
  }

  if (!survey.isAnonymous && !respondent.name?.trim()) {
    errors.respondentName = 'Khảo sát định danh yêu cầu nhập họ tên hoặc chức vụ người trả lời.';
  }

  if (survey.targetScope === 'specific_units' && !respondent.unit?.trim()) {
    errors.respondentUnit = 'Vui lòng chọn đơn vị công tác thuộc phạm vi khảo sát.';
  }

  for (const question of survey.questions) {
    if (!question.required) continue;
    const ans = answersByQuestionId[question.id];
    if (question.type === 'open_text') {
      if (!ans?.textValue?.trim()) {
        errors[question.id] = 'Vui lòng nhập nội dung trả lời cho câu hỏi bắt buộc này.';
      }
    } else {
      if (!ans?.selectedOptions || ans.selectedOptions.length === 0) {
        errors[question.id] = 'Vui lòng chọn ít nhất một phương án trả lời.';
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Sanitizes a submitted response so anonymous surveys NEVER store respondent identity.
 */
export function buildSanitizedResponse(
  survey: Survey,
  answers: SurveyAnswerValue[],
  respondent: { name?: string; unit?: string },
  id: string,
  receiptCode: string,
  submittedAt: string,
): SurveyResponse {
  return {
    id,
    surveyId: survey.id,
    receiptCode,
    submittedAt,
    respondentName: survey.isAnonymous ? undefined : respondent.name?.trim() || undefined,
    respondentUnit: respondent.unit?.trim() || undefined,
    answers,
  };
}

/**
 * Aggregates all responses into a deterministic statistical report.
 */
export function aggregateSurveyReport(
  survey: Survey,
  responses: SurveyResponse[],
  generatedAt: string = new Date().toISOString(),
): SurveyReport {
  const totalResponses = responses.length;
  let anonymousCount = 0;
  let identifiedCount = 0;
  const unitCounts = new Map<string, number>();

  for (const r of responses) {
    if (r.respondentName) {
      identifiedCount += 1;
    } else {
      anonymousCount += 1;
    }
    const unitLabel = r.respondentUnit?.trim() || 'Không phân định đơn vị';
    unitCounts.set(unitLabel, (unitCounts.get(unitLabel) ?? 0) + 1);
  }

  const unitBreakdown = Array.from(unitCounts.entries())
    .map(([unit, count]) => ({
      unit,
      count,
      percentage: totalResponses > 0 ? Math.round((count / totalResponses) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const questionReports: QuestionReport[] = survey.questions.map((question) => {
    const optionCountMap = new Map<string, number>();
    question.options.forEach((opt) => optionCountMap.set(opt, 0));

    let totalAnswered = 0;
    const textResponses: QuestionReport['textResponses'] = [];

    for (const r of responses) {
      const ans = r.answers.find((a) => a.questionId === question.id);
      if (!ans) continue;

      if (question.type === 'open_text') {
        const text = ans.textValue?.trim();
        if (text) {
          totalAnswered += 1;
          textResponses.push({
            receiptCode: r.receiptCode,
            submittedAt: r.submittedAt,
            unit: r.respondentUnit,
            text,
          });
        }
      } else {
        const selected = ans.selectedOptions ?? [];
        if (selected.length > 0) {
          totalAnswered += 1;
          for (const opt of selected) {
            optionCountMap.set(opt, (optionCountMap.get(opt) ?? 0) + 1);
          }
        }
      }
    }

    const denominator = totalAnswered > 0 ? totalAnswered : 0;
    const optionStats = question.options.map((option) => {
      const count = optionCountMap.get(option) ?? 0;
      const percentage = denominator > 0 ? Math.round((count / denominator) * 1000) / 10 : 0;
      return {
        option,
        count,
        percentage,
      };
    });

    return {
      questionId: question.id,
      order: question.order,
      type: question.type,
      prompt: question.prompt,
      totalAnswered,
      optionStats,
      textResponses,
    };
  });

  return {
    surveyId: survey.id,
    totalResponses,
    anonymousCount,
    identifiedCount,
    unitBreakdown,
    questionReports,
    generatedAt,
  };
}

function escapeCsvCell(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Generates a UTF-8 BOM CSV string for automatic Vietnamese Excel reporting.
 */
export function generateSurveyCsv(
  survey: Survey,
  report: SurveyReport,
): string {
  const lines: string[] = [];
  lines.push([escapeCsvCell('BÁO CÁO TỔNG HỢP KẾT QUẢ KHẢO SÁT'), escapeCsvCell(survey.title)].join(','));
  lines.push([escapeCsvCell('Mã khảo sát'), escapeCsvCell(survey.code)].join(','));
  lines.push([escapeCsvCell('Tổng số phiếu hợp lệ'), String(report.totalResponses)].join(','));
  lines.push([escapeCsvCell('Chế độ'), escapeCsvCell(survey.isAnonymous ? 'Ẩn danh tuyệt đối' : 'Định danh')].join(','));
  lines.push('');
  lines.push([
    escapeCsvCell('STT Câu'),
    escapeCsvCell('Nội dung câu hỏi'),
    escapeCsvCell('Loại câu hỏi'),
    escapeCsvCell('Phương án / Ý kiến'),
    escapeCsvCell('Số lượt'),
    escapeCsvCell('Tỷ lệ (%)'),
  ].join(','));

  for (const qr of report.questionReports) {
    if (qr.type === 'open_text') {
      if (qr.textResponses.length === 0) {
        lines.push([
          String(qr.order),
          escapeCsvCell(qr.prompt),
          escapeCsvCell(getQuestionTypeLabel(qr.type)),
          escapeCsvCell('(Chưa có ý kiến đóng góp)'),
          '0',
          '0',
        ].join(','));
      } else {
        qr.textResponses.forEach((tr) => {
          lines.push([
            String(qr.order),
            escapeCsvCell(qr.prompt),
            escapeCsvCell(getQuestionTypeLabel(qr.type)),
            escapeCsvCell(`[${tr.receiptCode}] ${tr.text}`),
            '1',
            '-',
          ].join(','));
        });
      }
    } else {
      qr.optionStats.forEach((os) => {
        lines.push([
          String(qr.order),
          escapeCsvCell(qr.prompt),
          escapeCsvCell(getQuestionTypeLabel(qr.type)),
          escapeCsvCell(os.option),
          String(os.count),
          String(os.percentage),
        ].join(','));
      });
    }
  }

  return '\uFEFF' + lines.join('\n');
}
