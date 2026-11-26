import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { fetchFeedback, submitFeedback, toggleFeedbackStatus } from '../../api/client';
import { formatVietnamDateTime } from '../../lib/surveyLogic';
import {
  AVAILABLE_UNITS,
  FEEDBACK_CATEGORIES,
  type FeedbackEntry,
} from '../../types/survey';

export function DirectFeedbackPage() {
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState(FEEDBACK_CATEGORIES[0]);
  const [targetUnit, setTargetUnit] = useState('Toàn hệ thống');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [senderName, setSenderName] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [receiptCode, setReceiptCode] = useState<string | null>(null);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const list = await fetchFeedback();
      setEntries(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEntries();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const localErrors: Record<string, string> = {};
    if (!subject.trim()) localErrors.subject = 'Vui lòng nhập tiêu đề phản ánh.';
    if (!content.trim()) localErrors.content = 'Vui lòng nhập nội dung ý kiến, nguyện vọng.';
    if (!isAnonymous && !senderName.trim()) {
      localErrors.senderName = 'Vui lòng nhập họ tên nếu không gửi ẩn danh.';
    }
    setErrors(localErrors);
    if (Object.keys(localErrors).length > 0) return;

    setSubmitting(true);
    try {
      const created = await submitFeedback({
        category,
        targetUnit,
        isAnonymous,
        senderName: isAnonymous ? undefined : senderName,
        subject,
        content,
      });
      setEntries((prev) => [created, ...prev]);
      setReceiptCode(created.receiptCode);
      setSubject('');
      setContent('');
      setSenderName('');
    } catch (err) {
      const e2 = err as Error & { fieldErrors?: Record<string, string> };
      if (e2.fieldErrors) setErrors(e2.fieldErrors);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleReviewed = async (id: string) => {
    const updated = await toggleFeedbackStatus(id);
    setEntries((prev) => prev.map((item) => (item.id === id ? updated : item)));
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-5 lg:px-6 lg:py-12">
      <div className="border-b border-[var(--color-border)] pb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Kênh phản ánh trực tiếp tới cấp ủy, chỉ huy
        </p>
        <h1 className="font-display mt-1 text-3xl font-extrabold uppercase tracking-tight text-[var(--color-text)] sm:text-5xl">
          GỬI Ý KIẾN, TÂM TƯ, NGUYỆN VỌNG
        </h1>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Form column */}
        <div className="lg:col-span-5">
          <form
            onSubmit={handleSubmit}
            noValidate
            className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 space-y-5"
          >
            <div className="flex items-start gap-3 border-b border-[var(--color-border-soft)] pb-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-text)]" />
              <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
                Ý kiến được gửi trực tiếp trên phần mềm. Chế độ ẩn danh mặc định không lưu tên người gửi để đồng chí an tâm phản ánh trung thực.
              </p>
            </div>

            {receiptCode && (
              <div className="border border-[var(--color-status-active)] bg-[var(--color-bg)] p-4 text-sm">
                <p className="font-semibold text-[var(--color-status-active)]">
                  Đã tiếp nhận ý kiến ({receiptCode})
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Nội dung đã được chuyển vào danh sách tổng hợp phục vụ chỉ huy xem xét.
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="fb-category"
                className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]"
              >
                Lĩnh vực phản ánh
              </label>
              <select
                id="fb-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 min-h-[42px] w-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm"
              >
                {FEEDBACK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="fb-unit"
                className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]"
              >
                Đơn vị liên quan
              </label>
              <select
                id="fb-unit"
                value={targetUnit}
                onChange={(e) => setTargetUnit(e.target.value)}
                className="mt-1.5 min-h-[42px] w-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm"
              >
                <option value="Toàn hệ thống">Toàn hệ thống</option>
                {AVAILABLE_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-start gap-2.5 border border-[var(--color-border-soft)] bg-[var(--color-bg)] p-3.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[var(--color-text)]"
                />
                <span className="text-xs font-medium text-[var(--color-text)]">
                  Gửi ẩn danh hoàn toàn (Khuyến nghị — không lưu họ tên)
                </span>
              </label>
            </div>

            {!isAnonymous && (
              <div>
                <label
                  htmlFor="fb-sender"
                  className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]"
                >
                  Họ tên / Chức vụ *
                </label>
                <input
                  id="fb-sender"
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="mt-1.5 min-h-[42px] w-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm"
                />
                {errors.senderName && (
                  <p className="mt-1 text-xs text-[var(--color-status-closed)]">{errors.senderName}</p>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor="fb-subject"
                className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]"
              >
                Tiêu đề ý kiến *
              </label>
              <input
                id="fb-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ví dụ: Đề xuất lịch sinh hoạt văn hóa thể thao..."
                className="mt-1.5 min-h-[42px] w-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm"
              />
              {errors.subject && (
                <p className="mt-1 text-xs text-[var(--color-status-closed)]">{errors.subject}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="fb-content"
                className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]"
              >
                Nội dung chi tiết *
              </label>
              <textarea
                id="fb-content"
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Đồng chí trình bày rõ tâm tư, nguyện vọng hoặc kiến nghị cụ thể..."
                className="mt-1.5 w-full border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-sm"
              />
              {errors.content && (
                <p className="mt-1 text-xs text-[var(--color-status-closed)]">{errors.content}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-editorial-primary w-full min-h-[46px] px-5 py-3 text-xs font-semibold uppercase tracking-wider cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Đang gửi ý kiến...' : 'Gửi ý kiến trực tiếp'}
            </button>
          </form>
        </div>

        {/* Feed column */}
        <div className="lg:col-span-7">
          <div className="flex items-baseline justify-between border-b border-[var(--color-border)] pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text)]">
              Ý kiến, nguyện vọng đã tiếp nhận ({entries.length})
            </h2>
            <span className="text-xs text-[var(--color-text-muted)]">Mới nhất trước</span>
          </div>

          {loading ? (
            <div className="mt-4 space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse border border-[var(--color-border-soft)] bg-[var(--color-surface)]"
                />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="mt-4 border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-text-muted)]">
              Chưa có ý kiến đóng góp nào được gửi.
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)] border-b border-[var(--color-border)]">
              {entries.map((entry) => (
                <article key={entry.id} className="py-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-text-muted)]">
                      <span className="font-mono-tabular font-semibold text-[var(--color-text)]">
                        {entry.receiptCode}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{entry.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{entry.targetUnit}</span>
                      <span aria-hidden="true">·</span>
                      <span>{entry.isAnonymous ? 'Ẩn danh' : entry.senderName}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleReviewed(entry.id)}
                      className={`inline-flex min-h-[34px] items-center gap-1.5 border px-2.5 py-1 text-xs font-medium cursor-pointer ${
                        entry.status === 'reviewed'
                          ? 'border-[var(--color-status-active)] text-[var(--color-status-active)]'
                          : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>
                        {entry.status === 'reviewed' ? 'Chỉ huy đã xem xét' : 'Đánh dấu đã xem'}
                      </span>
                    </button>
                  </div>

                  <h3 className="mt-2 text-base font-bold text-[var(--color-text)]">
                    {entry.subject}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-muted)]">
                    {entry.content}
                  </p>
                  <p className="font-mono-tabular mt-2 text-xs text-[var(--color-text-muted)]">
                    Gửi lúc {formatVietnamDateTime(entry.createdAt)} (Giờ VN)
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
