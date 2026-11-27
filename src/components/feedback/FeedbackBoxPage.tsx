import {
  Check,
  CheckCheck,
  CheckCircle2,
  EyeOff,
  Lock,
  LogIn,
  Send,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { formatAccountDisplayTitle } from '../../lib/accountLogic';
import { formatVietnamDateTime } from '../../lib/surveyLogic';
import logoQuanDoan34 from '../../pics/logo-quan-doan-34.png';
import {
  FEEDBACK_UNITS,
  type AuthUser,
  type FeedbackEntry,
  type FeedbackSummary,
} from '../../types/survey';
import type { AppTab } from '../layout/SiteHeader';

interface FeedbackBoxPageProps {
  activeTab: Exclude<AppTab, 'login' | 'accounts'>;
  currentUser: AuthUser | null;
  feedbackList: FeedbackEntry[];
  feedbackSummary: FeedbackSummary;
  onSubmitFeedback: (payload: {
    targetUnit: string;
    isAnonymous: boolean;
    senderName?: string;
    content: string;
  }) => Promise<FeedbackEntry>;
  onToggleStatus: (id: string) => Promise<void>;
  onClearAllFeedback: () => Promise<void>;
  onSwitchTab: (tab: AppTab) => void;
}

export function FeedbackBoxPage({
  activeTab,
  currentUser,
  feedbackList,
  feedbackSummary,
  onSubmitFeedback,
  onToggleStatus,
  onClearAllFeedback,
  onSwitchTab,
}: FeedbackBoxPageProps) {
  const [senderName, setSenderName] = useState('');
  const [targetUnit, setTargetUnit] = useState<string>('');
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedReceipt, setSubmittedReceipt] = useState<FeedbackEntry | null>(null);

  const [unitFilter, setUnitFilter] = useState<string>('ALL');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  const isSoldierLockedUnit = currentUser?.role === 'soldier';
  const effectiveTargetUnit =
    isSoldierLockedUnit && currentUser ? currentUser.unit : targetUnit;

  useEffect(() => {
    if (isSoldierLockedUnit && currentUser?.unit) {
      setTargetUnit(currentUser.unit);
      setErrors((curr) => {
        if (!curr.targetUnit) return curr;
        const copy = { ...curr };
        delete copy.targetUnit;
        return copy;
      });
    }
  }, [isSoldierLockedUnit, currentUser?.unit]);

  const stats = useMemo(() => {
    const total = feedbackList.length;
    const anonCount = feedbackList.filter((item) => item.isAnonymous).length;
    const reviewedCount = feedbackList.filter((item) => item.status === 'reviewed').length;
    return { total, anonCount, reviewedCount };
  }, [feedbackList]);

  const filteredList = useMemo(() => {
    if (unitFilter === 'ALL') return feedbackList;
    return feedbackList.filter((item) => item.targetUnit === unitFilter);
  }, [feedbackList, unitFilter]);

  const handleToggleAnonymous = () => {
    setIsAnonymous((prev) => {
      const next = !prev;
      if (next) {
        setErrors((curr) => {
          const copy = { ...curr };
          delete copy.senderName;
          return copy;
        });
      }
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const nextErrors: Record<string, string> = {};
    if (!isAnonymous && !currentUser && !senderName.trim()) {
      nextErrors.senderName = 'Vui lòng nhập họ tên hoặc bấm nút "Ẩn danh" bên dưới.';
    }
    if (!effectiveTargetUnit) {
      nextErrors.targetUnit = 'Vui lòng chọn đơn vị góp ý.';
    }
    if (!content.trim()) {
      nextErrors.content = 'Vui lòng nhập nội dung góp ý.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      const entry = await onSubmitFeedback({
        targetUnit: effectiveTargetUnit,
        isAnonymous,
        senderName: isAnonymous || currentUser ? undefined : senderName.trim(),
        content: content.trim(),
      });
      setSubmittedReceipt(entry);
      setSenderName('');
      setTargetUnit(isSoldierLockedUnit && currentUser ? currentUser.unit : '');
      setContent('');
      setErrors({});
    } catch (err) {
      const apiErr = err as Error & { fieldErrors?: Record<string, string> };
      if (apiErr.fieldErrors) {
        setErrors(apiErr.fieldErrors);
      }
      setSubmitError(apiErr.message || 'Không thể gửi góp ý. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetReceipt = () => {
    setSubmittedReceipt(null);
    setSubmitError(null);
  };

  const handleStatusToggle = async (id: string) => {
    setTogglingId(id);
    try {
      await onToggleStatus(id);
    } finally {
      setTogglingId(null);
    }
  };

  const handleClearAllConfirm = async () => {
    setClearError(null);
    setClearingAll(true);
    try {
      await onClearAllFeedback();
      setConfirmClearAll(false);
    } catch (err) {
      const apiErr = err as Error;
      setClearError(apiErr.message || 'Không thể xóa toàn bộ thư góp ý.');
    } finally {
      setClearingAll(false);
    }
  };

  const canViewFeedback = currentUser?.role === 'admin' || currentUser?.role === 'officer';
  const canClearAllFeedback = currentUser?.role === 'admin';

  if (activeTab === 'list') {
    if (!canViewFeedback) {
      return (
        <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-5 lg:px-6 lg:py-16">
          <div className="mx-auto max-w-2xl rounded-2xl border border-white/20 bg-[var(--color-surface-elevated)] p-6 shadow-2xl backdrop-blur-sm sm:p-8">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-[var(--color-status-closed)]" />
              <div>
                <p className="font-mono-tabular text-xs font-semibold uppercase tracking-wider text-[var(--color-status-closed)]">
                  Giới hạn quyền truy cập
                </p>
                <h1 className="font-display mt-1 text-3xl font-extrabold uppercase tracking-tight text-white">
                  KHÔNG CÓ QUYỀN XEM NỘI DUNG GÓP Ý
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
                  {currentUser
                    ? `Tài khoản "${formatAccountDisplayTitle(currentUser.role, currentUser.fullName)}" chỉ có quyền gửi góp ý ở trang chủ và không có quyền xem các lá thư góp ý đã tiếp nhận.`
                    : 'Chỉ tài khoản quyền Adminstrator hoặc Cán bộ mới có quyền truy cập và xem nội dung các lá thư góp ý.'}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/14 pt-5">
              <button
                type="button"
                onClick={() => onSwitchTab('submit')}
                className="btn-editorial-primary inline-flex min-h-[44px] items-center gap-2 px-5 py-2.5 text-xs uppercase tracking-wider cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Về trang gửi góp ý</span>
              </button>
              {!currentUser && (
                <button
                  type="button"
                  onClick={() => onSwitchTab('login')}
                  className="btn-editorial-outline inline-flex min-h-[44px] items-center gap-2 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider cursor-pointer"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Đăng nhập hệ thống</span>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-5 lg:px-6 lg:py-12">
        <section className="rounded-2xl border border-white/18 bg-[var(--color-surface-elevated)] p-6 shadow-xl backdrop-blur-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-accent-gold)]">
                Sổ tiếp nhận ý kiến · Đại đội 1 · Đại đội 104 · Đại đội 102
              </p>
              <h1 className="mt-2 text-[clamp(28px,4vw,46px)] font-extrabold uppercase leading-[1.08] tracking-[-0.02em] text-white">
                THEO DÕI TIẾP NHẬN GÓP Ý
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {canClearAllFeedback && (
                !confirmClearAll ? (
                  <button
                    type="button"
                    disabled={feedbackList.length === 0 || clearingAll}
                    onClick={() => {
                      setClearError(null);
                      setConfirmClearAll(true);
                    }}
                    className="btn-editorial-outline inline-flex min-h-[44px] items-center gap-2 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <CheckCheck className="h-4 w-4 text-[var(--color-accent-gold)]" />
                    <span>Đã đọc</span>
                  </button>
                ) : (
                  <div className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-status-closed)]/60 bg-[#4c1414]/80 px-3 py-1.5">
                    <span className="text-xs font-semibold text-[var(--color-status-closed)]">
                      Xóa toàn bộ {feedbackList.length} thư?
                    </span>
                    <button
                      type="button"
                      disabled={clearingAll}
                      onClick={handleClearAllConfirm}
                      className="inline-flex min-h-[32px] items-center rounded bg-[#dc2626] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#b91c1c] disabled:opacity-60 cursor-pointer"
                    >
                      {clearingAll ? 'Đang xóa...' : 'Xác nhận'}
                    </button>
                    <button
                      type="button"
                      disabled={clearingAll}
                      onClick={() => setConfirmClearAll(false)}
                      className="inline-flex min-h-[32px] items-center rounded border border-white/25 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white hover:bg-white/10 cursor-pointer"
                    >
                      Hủy
                    </button>
                  </div>
                )
              )}

              <button
                type="button"
                onClick={() => onSwitchTab('submit')}
                className="btn-editorial-primary inline-flex min-h-[44px] items-center gap-2 px-5 py-2.5 text-xs uppercase tracking-wider cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Gửi góp ý mới</span>
              </button>
            </div>
          </div>

          {clearError && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-[var(--color-status-closed)]/60 bg-[#4c1414]/80 px-4 py-3 text-sm font-medium text-[var(--color-status-closed)]"
            >
              {clearError}
            </div>
          )}

          {/* 3-Stat Cards matching reference 2 summary cards */}
          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/16 bg-white/[0.06] px-4 py-3.5">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent-gold)]">
                Tổng góp ý
              </p>
              <p className="font-display mt-1 text-3xl font-bold tabular-nums text-white">
                {stats.total}
              </p>
            </div>
            <div className="rounded-xl border border-white/16 bg-white/[0.06] px-4 py-3.5">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent-gold)]">
                Gửi ẩn danh
              </p>
              <p className="font-display mt-1 text-3xl font-bold tabular-nums text-white">
                {stats.anonCount}
              </p>
            </div>
            <div className="rounded-xl border border-white/16 bg-white/[0.06] px-4 py-3.5">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent-gold)]">
                Đã xem xét
              </p>
              <p className="font-display mt-1 text-3xl font-bold tabular-nums text-white">
                {stats.reviewedCount}
              </p>
            </div>
          </div>
        </section>

        {/* Unit Filter Bar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-4">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Lọc theo đơn vị">
            {['ALL', ...FEEDBACK_UNITS].map((unit) => {
              const selected = unitFilter === unit;
              return (
                <button
                  key={unit}
                  type="button"
                  onClick={() => setUnitFilter(unit)}
                  className={`min-h-[38px] rounded-lg border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                    selected
                      ? 'border-[var(--color-accent-gold)] bg-[var(--color-accent-gold)] text-[var(--color-inverse-text)] font-bold'
                      : 'border-white/20 bg-white/[0.05] text-white hover:border-[var(--color-accent-gold)]/70'
                  }`}
                >
                  {unit === 'ALL' ? 'Tất cả đơn vị' : unit}
                </button>
              );
            })}
          </div>
          <p className="font-mono-tabular text-xs text-[var(--color-text-muted)]">
            Hiển thị {filteredList.length} ý kiến
          </p>
        </div>

        {/* Feedback Ledger */}
        {filteredList.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-white/16 bg-white/[0.05] py-16 text-center">
            <p className="text-base font-medium text-white">
              Chưa có ý kiến góp ý nào cho lựa chọn này.
            </p>
            <button
              type="button"
              onClick={() => onSwitchTab('submit')}
              className="btn-editorial-outline mt-4 inline-flex min-h-[40px] items-center px-4 py-2 text-xs font-semibold uppercase tracking-wider cursor-pointer"
            >
              Gửi góp ý đầu tiên
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {filteredList.map((item) => (
              <article
                key={item.id}
                className="grid grid-cols-1 gap-4 rounded-xl border border-white/16 bg-[var(--color-surface-elevated)] p-5 shadow-md lg:grid-cols-12 lg:items-start"
              >
                <div className="lg:col-span-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono-tabular rounded border border-[var(--color-accent-gold)]/50 bg-[var(--color-accent-gold)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--color-accent-gold)]">
                      {item.receiptCode}
                    </span>
                    <span className="rounded border border-white/18 bg-white/[0.08] px-2 py-0.5 text-xs font-semibold text-white">
                      {item.targetUnit}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    {item.isAnonymous ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-[var(--color-status-active)]">
                        <Lock className="h-3.5 w-3.5" />
                        <span>Ẩn danh (Giữ bí mật)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 font-medium text-white">
                        <UserCheck className="h-3.5 w-3.5 text-[var(--color-accent-gold)]" />
                        <span>{item.senderName || 'Định danh'}</span>
                      </span>
                    )}
                  </div>

                  <p className="font-mono-tabular text-xs text-[var(--color-text-muted)]">
                    {formatVietnamDateTime(item.createdAt)}
                  </p>
                </div>

                <div className="lg:col-span-6">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-white sm:text-base">
                    {item.content}
                  </p>
                </div>

                <div className="lg:col-span-3 flex lg:justify-end">
                  <button
                    type="button"
                    disabled={togglingId === item.id}
                    onClick={() => handleStatusToggle(item.id)}
                    className={`inline-flex min-h-[38px] items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                      item.status === 'reviewed'
                        ? 'border-[var(--color-status-active)]/60 bg-[var(--color-status-active)]/15 text-[var(--color-status-active)]'
                        : 'border-white/25 bg-white/[0.06] text-[var(--color-text-muted)] hover:border-white/50 hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{item.status === 'reviewed' ? 'Đã xem xét' : 'Đã tiếp nhận'}</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-5 lg:px-6 lg:py-12">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
        {/* Left Column: Military Emblem Lockup, Masthead & Unit Counters */}
        <section className="lg:col-span-5">
          {/* Signature Emblem Lockup */}
          <div className="mb-6 inline-flex items-center gap-4">
            <img
              src={logoQuanDoan34}
              alt="Logo Quân đoàn 34"
              className="h-20 w-20 shrink-0 object-contain drop-shadow-md sm:h-24 sm:w-24"
            />

            <div className="h-16 w-[2px] bg-[var(--color-accent-gold)]/85" aria-hidden="true" />

            <div className="flex flex-col">
              <span className="font-lockup-display text-lg font-bold uppercase leading-none tracking-wider text-[var(--color-accent-gold)]">
                TRỰC TUYẾN · 24/7
              </span>
              <span className="font-lockup-display mt-1 text-3xl font-extrabold uppercase leading-none tracking-tight text-white">
                Ý KIẾN ĐƠN VỊ
              </span>
              <span className="mt-1.5 inline-block self-start rounded bg-[var(--color-accent-red)] px-2.5 py-0.5 font-mono-tabular text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                BẢO MẬT · DÂN CHỦ
              </span>
            </div>
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-accent-gold)]">
            Kênh tiếp nhận ý kiến trực tuyến · Nội bộ đơn vị
          </p>
          <h1 className="mt-2.5 text-[clamp(34px,4.4vw,54px)] font-extrabold leading-[1.08] tracking-[-0.02em] text-white">
            HÒM THƯ GÓP Ý
          </h1>
          <p className="mt-3.5 max-w-lg text-sm leading-relaxed text-[var(--color-text-muted)] sm:text-base">
            Tiếp nhận trực tiếp các ý kiến đóng góp, đề xuất, tâm tư và nguyện vọng gửi về{' '}
            <strong className="font-semibold text-white whitespace-nowrap">Đại đội 1</strong>,{' '}
            <strong className="font-semibold text-white whitespace-nowrap">Đại đội 104</strong> và{' '}
            <strong className="font-semibold text-white whitespace-nowrap">Đại đội 102</strong>.
          </p>

          {/* Live Privacy Seal Card */}
          <div
            className={`mt-7 rounded-xl border p-5 transition-colors duration-200 ${
              isAnonymous
                ? 'border-[var(--color-accent-gold)]/75 bg-[var(--color-seal-bg)]/95 text-white shadow-lg'
                : 'border-white/18 bg-white/[0.06] text-white'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-accent-gold)]">
                {isAnonymous ? (
                  <>
                    <ShieldCheck className="h-4 w-4 text-[var(--color-status-active)]" />
                    <span className="text-[var(--color-status-active)]">Chế độ Ẩn danh đang bật</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4" />
                    <span>Chế độ Định danh</span>
                  </>
                )}
              </span>
              <span
                className={`font-mono-tabular rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                  isAnonymous
                    ? 'bg-[var(--color-status-active)]/15 text-[var(--color-status-active)]'
                    : 'bg-white/10 text-white/85'
                }`}
              >
                {isAnonymous ? 'BÍ MẬT' : 'GHI TÊN'}
              </span>
            </div>
            <p className="mt-2.5 text-sm leading-relaxed text-[var(--color-text-muted)]">
              {isAnonymous
                ? 'Thông tin cá nhân được giữ bí mật hoàn toàn. Hệ thống không yêu cầu và không lưu trữ họ tên của người gửi.'
                : 'Phiếu góp ý ghi nhận họ tên và đơn vị góp ý. Nếu không muốn lộ thông tin cá nhân, hãy bấm nút "Ẩn danh" bên dưới biểu mẫu.'}
            </p>
          </div>

          {/* 3 Units Strip styled like reference 2 translucent cards */}
          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent-gold)]">
              Đơn vị tiếp nhận góp ý
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {FEEDBACK_UNITS.map((unit) => {
                const count = feedbackSummary.byUnit[unit] ?? 0;
                return (
                  <div
                    key={unit}
                    className="rounded-xl border border-white/18 bg-white/[0.06] px-3.5 py-3 backdrop-blur-xs"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-accent-gold)]">
                      {unit}
                    </p>
                    <p className="font-mono-tabular mt-1.5 text-lg font-bold text-white">
                      {count} <span className="text-xs font-medium text-[var(--color-text-muted)]">thư</span>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Right Column: Main Suggestion Form Sheet */}
        <section className="lg:col-span-7">
          <div className="overflow-hidden rounded-2xl border border-white/20 bg-[var(--color-surface-elevated)] shadow-2xl backdrop-blur-sm">
            {/* Sheet Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/14 bg-white/[0.05] px-5 py-4 sm:px-7">
              <span className="font-mono-tabular text-xs font-bold uppercase tracking-wider text-[var(--color-accent-gold)]">
                PHIẾU GỬI Ý KIẾN ĐÓNG GÓP
              </span>
              <span
                className={`font-mono-tabular inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${
                  isAnonymous
                    ? 'border border-[var(--color-status-active)]/40 bg-[var(--color-seal-bg)] text-[var(--color-status-active)]'
                    : 'border border-white/20 bg-white/10 text-white'
                }`}
              >
                {isAnonymous ? (
                  <>
                    <Lock className="h-3 w-3" />
                    <span>ẨN DANH · GIỮ BÍ MẬT</span>
                  </>
                ) : (
                  <span>CÓ ĐỊNH DANH</span>
                )}
              </span>
            </div>

            {submittedReceipt ? (
              <div className="p-6 sm:p-8">
                <div className="rounded-xl border border-[var(--color-status-active)]/45 bg-[#122e1a]/90 p-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-[var(--color-status-active)]" />
                    <div className="space-y-2">
                      <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-white">
                        ĐÃ GỬI GÓP Ý THÀNH CÔNG
                      </h2>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        Thư góp ý của bạn đã được chuyển vào hòm thư của{' '}
                        <strong className="text-[var(--color-accent-gold)]">
                          {submittedReceipt.targetUnit}
                        </strong>
                        .
                      </p>
                    </div>
                  </div>

                  <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-white/14 pt-5 sm:grid-cols-3">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent-gold)]">
                        Mã biên nhận
                      </dt>
                      <dd className="font-mono-tabular mt-1 text-base font-bold text-white">
                        {submittedReceipt.receiptCode}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent-gold)]">
                        Đơn vị góp ý
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-white">
                        {submittedReceipt.targetUnit}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent-gold)]">
                        Người gửi
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-white">
                        {submittedReceipt.isAnonymous
                          ? 'Ẩn danh (Đã giữ bí mật)'
                          : submittedReceipt.senderName}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleResetReceipt}
                    className="btn-editorial-primary inline-flex min-h-[44px] items-center gap-2 px-5 py-2.5 text-xs uppercase tracking-wider cursor-pointer"
                  >
                    <span>Gửi thêm góp ý khác</span>
                  </button>
                  {canViewFeedback && (
                    <button
                      type="button"
                      onClick={() => onSwitchTab('list')}
                      className="btn-editorial-outline inline-flex min-h-[44px] items-center gap-2 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider cursor-pointer"
                    >
                      <span>Xem danh sách tiếp nhận</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="p-5 sm:p-7 space-y-6">
                {submitError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-[var(--color-status-closed)]/60 bg-[#4c1414]/80 px-4 py-3 text-sm font-medium text-[var(--color-status-closed)]"
                  >
                    {submitError}
                  </div>
                )}

                {/* 1. Họ tên */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="senderName"
                      className="block text-sm font-semibold text-white"
                    >
                      Họ tên{' '}
                      {!isAnonymous && !currentUser && (
                        <span className="text-[var(--color-accent-gold)]" aria-hidden="true">
                          *
                        </span>
                      )}
                    </label>
                    <span className="font-mono-tabular text-xs text-[var(--color-text-muted)]">
                      {isAnonymous
                        ? 'Đã ẩn - giữ bí mật'
                        : currentUser
                          ? 'Đã có từ tài khoản đăng nhập'
                          : 'Bắt buộc nếu không ẩn danh'}
                    </span>
                  </div>

                  {isAnonymous ? (
                    <div className="mt-2 flex items-center gap-3 rounded-xl border border-[var(--color-status-active)]/40 bg-[var(--color-seal-bg)] px-4 py-3.5 text-white">
                      <Lock className="h-4 w-4 shrink-0 text-[var(--color-status-active)]" />
                      <div className="text-sm">
                        <p className="font-semibold text-[var(--color-status-active)]">
                          Đã kích hoạt chế độ Ẩn danh
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          Họ tên không được nhập và không gửi lên máy chủ để bảo vệ thông tin cá nhân của bạn.
                        </p>
                      </div>
                    </div>
                  ) : currentUser ? (
                    <div className="mt-2 flex items-center gap-3 rounded-xl border border-white/18 bg-white/[0.06] px-4 py-3.5 text-white">
                      <UserCheck className="h-4 w-4 shrink-0 text-[var(--color-accent-gold)]" />
                      <div className="text-sm">
                        <p className="font-semibold">
                          {formatAccountDisplayTitle(currentUser.role, currentUser.fullName)}{' '}
                          <span className="font-normal text-[var(--color-accent-gold)]">
                            · {currentUser.unit}
                          </span>
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          Thông tin người gửi được lấy tự động từ tài khoản đang đăng nhập - không cần nhập lại họ tên.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <input
                      id="senderName"
                      name="senderName"
                      type="text"
                      value={senderName}
                      onChange={(e) => {
                        setSenderName(e.target.value);
                        if (errors.senderName) {
                          setErrors((curr) => {
                            const copy = { ...curr };
                            delete copy.senderName;
                            return copy;
                          });
                        }
                      }}
                      placeholder="Nhập họ và tên của bạn..."
                      autoComplete="name"
                      className="mt-2 w-full min-h-[44px] rounded-xl border border-white/25 bg-[#102917]/80 px-3.5 py-2.5 text-sm text-white placeholder:text-white/45 focus:border-[var(--color-accent-gold)] focus:outline-none"
                    />
                  )}

                  {errors.senderName && !isAnonymous && !currentUser && (
                    <p className="mt-1.5 text-xs font-medium text-[var(--color-status-closed)]">
                      {errors.senderName}
                    </p>
                  )}
                </div>

                {/* 2. Đơn vị góp ý (3 choices) */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      id="unit-label"
                      className="block text-sm font-semibold text-white"
                    >
                      Đơn vị góp ý{' '}
                      <span className="text-[var(--color-accent-gold)]" aria-hidden="true">
                        *
                      </span>
                    </span>
                    <span className="font-mono-tabular text-xs text-[var(--color-text-muted)]">
                      {isSoldierLockedUnit && currentUser
                        ? 'Cố định theo đơn vị tài khoản'
                        : 'Chọn 1 trong 3 đơn vị'}
                    </span>
                  </div>

                  <div
                    role="radiogroup"
                    aria-labelledby="unit-label"
                    className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-3"
                  >
                    {FEEDBACK_UNITS.map((unit) => {
                      const isSelected = effectiveTargetUnit === unit;
                      const isUnitDisabled = Boolean(
                        isSoldierLockedUnit && currentUser && currentUser.unit !== unit,
                      );
                      return (
                        <button
                          key={unit}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          disabled={isUnitDisabled}
                          onClick={() => {
                            if (isSoldierLockedUnit) return;
                            setTargetUnit(unit);
                            if (errors.targetUnit) {
                              setErrors((curr) => {
                                const copy = { ...curr };
                                delete copy.targetUnit;
                                return copy;
                              });
                            }
                          }}
                          className={`flex min-h-[48px] items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                            isUnitDisabled
                              ? 'border-white/10 bg-white/[0.02] text-white/35 cursor-not-allowed'
                              : isSelected
                                ? 'border-[var(--color-accent-gold)] bg-[var(--color-accent-gold)] text-[var(--color-inverse-text)] shadow-sm cursor-pointer'
                                : 'border-white/20 bg-white/[0.05] text-white hover:border-[var(--color-accent-gold)]/70 hover:bg-white/[0.09] cursor-pointer'
                          }`}
                        >
                          <span>{unit}</span>
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded border ${
                              isSelected
                                ? 'border-[var(--color-inverse-text)] bg-[var(--color-inverse-text)] text-[var(--color-accent-gold)]'
                                : isUnitDisabled
                                  ? 'border-white/15'
                                  : 'border-white/40'
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                            {isUnitDisabled && <Lock className="h-2.5 w-2.5 text-white/35" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {isSoldierLockedUnit && currentUser && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--color-accent-gold)]">
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Tài khoản Chiến sĩ chỉ được đóng góp ý kiến cho đơn vị trong tài khoản ({currentUser.unit}).
                      </span>
                    </p>
                  )}

                  {errors.targetUnit && (
                    <p className="mt-1.5 text-xs font-medium text-[var(--color-status-closed)]">
                      {errors.targetUnit}
                    </p>
                  )}
                </div>

                {/* 3. Nội dung góp ý */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="feedbackContent"
                      className="block text-sm font-semibold text-white"
                    >
                      Nội dung góp ý{' '}
                      <span className="text-[var(--color-accent-gold)]" aria-hidden="true">
                        *
                      </span>
                    </label>
                    <span className="font-mono-tabular text-xs text-[var(--color-text-muted)]">
                      {content.trim().length} ký tự
                    </span>
                  </div>

                  <textarea
                    id="feedbackContent"
                    name="content"
                    rows={5}
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value);
                      if (errors.content) {
                        setErrors((curr) => {
                          const copy = { ...curr };
                          delete copy.content;
                          return copy;
                        });
                      }
                    }}
                    placeholder="Trình bày rõ nội dung góp ý, đề xuất hoặc tâm tư nguyện vọng của bạn..."
                    className="mt-2 w-full rounded-xl border border-white/25 bg-[#102917]/80 px-3.5 py-3 text-sm leading-relaxed text-white placeholder:text-white/45 focus:border-[var(--color-accent-gold)] focus:outline-none"
                  />

                  {errors.content && (
                    <p className="mt-1.5 text-xs font-medium text-[var(--color-status-closed)]">
                      {errors.content}
                    </p>
                  )}
                </div>

                {/* Bottom Controls: Anonymous Button + Submit Button */}
                <div className="border-t border-white/14 pt-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      aria-pressed={isAnonymous}
                      onClick={handleToggleAnonymous}
                      className={`inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-lg border px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                        isAnonymous
                          ? 'border-[var(--color-status-active)]/70 bg-[var(--color-seal-bg)] text-[var(--color-status-active)]'
                          : 'border-white/25 bg-white/[0.06] text-white hover:border-white/50 hover:bg-white/[0.12]'
                      }`}
                    >
                      {isAnonymous ? (
                        <ShieldCheck className="h-4 w-4 text-[var(--color-status-active)]" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                      <span>{isAnonymous ? 'Ẩn danh: Đang bật' : 'Ẩn danh'}</span>
                    </button>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-editorial-primary inline-flex min-h-[48px] items-center justify-center gap-2 px-7 py-2.5 text-xs uppercase tracking-wider disabled:opacity-60 cursor-pointer"
                    >
                      <Send className="h-4 w-4" />
                      <span>{submitting ? 'Đang gửi góp ý...' : 'Gửi góp ý'}</span>
                    </button>
                  </div>

                  <p className="mt-2.5 text-xs text-[var(--color-text-muted)]">
                    {isAnonymous
                      ? 'Bạn đang chọn gửi ẩn danh: thông tin cá nhân sẽ không bị thu thập hay hiển thị.'
                      : 'Không muốn lộ thông tin cá nhân? Bấm nút "Ẩn danh" ở trên để giữ bí mật.'}
                  </p>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
