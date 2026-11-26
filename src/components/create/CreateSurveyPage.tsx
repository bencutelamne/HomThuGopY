import { ArrowDown, ArrowUp, Eye, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { createSurvey } from '../../api/client';
import {
  getQuestionTypeLabel,
  toVietnamInputParts,
  validateSurveyDraft,
} from '../../lib/surveyLogic';
import {
  AVAILABLE_UNITS,
  type QuestionType,
  type Survey,
  type SurveyDraft,
  type SurveyQuestion,
} from '../../types/survey';

interface CreateSurveyPageProps {
  onCreated: (survey: Survey) => void;
  onCancel: () => void;
}

function makeDefaultQuestion(type: QuestionType, order: number): SurveyQuestion {
  const id = `q-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  if (type === 'open_text') {
    return {
      id,
      order,
      type,
      prompt: '',
      required: false,
      options: [],
      placeholder: 'Đồng chí ghi rõ ý kiến đóng góp cụ thể...',
    };
  }
  return {
    id,
    order,
    type,
    prompt: '',
    required: true,
    options: ['Phương án 1', 'Phương án 2'],
  };
}

export function CreateSurveyPage({ onCreated, onCancel }: CreateSurveyPageProps) {
  const nowParts = toVietnamInputParts(new Date().toISOString());
  const nextWeekParts = toVietnamInputParts(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  );

  const [draft, setDraft] = useState<SurveyDraft>({
    title: '',
    purpose: '',
    instructions:
      'Đồng chí vui lòng đọc kỹ từng câu hỏi trước khi trả lời. Kết quả khảo sát được tổng hợp phục vụ công tác lãnh đạo, chỉ huy và bảo mật ẩn danh tuyệt đối.',
    startDate: nowParts.date || '2026-11-26',
    startTime: '07:00',
    endDate: nextWeekParts.date || '2026-12-03',
    endTime: '17:00',
    targetScope: 'all',
    targetUnits: [],
    isAnonymous: true,
    questions: [
      {
        id: 'q-init-1',
        order: 1,
        type: 'single_choice',
        prompt: 'Đánh giá chung về công tác tổ chức thực hiện nhiệm vụ tại đơn vị:',
        required: true,
        options: ['Rất tốt', 'Tốt', 'Trung bình', 'Cần cải thiện'],
      },
      {
        id: 'q-init-2',
        order: 2,
        type: 'multiple_choice',
        prompt: 'Những nội dung công tác cần ưu tiên nâng cao chất lượng trong thời gian tới:',
        required: true,
        options: [
          'Công tác bảo vệ an ninh, bí mật quân sự',
          'Duy trì nền nếp chính quy, kỷ luật',
          'Bảo đảm đời sống, chế độ tiêu chuẩn',
        ],
      },
      {
        id: 'q-init-3',
        order: 3,
        type: 'open_text',
        prompt: 'Ý kiến đề xuất, kiến nghị của đồng chí đối với cấp ủy, chỉ huy đơn vị:',
        required: false,
        options: [],
        placeholder: 'Đồng chí ghi rõ ý kiến đóng góp cụ thể...',
      },
    ],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const toggleUnit = (unit: string) => {
    setDraft((prev) => {
      const exists = prev.targetUnits.includes(unit);
      return {
        ...prev,
        targetUnits: exists
          ? prev.targetUnits.filter((u) => u !== unit)
          : [...prev.targetUnits, unit],
      };
    });
  };

  const addQuestion = (type: QuestionType) => {
    setDraft((prev) => ({
      ...prev,
      questions: [...prev.questions, makeDefaultQuestion(type, prev.questions.length + 1)],
    }));
  };

  const updateQuestion = (id: string, patch: Partial<SurveyQuestion>) => {
    setDraft((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    }));
  };

  const moveQuestion = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= draft.questions.length) return;
    setDraft((prev) => {
      const next = [...prev.questions];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return {
        ...prev,
        questions: next.map((q, i) => ({ ...q, order: i + 1 })),
      };
    });
  };

  const removeQuestion = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      questions: prev.questions
        .filter((q) => q.id !== id)
        .map((q, i) => ({ ...q, order: i + 1 })),
    }));
  };

  const addOption = (questionId: string) => {
    setDraft((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId
          ? { ...q, options: [...q.options, `Phương án ${q.options.length + 1}`] }
          : q,
      ),
    }));
  };

  const updateOption = (questionId: string, optIdx: number, val: string) => {
    setDraft((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((opt, idx) => (idx === optIdx ? val : opt)),
            }
          : q,
      ),
    }));
  };

  const removeOption = (questionId: string, optIdx: number) => {
    setDraft((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId
          ? { ...q, options: q.options.filter((_, idx) => idx !== optIdx) }
          : q,
      ),
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const check = validateSurveyDraft(draft);
    setErrors(check.errors);
    if (!check.valid) {
      setSubmitError('Vui lòng kiểm tra lại các trường thông tin còn thiếu hoặc chưa hợp lệ.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createSurvey(draft);
      onCreated(created);
    } catch (err) {
      const e2 = err as Error & { fieldErrors?: Record<string, string> };
      if (e2.fieldErrors) setErrors(e2.fieldErrors);
      setSubmitError(e2.message || 'Không thể phát hành khảo sát.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1160px] px-4 py-8 sm:px-5 lg:px-6 lg:py-12">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Biên soạn &amp; triển khai phiếu trực tuyến
          </p>
          <h1 className="font-display mt-1 text-3xl font-extrabold uppercase tracking-tight text-[var(--color-text)] sm:text-5xl">
            Tạo Khảo Sát Trực Tuyến Mới
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setShowPreview((p) => !p)}
          className="btn-editorial-outline inline-flex min-h-[42px] items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider whitespace-nowrap self-start sm:self-auto cursor-pointer"
        >
          <Eye className="h-4 w-4" />
          <span>{showPreview ? 'Quay lại trình soạn' : 'Xem trước phiếu'}</span>
        </button>
      </div>

      {showPreview ? (
        <div className="mt-8 border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Bản xem trước giao diện người trả lời
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[var(--color-text)]">
            {draft.title || '(Chưa nhập tên khảo sát)'}
          </h2>
          <div className="mt-4 space-y-2 border-y border-[var(--color-border-soft)] py-4 text-sm text-[var(--color-text)]">
            <p>
              <strong className="font-semibold">Mục đích:</strong>{' '}
              {draft.purpose || '(Chưa nhập mục đích khảo sát)'}
            </p>
            <p>
              <strong className="font-semibold">Hướng dẫn:</strong> {draft.instructions}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Chế độ:{' '}
              {draft.isAnonymous
                ? 'Khảo sát ẩn danh tuyệt đối (Không lưu danh tính)'
                : 'Khảo sát có định danh'}
              {' · '}
              Phạm vi:{' '}
              {draft.targetScope === 'all'
                ? 'Toàn hệ thống'
                : draft.targetUnits.join(', ') || 'Chưa chọn đơn vị'}
            </p>
          </div>

          <div className="mt-6 space-y-6">
            {draft.questions.map((q, i) => (
              <div key={q.id} className="border-b border-[var(--color-border-soft)] pb-5 last:border-b-0">
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  Câu {i + 1}: {q.prompt || '(Chưa nhập nội dung câu hỏi)'}{' '}
                  {q.required && <span className="text-[var(--color-status-closed)]">*</span>}
                </p>
                {q.type === 'open_text' ? (
                  <textarea
                    disabled
                    rows={3}
                    placeholder={q.placeholder || 'Đồng chí ghi rõ ý kiến đóng góp cụ thể...'}
                    className="mt-3 w-full border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-sm"
                  />
                ) : (
                  <div className="mt-3 space-y-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-3 text-sm text-[var(--color-text)]">
                        <input
                          type={q.type === 'single_choice' ? 'radio' : 'checkbox'}
                          disabled
                          className="h-4 w-4 accent-[var(--color-text)]"
                        />
                        <span>{opt}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-10">
          {/* SECTION 1: THÔNG TIN CHUNG — matching Reference 1 */}
          <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text)]">
              1. THÔNG TIN CHUNG
            </h2>

            <div className="mt-6 space-y-6">
              {/* Tên khảo sát * */}
              <div>
                <label
                  htmlFor="survey-title"
                  className="block text-sm font-semibold text-[var(--color-text)]"
                >
                  Tên khảo sát <span className="text-[var(--color-status-closed)]">*</span>
                </label>
                <input
                  id="survey-title"
                  type="text"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Ví dụ: Khảo sát chất lượng sinh hoạt tư tưởng tháng 11..."
                  className="mt-2 min-h-[44px] w-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
                />
                {errors.title && (
                  <p className="mt-1.5 text-xs font-medium text-[var(--color-status-closed)]">
                    {errors.title}
                  </p>
                )}
              </div>

              {/* Mục đích khảo sát * */}
              <div>
                <label
                  htmlFor="survey-purpose"
                  className="block text-sm font-semibold text-[var(--color-text)]"
                >
                  Mục đích khảo sát <span className="text-[var(--color-status-closed)]">*</span>
                </label>
                <textarea
                  id="survey-purpose"
                  rows={3}
                  value={draft.purpose}
                  onChange={(e) => setDraft({ ...draft, purpose: e.target.value })}
                  placeholder="Nêu rõ mục đích nắm tình hình, đánh giá kết quả thực hiện nhiệm vụ hoặc lắng nghe tâm tư nguyện vọng..."
                  className="mt-2 w-full border border-[var(--color-border)] bg-[var(--color-bg)] p-3.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
                />
                {errors.purpose && (
                  <p className="mt-1.5 text-xs font-medium text-[var(--color-status-closed)]">
                    {errors.purpose}
                  </p>
                )}
              </div>

              {/* Hướng dẫn */}
              <div>
                <label
                  htmlFor="survey-instructions"
                  className="block text-sm font-semibold text-[var(--color-text)]"
                >
                  Hướng dẫn trả lời
                </label>
                <textarea
                  id="survey-instructions"
                  rows={2}
                  value={draft.instructions}
                  onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
                  className="mt-2 w-full border border-[var(--color-border)] bg-[var(--color-bg)] p-3.5 text-sm text-[var(--color-text)]"
                />
              </div>

              {/* Thời gian bắt đầu & kết thúc (Giờ Việt Nam) */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="border border-[var(--color-border-soft)] bg-[var(--color-bg)] p-4">
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    Thời gian bắt đầu <span className="text-[var(--color-status-closed)]">*</span>{' '}
                    <span className="font-normal text-[var(--color-text-muted)]">(Giờ Việt Nam)</span>
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="start-date" className="sr-only">
                        Ngày bắt đầu
                      </label>
                      <input
                        id="start-date"
                        type="date"
                        value={draft.startDate}
                        onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                        className="font-mono-tabular min-h-[44px] w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)]"
                      />
                    </div>
                    <div>
                      <label htmlFor="start-time" className="sr-only">
                        Giờ bắt đầu
                      </label>
                      <input
                        id="start-time"
                        type="time"
                        value={draft.startTime}
                        onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
                        className="font-mono-tabular min-h-[44px] w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)]"
                      />
                    </div>
                  </div>
                  {errors.startTime && (
                    <p className="mt-1.5 text-xs font-medium text-[var(--color-status-closed)]">
                      {errors.startTime}
                    </p>
                  )}
                </div>

                <div className="border border-[var(--color-border-soft)] bg-[var(--color-bg)] p-4">
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    Thời gian kết thúc <span className="text-[var(--color-status-closed)]">*</span>{' '}
                    <span className="font-normal text-[var(--color-text-muted)]">
                      (Tự động khóa &amp; gửi báo cáo)
                    </span>
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="end-date" className="sr-only">
                        Ngày kết thúc
                      </label>
                      <input
                        id="end-date"
                        type="date"
                        value={draft.endDate}
                        onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
                        className="font-mono-tabular min-h-[44px] w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)]"
                      />
                    </div>
                    <div>
                      <label htmlFor="end-time" className="sr-only">
                        Giờ kết thúc
                      </label>
                      <input
                        id="end-time"
                        type="time"
                        value={draft.endTime}
                        onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
                        className="font-mono-tabular min-h-[44px] w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)]"
                      />
                    </div>
                  </div>
                  {errors.endTime && (
                    <p className="mt-1.5 text-xs font-medium text-[var(--color-status-closed)]">
                      {errors.endTime}
                    </p>
                  )}
                </div>
              </div>

              {/* Đối tượng tham gia & Chế độ bảo mật danh tính */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    Đối tượng tham gia khảo sát{' '}
                    <span className="text-[var(--color-status-closed)]">*</span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-6">
                    <label className="inline-flex min-h-[44px] items-center gap-2.5 text-sm text-[var(--color-text)] cursor-pointer">
                      <input
                        type="radio"
                        name="targetScope"
                        checked={draft.targetScope === 'all'}
                        onChange={() => setDraft({ ...draft, targetScope: 'all', targetUnits: [] })}
                        className="h-4 w-4 accent-[var(--color-text)]"
                      />
                      <span>Toàn hệ thống</span>
                    </label>

                    <label className="inline-flex min-h-[44px] items-center gap-2.5 text-sm text-[var(--color-text)] cursor-pointer">
                      <input
                        type="radio"
                        name="targetScope"
                        checked={draft.targetScope === 'specific_units'}
                        onChange={() => setDraft({ ...draft, targetScope: 'specific_units' })}
                        className="h-4 w-4 accent-[var(--color-text)]"
                      />
                      <span>Chọn đơn vị cụ thể</span>
                    </label>
                  </div>

                  {draft.targetScope === 'specific_units' && (
                    <div className="mt-3 border border-[var(--color-border-soft)] bg-[var(--color-bg)] p-3.5">
                      <p className="text-xs font-medium text-[var(--color-text-muted)]">
                        Chọn các đơn vị tham gia:
                      </p>
                      <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {AVAILABLE_UNITS.map((unit) => (
                          <label
                            key={unit}
                            className="inline-flex min-h-[38px] items-center gap-2 text-xs text-[var(--color-text)] cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={draft.targetUnits.includes(unit)}
                              onChange={() => toggleUnit(unit)}
                              className="h-4 w-4 accent-[var(--color-text)]"
                            />
                            <span>{unit}</span>
                          </label>
                        ))}
                      </div>
                      {errors.targetUnits && (
                        <p className="mt-2 text-xs font-medium text-[var(--color-status-closed)]">
                          {errors.targetUnits}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    Chế độ bảo mật danh tính
                  </p>
                  <label className="mt-3 flex items-start gap-3 border border-[var(--color-border)] bg-[var(--color-bg)] p-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.isAnonymous}
                      onChange={(e) => setDraft({ ...draft, isAnonymous: e.target.checked })}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-text)]"
                    />
                    <div>
                      <span className="block text-sm font-semibold text-[var(--color-text)]">
                        Khảo sát ẩn danh (Khuyến nghị)
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-[var(--color-text-muted)]">
                        Không lưu danh tính người trả lời, cán bộ chiến sĩ an tâm phản ánh trung thực.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: NỘI DUNG CÂU HỎI (3 LOẠI CÂU HỎI) */}
          <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
            <div className="flex flex-col gap-4 border-b border-[var(--color-border-soft)] pb-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text)]">
                  2. CÂU HỎI KHẢO SÁT (3 LOẠI CÂU HỎI)
                </h2>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Thêm, chỉnh sửa và sắp xếp thứ tự câu hỏi trắc nghiệm 1 đáp án, chọn nhiều đáp án hoặc ý kiến tự luận.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => addQuestion('single_choice')}
                  className="btn-editorial-outline inline-flex min-h-[40px] items-center gap-1.5 px-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Chọn 1 đáp án</span>
                </button>
                <button
                  type="button"
                  onClick={() => addQuestion('multiple_choice')}
                  className="btn-editorial-outline inline-flex min-h-[40px] items-center gap-1.5 px-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Chọn nhiều đáp án</span>
                </button>
                <button
                  type="button"
                  onClick={() => addQuestion('open_text')}
                  className="btn-editorial-outline inline-flex min-h-[40px] items-center gap-1.5 px-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Ý kiến tự luận</span>
                </button>
              </div>
            </div>

            {errors.questions && (
              <p className="mt-4 text-xs font-medium text-[var(--color-status-closed)]">
                {errors.questions}
              </p>
            )}

            <div className="mt-6 space-y-6">
              {draft.questions.map((question, qIndex) => (
                <div
                  key={question.id}
                  className="border border-[var(--color-border-soft)] bg-[var(--color-bg)] p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-soft)] pb-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono-tabular text-xs font-bold uppercase text-[var(--color-text)]">
                        Câu {qIndex + 1}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        · {getQuestionTypeLabel(question.type)}
                      </span>
                      <label className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={question.required}
                          onChange={(e) =>
                            updateQuestion(question.id, { required: e.target.checked })
                          }
                          className="h-3.5 w-3.5 accent-[var(--color-text)]"
                        />
                        <span>Bắt buộc</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={`Di chuyển câu ${qIndex + 1} lên`}
                        disabled={qIndex === 0}
                        onClick={() => moveQuestion(qIndex, -1)}
                        className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center border border-[var(--color-border-soft)] bg-[var(--color-surface)] disabled:opacity-35 cursor-pointer"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Di chuyển câu ${qIndex + 1} xuống`}
                        disabled={qIndex === draft.questions.length - 1}
                        onClick={() => moveQuestion(qIndex, 1)}
                        className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center border border-[var(--color-border-soft)] bg-[var(--color-surface)] disabled:opacity-35 cursor-pointer"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Xóa câu ${qIndex + 1}`}
                        onClick={() => removeQuestion(question.id)}
                        className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center border border-[var(--color-border-soft)] bg-[var(--color-surface)] text-[var(--color-status-closed)] hover:bg-[var(--color-status-closed)] hover:text-white cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label
                      htmlFor={`q-prompt-${question.id}`}
                      className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]"
                    >
                      Nội dung câu hỏi
                    </label>
                    <input
                      id={`q-prompt-${question.id}`}
                      type="text"
                      value={question.prompt}
                      onChange={(e) => updateQuestion(question.id, { prompt: e.target.value })}
                      placeholder="Nhập nội dung câu hỏi..."
                      className="mt-1.5 min-h-[42px] w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)]"
                    />
                    {errors[`question_${question.id}`] && (
                      <p className="mt-1 text-xs font-medium text-[var(--color-status-closed)]">
                        {errors[`question_${question.id}`]}
                      </p>
                    )}
                  </div>

                  {question.type === 'open_text' ? (
                    <div className="mt-4">
                      <label
                        htmlFor={`q-ph-${question.id}`}
                        className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]"
                      >
                        Văn bản gợi ý trong ô nhập
                      </label>
                      <input
                        id={`q-ph-${question.id}`}
                        type="text"
                        value={question.placeholder ?? ''}
                        onChange={(e) =>
                          updateQuestion(question.id, { placeholder: e.target.value })
                        }
                        placeholder="Đồng chí ghi rõ ý kiến đóng góp cụ thể..."
                        className="mt-1.5 min-h-[40px] w-full border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-3 text-xs text-[var(--color-text)]"
                      />
                    </div>
                  ) : (
                    <div className="mt-4 space-y-2.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                        Danh sách phương án trả lời
                      </p>
                      {question.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <span className="font-mono-tabular w-6 text-xs text-[var(--color-text-muted)]">
                            {optIdx + 1}.
                          </span>
                          <input
                            type="text"
                            aria-label={`Câu ${qIndex + 1} phương án ${optIdx + 1}`}
                            value={opt}
                            onChange={(e) => updateOption(question.id, optIdx, e.target.value)}
                            className="min-h-[40px] flex-1 border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)]"
                          />
                          <button
                            type="button"
                            aria-label={`Xóa phương án ${optIdx + 1}`}
                            disabled={question.options.length <= 2}
                            onClick={() => removeOption(question.id, optIdx)}
                            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center border border-[var(--color-border-soft)] bg-[var(--color-surface)] text-xs text-[var(--color-text-muted)] disabled:opacity-35 cursor-pointer"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {errors[`question_opts_${question.id}`] && (
                        <p className="text-xs font-medium text-[var(--color-status-closed)]">
                          {errors[`question_opts_${question.id}`]}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => addOption(question.id)}
                        className="mt-1 inline-flex min-h-[36px] items-center gap-1.5 border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-text)] hover:border-[var(--color-text)] cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Thêm phương án</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {submitError && (
            <div
              role="alert"
              className="border border-[var(--color-status-closed)] bg-[var(--color-surface)] p-4 text-sm font-medium text-[var(--color-status-closed)]"
            >
              {submitError}
            </div>
          )}

          {/* Footer actions */}
          <div className="flex flex-col-reverse gap-3 border-t border-[var(--color-border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onCancel}
              className="btn-editorial-outline min-h-[44px] px-5 py-2.5 text-xs font-semibold uppercase tracking-wider cursor-pointer"
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="btn-editorial-primary min-h-[46px] px-7 py-3 text-xs font-semibold uppercase tracking-wider disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Đang phát hành...' : 'Phát hành khảo sát'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
