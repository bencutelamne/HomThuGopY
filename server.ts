import express, { type Request } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { SEED_FEEDBACK, SEED_RESPONSES, SEED_SURVEYS } from './src/data/seedData';
import {
  canDeleteAccount,
  createRootAdminSeed,
  formatAccountDisplayTitle,
  isRootAdminUsername,
  normalizeUsername,
  toAuthUser,
  toPublicAccount,
  validateAccountCreate,
  validateAccountUpdate,
} from './src/lib/accountLogic';
import { hashPassword, verifyPassword } from './src/lib/passwordHash';
import {
  aggregateSurveyReport,
  buildSanitizedResponse,
  fromVietnamInputParts,
  getSurveyStatus,
  validateSurveyDraft,
  validateSurveySubmission,
} from './src/lib/surveyLogic';
import {
  FEEDBACK_UNITS,
  type AccountCreateInput,
  type AccountRecord,
  type AccountUpdateInput,
  type AuthUser,
  type FeedbackEntry,
  type FeedbackUnit,
  type Survey,
  type SurveyAnswerValue,
  type SurveyDraft,
  type SurveyResponse,
} from './src/types/survey';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

interface StoreData {
  surveys: Survey[];
  responses: SurveyResponse[];
  feedback: FeedbackEntry[];
  accounts: AccountRecord[];
}

function ensureAccountsSeeded(accounts: AccountRecord[]): {
  accounts: AccountRecord[];
  changed: boolean;
} {
  const list = Array.isArray(accounts) ? accounts.slice() : [];
  const hasRootAdmin = list.some((acc) => isRootAdminUsername(acc.username));
  if (!hasRootAdmin) {
    list.unshift(createRootAdminSeed(hashPassword('admin')));
    return { accounts: list, changed: true };
  }
  return { accounts: list, changed: false };
}

function loadStore(): StoreData {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    const initial: StoreData = {
      surveys: SEED_SURVEYS,
      responses: SEED_RESPONSES,
      feedback: SEED_FEEDBACK,
      accounts: [createRootAdminSeed(hashPassword('admin'))],
    };
    saveStore(initial);
    return initial;
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    const seeded = ensureAccountsSeeded(
      Array.isArray(parsed.accounts) ? parsed.accounts : [],
    );
    const store: StoreData = {
      surveys: Array.isArray(parsed.surveys) ? parsed.surveys : SEED_SURVEYS,
      responses: Array.isArray(parsed.responses) ? parsed.responses : SEED_RESPONSES,
      feedback: Array.isArray(parsed.feedback) ? parsed.feedback : SEED_FEEDBACK,
      accounts: seeded.accounts,
    };
    if (seeded.changed) {
      saveStore(store);
    }
    return store;
  } catch {
    const fallback: StoreData = {
      surveys: SEED_SURVEYS,
      responses: SEED_RESPONSES,
      feedback: SEED_FEEDBACK,
      accounts: [createRootAdminSeed(hashPassword('admin'))],
    };
    return fallback;
  }
}

function saveStore(data: StoreData): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${STORE_PATH}.tmp.${process.pid}.${crypto.randomBytes(6).toString('hex')}`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, STORE_PATH);
}

const SESSION_COOKIE = 'htgy_session';
const sessions = new Map<string, string>(); // sessionId -> accountId

function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  const result: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      result[key] = decodeURIComponent(val);
    }
  }
  return result;
}

function getSessionId(req: Request): string | null {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE] || null;
}

function getSessionUser(req: Request): AuthUser | null {
  const sid = getSessionId(req);
  if (!sid) return null;
  const accountId = sessions.get(sid);
  if (!accountId) return null;
  const store = loadStore();
  const account = store.accounts.find((acc) => acc.id === accountId);
  if (!account) {
    sessions.delete(sid);
    return null;
  }
  return toAuthUser(account);
}

function generateShortCode(prefix: string): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${rand}`;
}

async function startServer() {
  // Ensure store & root admin seed are initialized at startup
  loadStore();

  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const requireFeedbackAccess = (req: Request, res: express.Response): AuthUser | null => {
    const user = getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: 'Vui lòng đăng nhập để xem nội dung góp ý.' });
      return null;
    }
    if (user.role !== 'admin' && user.role !== 'officer') {
      res.status(403).json({ error: 'Tài khoản chiến sĩ không có quyền xem hoặc xử lý thư góp ý.' });
      return null;
    }
    return user;
  };

  const requireAdmin = (req: Request, res: express.Response): AuthUser | null => {
    const user = getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: 'Vui lòng đăng nhập bằng tài khoản quản trị.' });
      return null;
    }
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Chỉ tài khoản quyền Admin mới được phép thực hiện thao tác này.' });
      return null;
    }
    return user;
  };

  const requireRootAdmin = (req: Request, res: express.Response): AuthUser | null => {
    const user = getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: 'Vui lòng đăng nhập bằng tài khoản admin.' });
      return null;
    }
    if (!isRootAdminUsername(user.username) || user.role !== 'admin') {
      res.status(403).json({
        error: 'Chỉ duy nhất tài khoản quản trị gốc (admin) mới có quyền truy cập trang Quản lý tài khoản.',
      });
      return null;
    }
    return user;
  };

  // Authentication endpoints
  app.get('/api/auth/me', (req, res) => {
    res.json({ user: getSessionUser(req) });
  });

  app.post('/api/auth/login', (req, res) => {
    const body = req.body as { username?: string; password?: string };
    const username = normalizeUsername(body.username || '');
    const password = body.password ?? '';

    const store = loadStore();
    const account = store.accounts.find(
      (acc) => normalizeUsername(acc.username) === username && verifyPassword(password, acc.passwordHash),
    );
    if (!account) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }

    const user = toAuthUser(account);
    const sid = crypto.randomBytes(24).toString('hex');
    sessions.set(sid, account.id);
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE}=${encodeURIComponent(sid)}; HttpOnly; Path=/; SameSite=Lax`,
    );
    return res.json({ user });
  });

  app.post('/api/auth/logout', (req, res) => {
    const sid = getSessionId(req);
    if (sid) {
      sessions.delete(sid);
    }
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`,
    );
    return res.json({ ok: true });
  });

  // Account management endpoints (strictly root admin only)
  app.get('/api/accounts', (req, res) => {
    if (!requireRootAdmin(req, res)) return;
    const store = loadStore();
    const sorted = store.accounts
      .slice()
      .sort((a, b) => {
        const aRoot = isRootAdminUsername(a.username) ? 0 : 1;
        const bRoot = isRootAdminUsername(b.username) ? 0 : 1;
        if (aRoot !== bRoot) return aRoot - bRoot;
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      })
      .map(toPublicAccount);
    return res.json({ accounts: sorted });
  });

  app.post('/api/accounts', (req, res) => {
    if (!requireRootAdmin(req, res)) return;
    const body = req.body as Partial<AccountCreateInput>;
    const store = loadStore();

    const validation = validateAccountCreate(body, store.accounts);
    if (!validation.valid) {
      return res.status(400).json({
        error: Object.values(validation.errors)[0] || 'Thông tin tài khoản chưa hợp lệ.',
        errors: validation.errors,
      });
    }

    const nowIso = new Date().toISOString();
    const fullName = body.fullName!.trim();
    const newAccount: AccountRecord = {
      id: `acc-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      username: normalizeUsername(body.username!),
      displayName: formatAccountDisplayTitle(body.role!, fullName),
      fullName,
      dateOfBirth: body.dateOfBirth!.trim(),
      unit: body.unit as FeedbackUnit,
      role: body.role!,
      passwordHash: hashPassword(body.password!),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    store.accounts.push(newAccount);
    saveStore(store);
    return res.status(201).json({ account: toPublicAccount(newAccount) });
  });

  app.patch('/api/accounts/:id', (req, res) => {
    if (!requireRootAdmin(req, res)) return;
    const store = loadStore();
    const idx = store.accounts.findIndex((acc) => acc.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
    }

    const existing = store.accounts[idx];
    const body = req.body as AccountUpdateInput;
    const validation = validateAccountUpdate(existing, body);
    if (!validation.valid) {
      return res.status(400).json({
        error: Object.values(validation.errors)[0] || 'Thông tin cập nhật chưa hợp lệ.',
        errors: validation.errors,
      });
    }

    const nextFullName =
      body.fullName !== undefined ? body.fullName.trim() : existing.fullName;
    const nextRole = body.role !== undefined ? body.role : existing.role;
    const updated: AccountRecord = {
      ...existing,
      fullName: nextFullName,
      displayName: formatAccountDisplayTitle(nextRole, nextFullName),
      dateOfBirth:
        body.dateOfBirth !== undefined ? body.dateOfBirth.trim() : existing.dateOfBirth,
      unit: body.unit !== undefined ? (body.unit as FeedbackUnit) : existing.unit,
      role: nextRole,
      passwordHash:
        body.password !== undefined && body.password !== ''
          ? hashPassword(body.password)
          : existing.passwordHash,
      updatedAt: new Date().toISOString(),
    };

    store.accounts[idx] = updated;
    saveStore(store);
    return res.json({ account: toPublicAccount(updated) });
  });

  app.delete('/api/accounts/:id', (req, res) => {
    if (!requireRootAdmin(req, res)) return;
    const store = loadStore();
    const idx = store.accounts.findIndex((acc) => acc.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
    }

    const target = store.accounts[idx];
    const deleteCheck = canDeleteAccount(target);
    if (!deleteCheck.allowed) {
      return res.status(403).json({ error: deleteCheck.reason });
    }

    store.accounts.splice(idx, 1);
    saveStore(store);

    for (const [sid, accountId] of sessions.entries()) {
      if (accountId === target.id) {
        sessions.delete(sid);
      }
    }

    return res.json({ ok: true, deletedId: target.id });
  });

  // List surveys with response counts
  app.get('/api/surveys', (_req, res) => {
    const store = loadStore();
    const now = Date.now();
    const items = store.surveys
      .slice()
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map((survey) => {
        const responseCount = store.responses.filter((r) => r.surveyId === survey.id).length;
        return {
          ...survey,
          responseCount,
          computedStatus: getSurveyStatus(survey, now),
        };
      });
    res.json({ surveys: items });
  });

  // Get single survey
  app.get('/api/surveys/:id', (req, res) => {
    const store = loadStore();
    const survey = store.surveys.find((s) => s.id === req.params.id);
    if (!survey) {
      return res.status(404).json({ error: 'Không tìm thấy phiếu khảo sát.' });
    }
    const responseCount = store.responses.filter((r) => r.surveyId === survey.id).length;
    res.json({
      survey,
      responseCount,
      computedStatus: getSurveyStatus(survey),
    });
  });

  // Create new survey
  app.post('/api/surveys', (req, res) => {
    const draft = req.body as SurveyDraft;
    const validation = validateSurveyDraft(draft);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Thông tin khảo sát chưa đầy đủ hoặc không hợp lệ.',
        errors: validation.errors,
      });
    }

    const store = loadStore();
    const nowIso = new Date().toISOString();
    const id = `srv-${Date.now()}`;
    const code = `KS-${new Date().getFullYear()}-${String(store.surveys.length + 1).padStart(2, '0')}`;

    const newSurvey: Survey = {
      id,
      code,
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
    return res.status(201).json({ survey: newSurvey });
  });

  // Toggle manual lock
  app.post('/api/surveys/:id/toggle-lock', (req, res) => {
    const store = loadStore();
    const idx = store.surveys.findIndex((s) => s.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Không tìm thấy phiếu khảo sát.' });
    }
    store.surveys[idx].manualLocked = !store.surveys[idx].manualLocked;
    saveStore(store);
    return res.json({
      survey: store.surveys[idx],
      computedStatus: getSurveyStatus(store.surveys[idx]),
    });
  });

  // Submit survey response
  app.post('/api/surveys/:id/responses', (req, res) => {
    const store = loadStore();
    const survey = store.surveys.find((s) => s.id === req.params.id);
    if (!survey) {
      return res.status(404).json({ error: 'Không tìm thấy phiếu khảo sát.' });
    }

    const body = req.body as {
      answers: SurveyAnswerValue[];
      respondentName?: string;
      respondentUnit?: string;
    };

    const answersMap: Record<string, SurveyAnswerValue> = {};
    for (const ans of body.answers ?? []) {
      answersMap[ans.questionId] = ans;
    }

    const validation = validateSurveySubmission(
      survey,
      answersMap,
      { name: body.respondentName, unit: body.respondentUnit },
      Date.now(),
    );

    if (!validation.valid) {
      return res.status(400).json({
        error: validation.errors.survey || 'Vui lòng hoàn thành các câu hỏi bắt buộc.',
        errors: validation.errors,
      });
    }

    const sanitized = buildSanitizedResponse(
      survey,
      body.answers ?? [],
      { name: body.respondentName, unit: body.respondentUnit },
      `res-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      generateShortCode('PH'),
      new Date().toISOString(),
    );

    store.responses.push(sanitized);
    saveStore(store);
    return res.status(201).json({
      receiptCode: sanitized.receiptCode,
      submittedAt: sanitized.submittedAt,
      isAnonymous: survey.isAnonymous,
    });
  });

  // Get aggregated report for a survey
  app.get('/api/surveys/:id/report', (req, res) => {
    const store = loadStore();
    const survey = store.surveys.find((s) => s.id === req.params.id);
    if (!survey) {
      return res.status(404).json({ error: 'Không tìm thấy phiếu khảo sát.' });
    }
    const unitFilter = typeof req.query.unit === 'string' ? req.query.unit.trim() : '';
    const allSurveyResponses = store.responses.filter((r) => r.surveyId === survey.id);
    const filteredResponses = unitFilter
      ? allSurveyResponses.filter((r) => (r.respondentUnit || 'Không phân định đơn vị') === unitFilter)
      : allSurveyResponses;

    const report = aggregateSurveyReport(survey, filteredResponses);
    const availableReportUnits = Array.from(
      new Set(allSurveyResponses.map((r) => r.respondentUnit || 'Không phân định đơn vị')),
    );

    return res.json({
      survey,
      computedStatus: getSurveyStatus(survey),
      report,
      availableReportUnits,
    });
  });

  // Direct feedback endpoints
  app.get('/api/feedback/summary', (_req, res) => {
    const store = loadStore();
    const byUnit: Record<string, number> = {};
    for (const unit of FEEDBACK_UNITS) {
      byUnit[unit] = 0;
    }
    for (const item of store.feedback) {
      byUnit[item.targetUnit] = (byUnit[item.targetUnit] ?? 0) + 1;
    }
    res.json({ total: store.feedback.length, byUnit });
  });

  app.get('/api/feedback', (req, res) => {
    if (!requireFeedbackAccess(req, res)) return;
    const store = loadStore();
    const sorted = store.feedback
      .slice()
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    res.json({ feedback: sorted });
  });

  app.post('/api/feedback', (req, res) => {
    const body = req.body as {
      category?: string;
      targetUnit?: string;
      isAnonymous?: boolean;
      senderName?: string;
      subject?: string;
      content?: string;
    };

    const sessionUser = getSessionUser(req);
    const isAnon = Boolean(body.isAnonymous);
    const unit = body.targetUnit?.trim() || '';

    if (sessionUser?.role === 'soldier' && unit !== sessionUser.unit) {
      const msg = `Tài khoản Chiến sĩ chỉ được đóng góp ý kiến cho đơn vị trong tài khoản (${sessionUser.unit}).`;
      return res.status(403).json({
        error: msg,
        errors: { targetUnit: msg },
      });
    }

    const effectiveSenderName = isAnon
      ? undefined
      : sessionUser
        ? formatAccountDisplayTitle(sessionUser.role, sessionUser.fullName)
        : body.senderName?.trim();
    const errors: Record<string, string> = {};

    if (!FEEDBACK_UNITS.includes(unit as (typeof FEEDBACK_UNITS)[number])) {
      errors.targetUnit = 'Vui lòng chọn đơn vị góp ý (Đại đội 1, Đại đội 104 hoặc Đại đội 102).';
    }
    if (!body.content?.trim()) {
      errors.content = 'Vui lòng nhập nội dung góp ý.';
    }
    if (!isAnon && !effectiveSenderName) {
      errors.senderName = 'Vui lòng nhập họ tên hoặc chọn chế độ Ẩn danh.';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Dữ liệu chưa hợp lệ.', errors });
    }

    const store = loadStore();
    const entry: FeedbackEntry = {
      id: `fb-${Date.now()}`,
      receiptCode: generateShortCode('YK'),
      category: body.category?.trim() || undefined,
      targetUnit: unit,
      isAnonymous: isAnon,
      senderName: effectiveSenderName,
      subject: body.subject?.trim() || undefined,
      content: body.content!.trim(),
      createdAt: new Date().toISOString(),
      status: 'received',
    };

    store.feedback.unshift(entry);
    saveStore(store);
    return res.status(201).json({ entry });
  });

  app.patch('/api/feedback/:id', (req, res) => {
    if (!requireFeedbackAccess(req, res)) return;
    const store = loadStore();
    const idx = store.feedback.findIndex((f) => f.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Không tìm thấy phản ánh.' });
    }
    store.feedback[idx].status =
      store.feedback[idx].status === 'received' ? 'reviewed' : 'received';
    saveStore(store);
    return res.json({ entry: store.feedback[idx] });
  });

  app.delete('/api/feedback', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const store = loadStore();
    const deletedCount = store.feedback.length;
    store.feedback = [];
    saveStore(store);
    return res.json({ ok: true, deletedCount });
  });

  // Vite or static serving
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
