import { BarChart3, Check, Copy, Lock, ShieldCheck } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { submitSurveyResponse, type SurveyListItem } from '../../api/client';
import {
  formatVietnamDateTime,
  getStatusLabel,
  validateSurveySubmission,
} from '../../lib/surveyLogic';
import { AVAILABLE_UNITS, type SurveyAnswerValue } from '../../types/survey';

interface TakeSurveyPageProps {
  surveys: SurveyListItem[];
  selectedSurveyId: string | null;
  onSelectSurvey: (id: string) => void;
  onSubmitted: () => Promise<void>;
  onOpenReport: (surveyId: string) => void;
}

export function TakeSurveyPage({
  surveys,
  selectedSurveyId,
  onSelectSurvey,
  onSubmitted,
  onOpenReport,
}: TakeSurveyPageProps) {
  const activeSurvey =
    surveys.find((s) => s.id === selectedSurveyId) ??
    surveys.find((s) => s.computedStatus === 'active') ??
    surveys[0];

  const [answers, setAnswers] = useState<Record<string, SurveyAnswerValue>>({});
  const [respondentName, setRespondentName] = useState('');
  const [respondentUnit, setRespondentUnit] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<{
    receiptCode: string;
    submittedAt: string;
    isAnonymous: boolean;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setAnswers({});
    setRespondentName('');
    setRespondentUnit('');
    setErrors({});
    setSubmitError(null);
    setReceipt(null);
  }, [activeSurvey?.id]);

  if (!activeSurvey) {
    return (
      <div className="mx-auto max-w-[960px] px-4 py-12 sm:px-6">
        <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
          <p className="text-base font-semibold">Hiện chưa có phiếu khảo sát nào trong hệ thống.</p>
        </div>
      </div>
    );
  }

  const unitChoices =
    activeSurvey.targetScope === 'specific_units' && activeSurvey.targetUnits.length > 0
      ? activeSurvey.targetUnits
      : AVAILABLE_UNITS;

  const isLocked = activeSurvey.computedStatus !== 'active';

  const handleSingleChange = (questionId: string, option: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { questionId, selectedOptions: [option] },
    }));
  };

  const handleMultiToggle = (questionId: string, option: string) => {
    setAnswers((prev) => {
      const current = prev[questionId]?.selectedOptions ?? [];
      const exists = current.includes(option);
      const next = exists ? current.filter((o) => o !== option) : [...current, option];
      return {
        ...prev,
        [questionId]: { questionId, selectedOptions: next },
      };
    });
  };

  const handleTextChange = (questionId: string, textValue: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { questionId, textValue },
    }));
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/?view=take&id=${encodeURIComponent(activeSurvey.id)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard fallback
    }
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const validation = validateSurveySubmission(
      activeSurvey,
      answers,
      { name: respondentName, unit: respondentUnit },
      Date.now(),
    );
    setErrors(validation.errors);
    if (!validation.valid) {
      setSubmitError(
        validation.errors.survey || 'Vui lòng hoàn thành đầy đủ các câu hỏi bắt buộc trước khi gửi.',
      );
      return;
    }

    setSubmitting(true);
    try {
      const payloadAnswers = activeSurvey.questions.map(
        (q) => answers[q.id] ?? { questionId: q.id },
      );
      const res = await submitSurveyResponse(activeSurvey.id, {
        answers: payloadAnswers,
        respondentName: activeSurvey.isAnonymous ? undefined : respondentName,
        respondentUnit: respondentUnit || undefined,
      });
      setReceipt(res);
      await onSubmitted();
    } catch (err) {
      const e2 = err as Error & { fieldErrors?: Record<string, string> };
      if (e2.fieldErrors) setErrors(e2.fieldErrors);
      setSubmitError(e2.message || 'Không thể gửi phiếu khảo sát.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[980px] px-4 py-8 sm:px-5 lg:px-6 lg:py-12">
      {/* Survey Switcher Bar */}
      <div className="flex flex-col gap-3 border-b border-[var(--color-border)] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <label
            htmlFor="take-survey-select"
            className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]"
          >
            Chọn phiếu khảo sát
          </label>
          <select
            id="take-survey-select"
            value={activeSurvey.id}
            onChange={(e) => onSelectSurvey(e.target.value)}
            className="mt-1.5 min-h-[42px] w-full max-w-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-text)]"
          >
            {surveys.map((s) => (
              <option key={s.id} value={s.id}>
                [{s.code}] {s.title} — {getStatusLabel(s.computedStatus)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-end">
          <button
            type="button"
            onClick={handleCopyLink}
            className="btn-editorial-outline inline-flex min-h-[42px] items-center gap-1.5 px-3.5 py-2 text-xs font-semibold whitespace-nowrap cursor-pointer"
          >
            {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedLink ? 'Đã sao chép liên kết' : 'Chia sẻ liên kết'}</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenReport(activeSurvey.id)}
            className="btn-editorial-outline inline-flex min-h-[42px] items-center gap-1.5 px-3.5 py-2 text-xs font-semibold whitespace-nowrap cursor-pointer"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Xem báo cáo</span>
          </button>
        </div>
      </div>

      {/* Survey Document Header — matching Reference 2 */}
      <article className="mt-8 border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-8">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-text-muted)]">
          <span className="font-mono-tabular font-semibold text-[var(--color-text)]">
            {activeSurvey.code}
          </span>
          <span aria-hidden="true">·</span>
          <span
            className={`font-semibold ${
              activeSurvey.computedStatus === 'active'
                ? 'text-[var(--color-status-active)]'
                : activeSurvey.computedStatus === 'upcoming'
                  ? 'text-[var(--color-status-warning)]'
                  : 'text-[var(--color-status-closed)]'
            }`}
          >
            {getStatusLabel(activeSurvey.computedStatus)}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular">
            {formatVietnamDateTime(activeSurvey.startTime)} →{' '}
            {formatVietnamDateTime(activeSurvey.endTime)} (Giờ VN)
          </span>
        </div>

        <h1 className="mt-3 text-2xl font-extrabold leading-tight text-[var(--color-text)] sm:text-3xl">
          {activeSurvey.title}
        </h1>

        <div className="mt-5 space-y-3 border-y border-[var(--color-border-soft)] py-4 text-sm leading-relaxed text-[var(--color-text)]">
          <p>
            <strong className="font-bold">Mục đích:</strong> {activeSurvey.purpose}
          </p>
          <p>
            <strong className="font-bold">Hướng dẫn:</strong> {activeSurvey.instructions}
          </p>
        </div>

        {/* Locked / Upcoming Alert */}
        {isLocked && (
          <div className="mt-6 flex flex-col gap-3 border border-[var(--color-status-closed)] bg-[var(--color-bg)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-status-closed)]" />
              <div className="text-sm">
                <p className="font-semibold text-[var(--color-status-closed)]">
                  {activeSurvey.computedStatus === 'upcoming'
                    ? 'Cuộc khảo sát chưa đến giờ mở tiếp nhận phiếu.'
                    : 'Cuộc khảo sát đã tự động khóa và tổng hợp kết quả.'}
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  Hệ thống chỉ tiếp nhận phản hồi trong khung thời gian hiệu lực đã cấu hình.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenReport(activeSurvey.id)}
              className="btn-editorial-primary min-h-[40px] px-4 py-2 text-xs font-semibold uppercase tracking-wider whitespace-nowrap shrink-0 cursor-pointer"
            >
              Xem báo cáo tổng hợp
            </button>
          </div>
        )}

        {/* Receipt Confirmation State */}
        {receipt ? (
          <div className="mt-6 border border-[var(--color-status-active)] bg-[var(--color-bg)] p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-status-active)]">
              Ghi nhận thành công
            </p>
            <h2 className="mt-1 text-xl font-bold text-[var(--color-text)]">
              Cảm ơn đồng chí đã hoàn thành phiếu khảo sát
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              {receipt.isAnonymous
                ? 'Phiếu trả lời đã được lưu trữ hoàn toàn ẩn danh, không gắn bất kỳ thông tin định danh cá nhân nào.'
                : 'Phiếu trả lời đã được ghi nhận vào hệ thống tổng hợp.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-6 border-t border-[var(--color-border-soft)] pt-4 text-xs">
              <div>
                <span className="text-[var(--color-text-muted)]">Mã biên nhận:</span>{' '}
                <strong className="font-mono-tabular text-[var(--color-text)]">
                  {receipt.receiptCode}
                </strong>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)]">Thời điểm gửi (Giờ VN):</span>{' '}
                <strong className="font-mono-tabular text-[var(--color-text)]">
                  {formatVietnamDateTime(receipt.submittedAt)}
                </strong>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onOpenReport(activeSurvey.id)}
                className="btn-editorial-primary min-h-[42px] px-5 py-2 text-xs font-semibold uppercase tracking-wider cursor-pointer"
              >
                Xem báo cáo thống kê
              </button>
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="btn-editorial-outline min-h-[42px] px-5 py-2 text-xs font-semibold uppercase tracking-wider cursor-pointer"
              >
                Gửi phiếu khác
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-6">
            {/* Identity / Anonymity & Unit box */}
            <div className="border border-[var(--color-border-soft)] bg-[var(--color-bg)] p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-text)]" />
                <div className="text-sm">
                  <p className="font-semibold text-[var(--color-text)]">
                    {activeSurvey.isAnonymous
                      ? 'Bảo mật ẩn danh tuyệt đối'
                      : 'Khảo sát có ghi nhận người trả lời'}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                    {activeSurvey.isAnonymous
                      ? 'Không lưu danh tính người trả lời, cán bộ chiến sĩ an tâm phản ánh trung thực.'
                      : 'Vui lòng điền họ tên hoặc chức vụ để phục vụ công tác tổng hợp theo đối tượng.'}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {!activeSurvey.isAnonymous && (
                  <div>
                    <label
                      htmlFor="respondent-name"
                      className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]"
                    >
                      Họ và tên / Chức vụ <span className="text-[var(--color-status-closed)]">*</span>
                    </label>
                    <input
                      id="respondent-name"
                      type="text"
                      disabled={isLocked}
                      value={respondentName}
                      onChange={(e) => setRespondentName(e.target.value)}
                      placeholder="Nhập họ tên đồng chí..."
                      className="mt-1.5 min-h-[42px] w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                    />
                    {errors.respondentName && (
                      <p className="mt-1 text-xs font-medium text-[var(--color-status-closed)]">
                        {errors.respondentName}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="respondent-unit"
                    className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]"
                  >
                    Đơn vị công tác{' '}
                    {activeSurvey.targetScope === 'specific_units' ? (
                      <span className="text-[var(--color-status-closed)]">*</span>
                    ) : (
                      <span className="font-normal normal-case text-[var(--color-text-muted)]">
                        (Không bắt buộc — dùng cho thống kê chung)
                      </span>
                    )}
                  </label>
                  <select
                    id="respondent-unit"
                    disabled={isLocked}
                    value={respondentUnit}
                    onChange={(e) => setRespondentUnit(e.target.value)}
                    className="mt-1.5 min-h-[42px] w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                  >
                    <option value="">-- Chọn đơn vị --</option>
                    {unitChoices.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                  {errors.respondentUnit && (
                    <p className="mt-1 text-xs font-medium text-[var(--color-status-closed)]">
                      {errors.respondentUnit}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Questions */}
            <div className="divide-y divide-[var(--color-border-soft)] border-t border-[var(--color-border-soft)]">
              {activeSurvey.questions.map((q, index) => {
                const ans = answers[q.id];
                const qError = errors[q.id];
                return (
                  <fieldset
                    key={q.id}
                    disabled={isLocked}
                    className="py-6 disabled:opacity-75"
                  >
                    <legend className="sr-only">Câu {index + 1}</legend>
                    <p className="text-base font-bold leading-snug text-[var(--color-text)]">
                      <span className="font-mono-tabular mr-1.5">Câu {index + 1}:</span>
                      {q.prompt}{' '}
                      {q.required && <span className="text-[var(--color-status-closed)]">*</span>}
                    </p>

                    {q.type === 'single_choice' && (
                      <div className="mt-4 space-y-2.5">
                        {q.options.map((opt, oi) => {
                          const checked = ans?.selectedOptions?.[0] === opt;
                          return (
                            <label
                              key={oi}
                              className={`flex min-h-[44px] items-center gap-3 border px-3.5 py-2.5 text-sm transition-colors cursor-pointer ${
                                checked
                                  ? 'border-[var(--color-text)] bg-[var(--color-surface)] font-medium'
                                  : 'border-[var(--color-border-soft)] bg-[var(--color-surface)]/60 hover:border-[var(--color-border)]'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`question-${q.id}`}
                                checked={checked}
                                onChange={() => handleSingleChange(q.id, opt)}
                                className="h-4 w-4 shrink-0 accent-[var(--color-text)]"
                              />
                              <span>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {q.type === 'multiple_choice' && (
                      <div className="mt-4 space-y-2.5">
                        {q.options.map((opt, oi) => {
                          const checked = ans?.selectedOptions?.includes(opt) ?? false;
                          return (
                            <label
                              key={oi}
                              className={`flex min-h-[44px] items-center gap-3 border px-3.5 py-2.5 text-sm transition-colors cursor-pointer ${
                                checked
                                  ? 'border-[var(--color-text)] bg-[var(--color-surface)] font-medium'
                                  : 'border-[var(--color-border-soft)] bg-[var(--color-surface)]/60 hover:border-[var(--color-border)]'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleMultiToggle(q.id, opt)}
                                className="h-4 w-4 shrink-0 accent-[var(--color-text)]"
                              />
                              <span>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {q.type === 'open_text' && (
                      <div className="mt-4">
                        <label htmlFor={`open-text-${q.id}`} className="sr-only">
                          {q.prompt}
                        </label>
                        <textarea
                          id={`open-text-${q.id}`}
                          rows={4}
                          value={ans?.textValue ?? ''}
                          onChange={(e) => handleTextChange(q.id, e.target.value)}
                          placeholder={q.placeholder || 'Đồng chí ghi rõ ý kiến đóng góp cụ thể...'}
                          className="w-full border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
                        />
                      </div>
                    )}

                    {qError && (
                      <p className="mt-2.5 text-xs font-semibold text-[var(--color-status-closed)]">
                        {qError}
                      </p>
                    )}
                  </fieldset>
                );
              })}
            </div>

            {submitError && (
              <div
                role="alert"
                className="border border-[var(--color-status-closed)] bg-[var(--color-bg)] p-4 text-sm font-medium text-[var(--color-status-closed)]"
              >
                {submitError}
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-[var(--color-border-soft)] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[var(--color-text-muted)]">
                Các câu có dấu <span className="text-[var(--color-status-closed)]">*</span> là nội dung bắt buộc trả lời.
              </p>

              <button
                type="submit"
                disabled={isLocked || submitting}
                className="btn-editorial-primary min-h-[46px] px-7 py-3 text-xs font-semibold uppercase tracking-wider disabled:opacity-45 cursor-pointer"
              >
                {submitting ? 'Đang gửi phiếu...' : 'Gửi phiếu khảo sát'}
              </button>
            </div>
          </form>
        )}
      </article>
    </div>
  );
}
