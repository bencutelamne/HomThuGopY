import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { SEED_FEEDBACK, SEED_RESPONSES, SEED_SURVEYS } from './src/data/seedData';
import {
  aggregateSurveyReport,
  buildSanitizedResponse,
  fromVietnamInputParts,
  getSurveyStatus,
  validateSurveyDraft,
  validateSurveySubmission,
} from './src/lib/surveyLogic';
import type {
  FeedbackEntry,
  Survey,
  SurveyAnswerValue,
  SurveyDraft,
  SurveyResponse,
} from './src/types/survey';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

interface StoreData {
  surveys: Survey[];
  responses: SurveyResponse[];
  feedback: FeedbackEntry[];
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
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as StoreData;
    return {
      surveys: Array.isArray(parsed.surveys) ? parsed.surveys : SEED_SURVEYS,
      responses: Array.isArray(parsed.responses) ? parsed.responses : SEED_RESPONSES,
      feedback: Array.isArray(parsed.feedback) ? parsed.feedback : SEED_FEEDBACK,
    };
  } catch {
    return {
      surveys: SEED_SURVEYS,
      responses: SEED_RESPONSES,
      feedback: SEED_FEEDBACK,
    };
  }
}

function saveStore(data: StoreData): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function generateShortCode(prefix: string): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${rand}`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

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
  app.get('/api/feedback', (_req, res) => {
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

    const errors: Record<string, string> = {};
    if (!body.subject?.trim()) errors.subject = 'Vui lòng nhập tiêu đề ý kiến.';
    if (!body.content?.trim()) errors.content = 'Vui lòng nhập nội dung ý kiến, nguyện vọng.';
    if (!body.isAnonymous && !body.senderName?.trim()) {
      errors.senderName = 'Vui lòng nhập họ tên nếu không chọn gửi ẩn danh.';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Dữ liệu chưa hợp lệ.', errors });
    }

    const store = loadStore();
    const isAnon = body.isAnonymous !== false;
    const entry: FeedbackEntry = {
      id: `fb-${Date.now()}`,
      receiptCode: generateShortCode('YK'),
      category: body.category?.trim() || 'Công tác tư tưởng & Sinh hoạt đơn vị',
      targetUnit: body.targetUnit?.trim() || 'Toàn hệ thống',
      isAnonymous: isAnon,
      senderName: isAnon ? undefined : body.senderName?.trim(),
      subject: body.subject!.trim(),
      content: body.content!.trim(),
      createdAt: new Date().toISOString(),
      status: 'received',
    };

    store.feedback.unshift(entry);
    saveStore(store);
    return res.status(201).json({ entry });
  });

  app.patch('/api/feedback/:id', (req, res) => {
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
