import initialStoreJson from '../../data/store.json';
import {
  canDeleteAccount,
  formatAccountDisplayTitle,
  isRootAdminUsername,
  normalizeUsername,
  toAuthUser,
  toPublicAccount,
  validateAccountCreate,
  validateAccountUpdate,
} from '../lib/accountLogic';
import { hashPasswordBrowser, verifyPasswordBrowser } from '../lib/browserScrypt';
import {
  aggregateSurveyReport,
  buildSanitizedResponse,
  fromVietnamInputParts,
  getSurveyStatus,
  validateSurveyDraft,
  validateSurveySubmission,
} from '../lib/surveyLogic';
import {
  FEEDBACK_UNITS,
  type AccountCreateInput,
  type AccountRecord,
  type AccountUpdateInput,
  type AuthUser,
  type FeedbackEntry,
  type FeedbackSummary,
  type FeedbackUnit,
  type PublicAccount,
  type Survey,
  type SurveyAnswerValue,
  type SurveyDraft,
  type SurveyReport,
  type SurveyResponse,
  type SurveyStatus,
} from '../types/survey';
import { createApiError } from './errors';

const STORE_STORAGE_KEY = 'htgy_static_store_v1';
const SESSION_STORAGE_KEY = 'htgy_static_session_account_id';

interface StoreData {
  surveys: Survey[];
  responses: SurveyResponse[];
  feedback: FeedbackEntry[];
  accounts: AccountRecord[];
}

export interface StaticSurveyListItem extends Survey {
  responseCount: number;
  computedStatus: SurveyStatus;
}

function cloneInitialStore(): StoreData {
  const seed = initialStoreJson as unknown as Partial<StoreData>;
  return {
    surveys: Array.isArray(seed.surveys) ? structuredClone(seed.surveys) : [],
    responses: Array.isArray(seed.responses) ? structuredClone(seed.responses) : [],
    feedback: Array.isArray(seed.feedback) ? structuredClone(seed.feedback) : [],
    accounts: Array.isArray(seed.accounts) ? structuredClone(seed.accounts) : [],
  };
}

function loadStore(): StoreData {
  try {
    const raw = window.localStorage.getItem(STORE_STORAGE_KEY);
    if (!raw) {
      const initial = cloneInitialStore();
      saveStore(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    const fallback = cloneInitialStore();
    return {
      surveys: Array.isArray(parsed.surveys) ? parsed.surveys : fallback.surveys,
      responses: Array.isArray(parsed.responses) ? parsed.responses : fallback.responses,
      feedback: Array.isArray(parsed.feedback) ? parsed.feedback : fallback.feedback,
      accounts:
        Array.isArray(parsed.accounts) && parsed.accounts.length > 0
          ? parsed.accounts
          : fallback.accounts,
    };
  } catch {
    return cloneInitialStore();
  }
}

function saveStore(data: StoreData): void {
  try {
    window.localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota issues gracefully
  }
}

function getSessionUser(store: StoreData): AuthUser | null {
  try {
    const accountId = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!accountId) return null;
    const account = store.accounts.find((acc) => acc.id === accountId);
    if (!account) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return toAuthUser(account);
  } catch {
    return null;
  }
}

function requireFeedbackAccess(store: StoreData): AuthUser {
  const user = getSessionUser(store);
  if (!user) {
    throw createApiError('Vui lòng đăng nhập để xem nội dung góp ý.', 401);
  }
  if (user.role !== 'admin' && user.role !== 'officer') {
    throw createApiError('Tài khoản chiến sĩ không có quyền xem hoặc xử lý thư góp ý.', 403);
  }
  return user;
}

function requireAdmin(store: StoreData): AuthUser {
  const user = getSessionUser(store);
  if (!user) {
    throw createApiError('Vui lòng đăng nhập bằng tài khoản quản trị.', 401);
  }
  if (user.role !== 'admin') {
    throw createApiError('Chỉ tài khoản quyền Admin mới được phép thực hiện thao tác này.', 403);
  }
  return user;
}

function requireRootAdmin(store: StoreData): AuthUser {
  const user = getSessionUser(store);
  if (!user) {
    throw createApiError('Vui lòng đăng nhập bằng tài khoản admin.', 401);
  }
  if (!isRootAdminUsername(user.username) || user.role !== 'admin') {
    throw createApiError(
      'Chỉ duy nhất tài khoản quản trị gốc (admin) mới có quyền truy cập trang Quản lý tài khoản.',
      403,
    );
  }
  return user;
}

function generateShortCode(prefix: string): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${rand}`;
}

export const localAdapter = {
  async fetchSurveys(): Promise<StaticSurveyListItem[]> {
    const store = loadStore();
    const now = Date.now();
    return store.surveys
      .slice()
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map((survey) => ({
        ...survey,
        responseCount: store.responses.filter((r) => r.surveyId === survey.id).length,
        computedStatus: getSurveyStatus(survey, now),
      }));
  },

  async fetchSurveyById(
    id: string,
  ): Promise<{ survey: Survey; responseCount: number; computedStatus: SurveyStatus }> {
    const store = loadStore();
    const survey = store.surveys.find((s) => s.id === id);
    if (!survey) {
      throw createApiError('Không tìm thấy phiếu khảo sát.', 404);
    }
    const responseCount = store.responses.filter((r) => r.surveyId === survey.id).length;
    return {
      survey,
      responseCount,
      computedStatus: getSurveyStatus(survey),
    };
  },

  async createSurvey(draft: SurveyDraft): Promise<Survey> {
    const validation = validateSurveyDraft(draft);
    if (!validation.valid) {
      throw createApiError(
        'Thông tin khảo sát chưa đầy đủ hoặc không hợp lệ.',
        400,
        validation.errors,
      );
    }

    const store = loadStore();
    const nowIso = new Date().toISOString();
    const newSurvey: Survey = {
      id: `srv-${Date.now()}`,
      code: `KS-${new Date().getFullYear()}-${String(store.surveys.length + 1).padStart(2, '0')}`,
      title: draft.title.trim(),
      purpose: draft.purpose.trim(),
      instructions:
        draft.instructions?.trim() ||
        'Đồng chí vui lòng đọc kỹ từng câu hỏi trước khi trả lời. Kết quả khảo sát được tổng hợp phục vụ công tác lãnh đạo, chỉ huy.',
      startTime: fromVietnamInputParts(draft.startDate, draft.startTime),
      endTime: fromVietnamInputParts(draft.endDate, draft.endTime),
      targetScope: draft.targetScope,
      targetUnits: draft.targetScope === 'specific_units' ? draft.targetUnits : [],
      isAnonymous: Boolean(draft.isAnonymous),
      manualLocked: false,
      createdAt: nowIso,
      questions: draft.questions.map((q, index) => ({
        ...q,
        order: index + 1,
        prompt: q.prompt.trim(),
        options:
          q.type === 'open_text'
            ? []
            : q.options.map((opt) => opt.trim()).filter(Boolean),
      })),
    };

    store.surveys.unshift(newSurvey);
    saveStore(store);
    return newSurvey;
  },

  async toggleSurveyLock(
    id: string,
  ): Promise<{ survey: Survey; computedStatus: SurveyStatus }> {
    const store = loadStore();
    const idx = store.surveys.findIndex((s) => s.id === id);
    if (idx === -1) {
      throw createApiError('Không tìm thấy phiếu khảo sát.', 404);
    }
    store.surveys[idx].manualLocked = !store.surveys[idx].manualLocked;
    saveStore(store);
    return {
      survey: store.surveys[idx],
      computedStatus: getSurveyStatus(store.surveys[idx]),
    };
  },

  async submitSurveyResponse(
    surveyId: string,
    payload: {
      answers: SurveyAnswerValue[];
      respondentName?: string;
      respondentUnit?: string;
    },
  ): Promise<{ receiptCode: string; submittedAt: string; isAnonymous: boolean }> {
    const store = loadStore();
    const survey = store.surveys.find((s) => s.id === surveyId);
    if (!survey) {
      throw createApiError('Không tìm thấy phiếu khảo sát.', 404);
    }

    const answersMap: Record<string, SurveyAnswerValue> = {};
    for (const ans of payload.answers ?? []) {
      answersMap[ans.questionId] = ans;
    }

    const validation = validateSurveySubmission(
      survey,
      answersMap,
      { name: payload.respondentName, unit: payload.respondentUnit },
      Date.now(),
    );

    if (!validation.valid) {
      throw createApiError(
        validation.errors.survey || 'Vui lòng hoàn thành các câu hỏi bắt buộc.',
        400,
        validation.errors,
      );
    }

    const sanitized = buildSanitizedResponse(
      survey,
      payload.answers ?? [],
      { name: payload.respondentName, unit: payload.respondentUnit },
      `res-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      generateShortCode('PH'),
      new Date().toISOString(),
    );

    store.responses.push(sanitized);
    saveStore(store);
    return {
      receiptCode: sanitized.receiptCode,
      submittedAt: sanitized.submittedAt,
      isAnonymous: Boolean(survey.isAnonymous),
    };
  },

  async fetchSurveyReport(
    surveyId: string,
    unitFilter?: string,
  ): Promise<{
    survey: Survey;
    computedStatus: SurveyStatus;
    report: SurveyReport;
    availableReportUnits: string[];
  }> {
    const store = loadStore();
    const survey = store.surveys.find((s) => s.id === surveyId);
    if (!survey) {
      throw createApiError('Không tìm thấy phiếu khảo sát.', 404);
    }
    const cleanFilter = unitFilter?.trim() || '';
    const allSurveyResponses = store.responses.filter((r) => r.surveyId === survey.id);
    const filteredResponses = cleanFilter
      ? allSurveyResponses.filter(
          (r) => (r.respondentUnit || 'Không phân định đơn vị') === cleanFilter,
        )
      : allSurveyResponses;

    const report = aggregateSurveyReport(survey, filteredResponses);
    const availableReportUnits = Array.from(
      new Set(allSurveyResponses.map((r) => r.respondentUnit || 'Không phân định đơn vị')),
    );

    return {
      survey,
      computedStatus: getSurveyStatus(survey),
      report,
      availableReportUnits,
    };
  },

  async fetchCurrentUser(): Promise<AuthUser | null> {
    const store = loadStore();
    return getSessionUser(store);
  },

  async loginAccount(username: string, password: string): Promise<AuthUser> {
    const store = loadStore();
    const normalized = normalizeUsername(username || '');
    const account = store.accounts.find(
      (acc) =>
        normalizeUsername(acc.username) === normalized &&
        verifyPasswordBrowser(password ?? '', acc.passwordHash),
    );
    if (!account) {
      throw createApiError('Tên đăng nhập hoặc mật khẩu không đúng.', 401);
    }
    window.localStorage.setItem(SESSION_STORAGE_KEY, account.id);
    return toAuthUser(account);
  },

  async logoutAccount(): Promise<void> {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  },

  async fetchFeedbackSummary(): Promise<FeedbackSummary> {
    const store = loadStore();
    const byUnit: Record<string, number> = {};
    for (const unit of FEEDBACK_UNITS) {
      byUnit[unit] = 0;
    }
    for (const item of store.feedback) {
      byUnit[item.targetUnit] = (byUnit[item.targetUnit] ?? 0) + 1;
    }
    return { total: store.feedback.length, byUnit };
  },

  async fetchFeedback(): Promise<FeedbackEntry[]> {
    const store = loadStore();
    requireFeedbackAccess(store);
    return store.feedback
      .slice()
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  },

  async submitFeedback(payload: {
    targetUnit: string;
    isAnonymous: boolean;
    senderName?: string;
    content: string;
    category?: string;
    subject?: string;
  }): Promise<FeedbackEntry> {
    const store = loadStore();
    const sessionUser = getSessionUser(store);
    const isAnon = Boolean(payload.isAnonymous);
    const unit = payload.targetUnit?.trim() || '';

    if (sessionUser?.role === 'soldier' && unit !== sessionUser.unit) {
      const msg = `Tài khoản Chiến sĩ chỉ được đóng góp ý kiến cho đơn vị trong tài khoản (${sessionUser.unit}).`;
      throw createApiError(msg, 403, { targetUnit: msg });
    }

    const effectiveSenderName = isAnon
      ? undefined
      : sessionUser
        ? formatAccountDisplayTitle(sessionUser.role, sessionUser.fullName)
        : payload.senderName?.trim();

    const errors: Record<string, string> = {};
    if (!FEEDBACK_UNITS.includes(unit as (typeof FEEDBACK_UNITS)[number])) {
      errors.targetUnit =
        'Vui lòng chọn đơn vị góp ý (Đại đội 1, Đại đội 104 hoặc Đại đội 102).';
    }
    if (!payload.content?.trim()) {
      errors.content = 'Vui lòng nhập nội dung góp ý.';
    }
    if (!isAnon && !effectiveSenderName) {
      errors.senderName = 'Vui lòng nhập họ tên hoặc chọn chế độ Ẩn danh.';
    }
    if (Object.keys(errors).length > 0) {
      throw createApiError('Dữ liệu chưa hợp lệ.', 400, errors);
    }

    const entry: FeedbackEntry = {
      id: `fb-${Date.now()}`,
      receiptCode: generateShortCode('YK'),
      category: payload.category?.trim() || undefined,
      targetUnit: unit,
      isAnonymous: isAnon,
      senderName: effectiveSenderName,
      subject: payload.subject?.trim() || undefined,
      content: payload.content.trim(),
      createdAt: new Date().toISOString(),
      status: 'received',
    };

    store.feedback.unshift(entry);
    saveStore(store);
    return entry;
  },

  async toggleFeedbackStatus(id: string): Promise<FeedbackEntry> {
    const store = loadStore();
    requireFeedbackAccess(store);
    const idx = store.feedback.findIndex((f) => f.id === id);
    if (idx === -1) {
      throw createApiError('Không tìm thấy phản ánh.', 404);
    }
    store.feedback[idx].status =
      store.feedback[idx].status === 'received' ? 'reviewed' : 'received';
    saveStore(store);
    return store.feedback[idx];
  },

  async clearAllFeedback(): Promise<{ deletedCount: number }> {
    const store = loadStore();
    requireAdmin(store);
    const deletedCount = store.feedback.length;
    store.feedback = [];
    saveStore(store);
    return { deletedCount };
  },

  async fetchAccounts(): Promise<PublicAccount[]> {
    const store = loadStore();
    requireRootAdmin(store);
    return store.accounts
      .slice()
      .sort((a, b) => {
        const aRoot = isRootAdminUsername(a.username) ? 0 : 1;
        const bRoot = isRootAdminUsername(b.username) ? 0 : 1;
        if (aRoot !== bRoot) return aRoot - bRoot;
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      })
      .map(toPublicAccount);
  },

  async createAccount(input: AccountCreateInput): Promise<PublicAccount> {
    const store = loadStore();
    requireRootAdmin(store);
    const validation = validateAccountCreate(input, store.accounts);
    if (!validation.valid) {
      throw createApiError(
        Object.values(validation.errors)[0] || 'Thông tin tài khoản chưa hợp lệ.',
        400,
        validation.errors,
      );
    }

    const nowIso = new Date().toISOString();
    const fullName = input.fullName.trim();
    const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString(16);
    const newAccount: AccountRecord = {
      id: `acc-${Date.now()}-${randomSuffix}`,
      username: normalizeUsername(input.username),
      displayName: formatAccountDisplayTitle(input.role, fullName),
      fullName,
      dateOfBirth: input.dateOfBirth.trim(),
      unit: input.unit as FeedbackUnit,
      role: input.role,
      passwordHash: hashPasswordBrowser(input.password),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    store.accounts.push(newAccount);
    saveStore(store);
    return toPublicAccount(newAccount);
  },

  async updateAccount(id: string, input: AccountUpdateInput): Promise<PublicAccount> {
    const store = loadStore();
    requireRootAdmin(store);
    const idx = store.accounts.findIndex((acc) => acc.id === id);
    if (idx === -1) {
      throw createApiError('Không tìm thấy tài khoản.', 404);
    }

    const existing = store.accounts[idx];
    const validation = validateAccountUpdate(existing, input);
    if (!validation.valid) {
      throw createApiError(
        Object.values(validation.errors)[0] || 'Thông tin cập nhật chưa hợp lệ.',
        400,
        validation.errors,
      );
    }

    const nextFullName =
      input.fullName !== undefined ? input.fullName.trim() : existing.fullName;
    const nextRole = input.role !== undefined ? input.role : existing.role;
    const updated: AccountRecord = {
      ...existing,
      fullName: nextFullName,
      displayName: formatAccountDisplayTitle(nextRole, nextFullName),
      dateOfBirth:
        input.dateOfBirth !== undefined ? input.dateOfBirth.trim() : existing.dateOfBirth,
      unit: input.unit !== undefined ? (input.unit as FeedbackUnit) : existing.unit,
      role: nextRole,
      passwordHash:
        input.password !== undefined && input.password !== ''
          ? hashPasswordBrowser(input.password)
          : existing.passwordHash,
      updatedAt: new Date().toISOString(),
    };

    store.accounts[idx] = updated;
    saveStore(store);
    return toPublicAccount(updated);
  },

  async deleteAccount(id: string): Promise<void> {
    const store = loadStore();
    requireRootAdmin(store);
    const idx = store.accounts.findIndex((acc) => acc.id === id);
    if (idx === -1) {
      throw createApiError('Không tìm thấy tài khoản.', 404);
    }
    const target = store.accounts[idx];
    const deleteCheck = canDeleteAccount(target);
    if (!deleteCheck.allowed) {
      throw createApiError(deleteCheck.reason || 'Không thể xóa tài khoản.', 403);
    }
    store.accounts.splice(idx, 1);
    saveStore(store);
    if (window.localStorage.getItem(SESSION_STORAGE_KEY) === target.id) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  },
};
