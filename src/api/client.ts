import type {
  AccountCreateInput,
  AccountUpdateInput,
  AuthUser,
  FeedbackEntry,
  FeedbackSummary,
  PublicAccount,
  Survey,
  SurveyAnswerValue,
  SurveyDraft,
  SurveyReport,
  SurveyStatus,
} from '../types/survey';
import { createApiError, type ApiError } from './errors';
import { localAdapter } from './localAdapter';

export type { ApiError };

let staticModePromise: Promise<boolean> | null = null;

async function isStaticMode(): Promise<boolean> {
  if (import.meta.env.VITE_STATIC_MODE === 'true') {
    return true;
  }
  if (!staticModePromise) {
    staticModePromise = fetch('/api/auth/me')
      .then((res) => {
        const contentType = res.headers.get('content-type') || '';
        return !(res.ok && contentType.includes('application/json'));
      })
      .catch(() => true);
  }
  return staticModePromise;
}

async function parseJsonSafe<T>(res: Response): Promise<T | null> {
  const raw = await res.text();
  if (!raw.trim()) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export interface SurveyListItem extends Survey {
  responseCount: number;
  computedStatus: SurveyStatus;
}

export async function fetchSurveys(): Promise<SurveyListItem[]> {
  if (await isStaticMode()) {
    return localAdapter.fetchSurveys();
  }
  const res = await fetch('/api/surveys');
  const data = await parseJsonSafe<{ surveys?: SurveyListItem[]; error?: string }>(res);
  if (!res.ok || !data?.surveys) {
    throw createApiError(data?.error || 'Không thể tải danh sách khảo sát.', res.status);
  }
  return data.surveys;
}

export async function fetchSurveyById(
  id: string,
): Promise<{ survey: Survey; responseCount: number; computedStatus: SurveyStatus }> {
  if (await isStaticMode()) {
    return localAdapter.fetchSurveyById(id);
  }
  const res = await fetch(`/api/surveys/${encodeURIComponent(id)}`);
  const data = await parseJsonSafe<{
    survey?: Survey;
    responseCount?: number;
    computedStatus?: SurveyStatus;
    error?: string;
  }>(res);
  if (!res.ok || !data?.survey) {
    throw createApiError(data?.error || 'Không tìm thấy phiếu khảo sát.', res.status);
  }
  return {
    survey: data.survey,
    responseCount: data.responseCount ?? 0,
    computedStatus: data.computedStatus ?? 'active',
  };
}

export async function createSurvey(draft: SurveyDraft): Promise<Survey> {
  if (await isStaticMode()) {
    return localAdapter.createSurvey(draft);
  }
  const res = await fetch('/api/surveys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  });
  const data = await parseJsonSafe<{
    survey?: Survey;
    error?: string;
    errors?: Record<string, string>;
  }>(res);
  if (!res.ok || !data?.survey) {
    throw createApiError(
      data?.error || 'Không thể tạo khảo sát.',
      res.status,
      data?.errors,
    );
  }
  return data.survey;
}

export async function toggleSurveyLock(
  id: string,
): Promise<{ survey: Survey; computedStatus: SurveyStatus }> {
  if (await isStaticMode()) {
    return localAdapter.toggleSurveyLock(id);
  }
  const res = await fetch(`/api/surveys/${encodeURIComponent(id)}/toggle-lock`, {
    method: 'POST',
  });
  const data = await parseJsonSafe<{
    survey?: Survey;
    computedStatus?: SurveyStatus;
    error?: string;
  }>(res);
  if (!res.ok || !data?.survey || !data.computedStatus) {
    throw createApiError(
      data?.error || 'Không thể cập nhật trạng thái khóa khảo sát.',
      res.status,
    );
  }
  return { survey: data.survey, computedStatus: data.computedStatus };
}

export async function submitSurveyResponse(
  surveyId: string,
  payload: {
    answers: SurveyAnswerValue[];
    respondentName?: string;
    respondentUnit?: string;
  },
): Promise<{ receiptCode: string; submittedAt: string; isAnonymous: boolean }> {
  if (await isStaticMode()) {
    return localAdapter.submitSurveyResponse(surveyId, payload);
  }
  const res = await fetch(`/api/surveys/${encodeURIComponent(surveyId)}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonSafe<{
    receiptCode?: string;
    submittedAt?: string;
    isAnonymous?: boolean;
    error?: string;
    errors?: Record<string, string>;
  }>(res);
  if (!res.ok || !data?.receiptCode || !data.submittedAt) {
    throw createApiError(
      data?.error || 'Không thể gửi phiếu khảo sát.',
      res.status,
      data?.errors,
    );
  }
  return {
    receiptCode: data.receiptCode,
    submittedAt: data.submittedAt,
    isAnonymous: Boolean(data.isAnonymous),
  };
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
  if (await isStaticMode()) {
    return localAdapter.fetchSurveyReport(surveyId, unitFilter);
  }
  const query = unitFilter ? `?unit=${encodeURIComponent(unitFilter)}` : '';
  const res = await fetch(`/api/surveys/${encodeURIComponent(surveyId)}/report${query}`);
  const data = await parseJsonSafe<{
    survey?: Survey;
    computedStatus?: SurveyStatus;
    report?: SurveyReport;
    availableReportUnits?: string[];
    error?: string;
  }>(res);
  if (!res.ok || !data?.survey || !data.report || !data.computedStatus) {
    throw createApiError(data?.error || 'Không thể tải báo cáo thống kê.', res.status);
  }
  return {
    survey: data.survey,
    computedStatus: data.computedStatus,
    report: data.report,
    availableReportUnits: data.availableReportUnits ?? [],
  };
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  if (await isStaticMode()) {
    return localAdapter.fetchCurrentUser();
  }
  const res = await fetch('/api/auth/me');
  if (!res.ok) {
    return null;
  }
  const data = await parseJsonSafe<{ user?: AuthUser | null }>(res);
  return data?.user ?? null;
}

export async function loginAccount(username: string, password: string): Promise<AuthUser> {
  if (await isStaticMode()) {
    return localAdapter.loginAccount(username, password);
  }
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await parseJsonSafe<{ user?: AuthUser; error?: string }>(res);
  if (!res.ok || !data?.user) {
    const fallbackMsg =
      res.status === 404
        ? 'API đăng nhập chưa sẵn sàng trên server (cần khởi động lại server).'
        : `Đăng nhập không thành công (HTTP ${res.status}).`;
    throw createApiError(data?.error || fallbackMsg, res.status);
  }
  return data.user;
}

export async function logoutAccount(): Promise<void> {
  if (await isStaticMode()) {
    return localAdapter.logoutAccount();
  }
  const res = await fetch('/api/auth/logout', { method: 'POST' });
  if (!res.ok) {
    const data = await parseJsonSafe<{ error?: string }>(res);
    throw createApiError(data?.error || 'Không thể đăng xuất.', res.status);
  }
}

export async function fetchFeedbackSummary(): Promise<FeedbackSummary> {
  if (await isStaticMode()) {
    return localAdapter.fetchFeedbackSummary();
  }
  const res = await fetch('/api/feedback/summary');
  const data = await parseJsonSafe<FeedbackSummary & { error?: string }>(res);
  if (!res.ok || !data) {
    throw createApiError(
      data?.error || 'Không thể tải thống kê số lượng góp ý.',
      res.status,
    );
  }
  return { total: data.total, byUnit: data.byUnit };
}

export async function fetchFeedback(): Promise<FeedbackEntry[]> {
  if (await isStaticMode()) {
    return localAdapter.fetchFeedback();
  }
  const res = await fetch('/api/feedback');
  const data = await parseJsonSafe<{ feedback?: FeedbackEntry[]; error?: string }>(res);
  if (!res.ok || !data) {
    throw createApiError(
      data?.error || 'Không thể tải danh sách ý kiến đóng góp.',
      res.status,
    );
  }
  return data.feedback ?? [];
}

export async function submitFeedback(payload: {
  targetUnit: string;
  isAnonymous: boolean;
  senderName?: string;
  content: string;
  category?: string;
  subject?: string;
}): Promise<FeedbackEntry> {
  if (await isStaticMode()) {
    return localAdapter.submitFeedback(payload);
  }
  const sanitizedPayload = {
    ...payload,
    senderName: payload.isAnonymous ? undefined : payload.senderName?.trim(),
  };
  const res = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sanitizedPayload),
  });
  const data = await parseJsonSafe<{
    entry?: FeedbackEntry;
    error?: string;
    errors?: Record<string, string>;
  }>(res);
  if (!res.ok || !data?.entry) {
    throw createApiError(
      data?.error || 'Không thể gửi ý kiến.',
      res.status,
      data?.errors,
    );
  }
  return data.entry;
}

export async function toggleFeedbackStatus(id: string): Promise<FeedbackEntry> {
  if (await isStaticMode()) {
    return localAdapter.toggleFeedbackStatus(id);
  }
  const res = await fetch(`/api/feedback/${encodeURIComponent(id)}`, {
    method: 'PATCH',
  });
  const data = await parseJsonSafe<{ entry?: FeedbackEntry; error?: string }>(res);
  if (!res.ok || !data?.entry) {
    throw createApiError(
      data?.error || 'Không thể cập nhật trạng thái xử lý.',
      res.status,
    );
  }
  return data.entry;
}

export async function clearAllFeedback(): Promise<{ deletedCount: number }> {
  if (await isStaticMode()) {
    return localAdapter.clearAllFeedback();
  }
  const res = await fetch('/api/feedback', {
    method: 'DELETE',
  });
  const data = await parseJsonSafe<{ ok?: boolean; deletedCount?: number; error?: string }>(res);
  if (!res.ok || !data?.ok) {
    throw createApiError(
      data?.error || 'Không thể xóa toàn bộ thư góp ý.',
      res.status,
    );
  }
  return { deletedCount: data.deletedCount ?? 0 };
}

export async function fetchAccounts(): Promise<PublicAccount[]> {
  if (await isStaticMode()) {
    return localAdapter.fetchAccounts();
  }
  const res = await fetch('/api/accounts');
  const data = await parseJsonSafe<{ accounts?: PublicAccount[]; error?: string }>(res);
  if (!res.ok || !data?.accounts) {
    throw createApiError(
      data?.error || 'Không thể tải danh sách tài khoản.',
      res.status,
    );
  }
  return data.accounts;
}

export async function createAccount(input: AccountCreateInput): Promise<PublicAccount> {
  if (await isStaticMode()) {
    return localAdapter.createAccount(input);
  }
  const res = await fetch('/api/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await parseJsonSafe<{
    account?: PublicAccount;
    error?: string;
    errors?: Record<string, string>;
  }>(res);
  if (!res.ok || !data?.account) {
    throw createApiError(
      data?.error || 'Không thể tạo tài khoản mới.',
      res.status,
      data?.errors,
    );
  }
  return data.account;
}

export async function updateAccount(
  id: string,
  input: AccountUpdateInput,
): Promise<PublicAccount> {
  if (await isStaticMode()) {
    return localAdapter.updateAccount(id, input);
  }
  const res = await fetch(`/api/accounts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await parseJsonSafe<{
    account?: PublicAccount;
    error?: string;
    errors?: Record<string, string>;
  }>(res);
  if (!res.ok || !data?.account) {
    throw createApiError(
      data?.error || 'Không thể cập nhật thông tin tài khoản.',
      res.status,
      data?.errors,
    );
  }
  return data.account;
}

export async function deleteAccount(id: string): Promise<void> {
  if (await isStaticMode()) {
    return localAdapter.deleteAccount(id);
  }
  const res = await fetch(`/api/accounts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  const data = await parseJsonSafe<{ ok?: boolean; error?: string }>(res);
  if (!res.ok || !data?.ok) {
    throw createApiError(
      data?.error || 'Không thể xóa tài khoản.',
      res.status,
    );
  }
}
