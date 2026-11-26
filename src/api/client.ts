import type {
  FeedbackEntry,
  Survey,
  SurveyAnswerValue,
  SurveyDraft,
  SurveyReport,
  SurveyStatus,
} from '../types/survey';

export interface SurveyListItem extends Survey {
  responseCount: number;
  computedStatus: SurveyStatus;
}

export async function fetchSurveys(): Promise<SurveyListItem[]> {
  const res = await fetch('/api/surveys');
  if (!res.ok) {
    throw new Error('Không thể tải danh sách khảo sát.');
  }
  const data = (await res.json()) as { surveys: SurveyListItem[] };
  return data.surveys;
}

export async function fetchSurveyById(
  id: string,
): Promise<{ survey: Survey; responseCount: number; computedStatus: SurveyStatus }> {
  const res = await fetch(`/api/surveys/${encodeURIComponent(id)}`);
  if (!res.ok) {
    throw new Error('Không tìm thấy phiếu khảo sát.');
  }
  return res.json();
}

export async function createSurvey(draft: SurveyDraft): Promise<Survey> {
  const res = await fetch('/api/surveys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'Không thể tạo khảo sát.') as Error & {
      fieldErrors?: Record<string, string>;
    };
    err.fieldErrors = data.errors;
    throw err;
  }
  return data.survey;
}

export async function toggleSurveyLock(
  id: string,
): Promise<{ survey: Survey; computedStatus: SurveyStatus }> {
  const res = await fetch(`/api/surveys/${encodeURIComponent(id)}/toggle-lock`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error('Không thể cập nhật trạng thái khóa khảo sát.');
  }
  return res.json();
}

export async function submitSurveyResponse(
  surveyId: string,
  payload: {
    answers: SurveyAnswerValue[];
    respondentName?: string;
    respondentUnit?: string;
  },
): Promise<{ receiptCode: string; submittedAt: string; isAnonymous: boolean }> {
  const res = await fetch(`/api/surveys/${encodeURIComponent(surveyId)}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'Không thể gửi phiếu khảo sát.') as Error & {
      fieldErrors?: Record<string, string>;
    };
    err.fieldErrors = data.errors;
    throw err;
  }
  return data;
}

export async function fetchSurveyReport(
  surveyId: string,
  unitFilter?: string,
): Promise<{
  survey: Survey;
  computedStatus: SurveyStatus;
  report: SurveyReport;
  availableReportUnits: string[];
}> {
  const query = unitFilter ? `?unit=${encodeURIComponent(unitFilter)}` : '';
  const res = await fetch(`/api/surveys/${encodeURIComponent(surveyId)}/report${query}`);
  if (!res.ok) {
    throw new Error('Không thể tải báo cáo thống kê.');
  }
  return res.json();
}

export async function fetchFeedback(): Promise<FeedbackEntry[]> {
  const res = await fetch('/api/feedback');
  if (!res.ok) {
    throw new Error('Không thể tải danh sách ý kiến đóng góp.');
  }
  const data = (await res.json()) as { feedback: FeedbackEntry[] };
  return data.feedback;
}

export async function submitFeedback(payload: {
  category: string;
  targetUnit: string;
  isAnonymous: boolean;
  senderName?: string;
  subject: string;
  content: string;
}): Promise<FeedbackEntry> {
  const res = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'Không thể gửi ý kiến.') as Error & {
      fieldErrors?: Record<string, string>;
    };
    err.fieldErrors = data.errors;
    throw err;
  }
  return data.entry;
}

export async function toggleFeedbackStatus(id: string): Promise<FeedbackEntry> {
  const res = await fetch(`/api/feedback/${encodeURIComponent(id)}`, {
    method: 'PATCH',
  });
  if (!res.ok) {
    throw new Error('Không thể cập nhật trạng thái xử lý.');
  }
  const data = (await res.json()) as { entry: FeedbackEntry };
  return data.entry;
}
