import {
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  Copy,
  Lock,
  Plus,
  Search,
  Unlock,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { SurveyListItem } from '../../api/client';
import { formatVietnamDateTime, getStatusLabel } from '../../lib/surveyLogic';
import type { SurveyStatus } from '../../types/survey';
import type { AppView } from '../layout/SiteHeader';

interface OverviewPageProps {
  surveys: SurveyListItem[];
  loading: boolean;
  error: string | null;
  onNavigate: (view: AppView) => void;
  onOpenTake: (surveyId: string) => void;
  onOpenReport: (surveyId: string) => void;
  onToggleLock: (surveyId: string) => Promise<void>;
  onRetry: () => void;
}

const FAQ_ITEMS = [
  {
    index: '01',
    question: 'Chế độ khảo sát ẩn danh bảo vệ người trả lời như thế nào?',
    answer:
      'Khi bật tùy chọn "Khảo sát ẩn danh (Khuyến nghị)", hệ thống tuyệt đối không thu thập hay lưu trữ họ tên, tài khoản hoặc thông tin định danh cá nhân trong cơ sở dữ liệu phản hồi. Cán bộ, chiến sĩ có thể an tâm phản ánh trung thực.',
  },
  {
    index: '02',
    question: 'Phiếu khảo sát hỗ trợ những loại câu hỏi nào?',
    answer:
      'Phần mềm hỗ trợ đầy đủ 3 loại câu hỏi phổ biến: Chọn 1 đáp án (trắc nghiệm đơn), Chọn nhiều đáp án (hộp kiểm) và Ý kiến tự luận (nhập văn bản đóng góp cụ thể).',
  },
  {
    index: '03',
    question: 'Cơ chế tự động khóa và gửi báo cáo hoạt động ra sao?',
    answer:
      'Mỗi cuộc khảo sát đều thiết lập thời gian bắt đầu và kết thúc theo Giờ Việt Nam (UTC+7). Ngay khi quá thời hạn kết thúc hoặc khi chỉ huy khóa thủ công, hệ thống tự động ngừng tiếp nhận phiếu mới và tổng hợp số liệu báo cáo.',
  },
  {
    index: '04',
    question: 'Có thể tham gia khảo sát trên điện thoại hoặc máy tính bảng không?',
    answer:
      'Giao diện được tối ưu bố cục đáp ứng (Responsive) trên PC (12 cột), máy tính bảng (8 cột) và điện thoại di động (4 cột) với nút bấm kích thước lớn dễ thao tác.',
  },
];

export function OverviewPage({
  surveys,
  loading,
  error,
  onNavigate,
  onOpenTake,
  onOpenReport,
  onToggleLock,
  onRetry,
}: OverviewPageProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | SurveyStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lockingId, setLockingId] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<string | null>('01');

  const stats = useMemo(() => {
    const total = surveys.length;
    const active = surveys.filter((s) => s.computedStatus === 'active').length;
    const totalResponses = surveys.reduce((sum, s) => sum + s.responseCount, 0);
    const anonCount = surveys.filter((s) => s.isAnonymous).length;
    const anonPct = total > 0 ? Math.round((anonCount / total) * 100) : 100;
    return { total, active, totalResponses, anonPct };
  }, [surveys]);

  const filteredSurveys = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return surveys.filter((s) => {
      if (statusFilter !== 'all' && s.computedStatus !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.purpose.toLowerCase().includes(q)
      );
    });
  }, [surveys, statusFilter, searchQuery]);

  const firstActiveSurvey = useMemo(
    () => surveys.find((s) => s.computedStatus === 'active') ?? surveys[0],
    [surveys],
  );

  const handleCopyShareLink = async (surveyId: string) => {
    const url = `${window.location.origin}/?view=take&id=${encodeURIComponent(surveyId)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback ignored in restricted environments
    }
    setCopiedId(surveyId);
    window.setTimeout(() => {
      setCopiedId((prev) => (prev === surveyId ? null : prev));
    }, 2200);
  };

  const handleLockToggle = async (surveyId: string) => {
    setLockingId(surveyId);
    try {
      await onToggleLock(surveyId);
    } finally {
      setLockingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-5 lg:px-6 lg:py-12">
      {/* Editorial Hero */}
      <section className="border-b border-[var(--color-border)] pb-10 lg:pb-14">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
              Nền tảng khảo sát nội bộ · Trực tuyến &amp; Ẩn danh · Miễn phí
            </p>
            <h1 className="font-display mt-3 text-[clamp(44px,6.8vw,108px)] font-extrabold uppercase leading-[1.02] tracking-[-0.025em] text-[var(--color-text)] [text-wrap:balance]">
              TẠO KHẢO SÁT TRỰC TUYẾN &amp; TỔNG HỢP BÁO CÁO TỰ ĐỘNG
            </h1>
          </div>

          <div className="lg:col-span-4 lg:pb-1">
            <p className="text-sm leading-relaxed text-[var(--color-text-muted)] sm:text-base">
              Tạo phiếu khảo sát với 3 loại câu hỏi, tiếp nhận ý kiến, tâm tư, nguyện vọng trực tiếp và tự động thống kê kết quả theo thời gian thực trên PC, máy tính bảng và điện thoại.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('create')}
                className="btn-editorial-primary inline-flex min-h-[44px] items-center gap-2 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Tạo khảo sát mới</span>
              </button>

              {firstActiveSurvey && (
                <button
                  type="button"
                  onClick={() => onOpenTake(firstActiveSurvey.id)}
                  className="btn-editorial-outline inline-flex min-h-[44px] items-center gap-2 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap cursor-pointer"
                >
                  <span>Tham gia khảo sát</span>
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4-Column KPI Strip */}
      <section
        aria-label="Chỉ số tổng hợp hệ thống"
        className="grid grid-cols-2 border-b border-[var(--color-border)] lg:grid-cols-4"
      >
        <div className="border-r border-b border-[var(--color-border-soft)] py-5 pr-4 lg:border-b-0 lg:py-6">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
            Tổng cuộc khảo sát
          </p>
          <p className="font-display mt-2 text-4xl font-bold tabular-nums text-[var(--color-text)] sm:text-5xl">
            {stats.total}
          </p>
        </div>

        <div className="border-b border-[var(--color-border-soft)] py-5 pl-4 lg:border-r lg:border-b-0 lg:px-6 lg:py-6">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
            Đang mở tiếp nhận
          </p>
          <p className="font-display mt-2 text-4xl font-bold tabular-nums text-[var(--color-text)] sm:text-5xl">
            {stats.active}
          </p>
        </div>

        <div className="border-r border-[var(--color-border-soft)] py-5 pr-4 lg:px-6 lg:py-6">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
            Tổng phiếu đã gửi
          </p>
          <p className="font-display mt-2 text-4xl font-bold tabular-nums text-[var(--color-text)] sm:text-5xl">
            {stats.totalResponses}
          </p>
        </div>

        <div className="py-5 pl-4 lg:pl-6 lg:py-6">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
            Phiếu bảo mật ẩn danh
          </p>
          <p className="font-display mt-2 text-4xl font-bold tabular-nums text-[var(--color-text)] sm:text-5xl">
            {stats.anonPct}%
          </p>
        </div>
      </section>

      {/* Core Capabilities Strip */}
      <section className="border-b border-[var(--color-border)] py-10 lg:py-12">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5">
            <p className="font-mono-tabular text-xs font-semibold text-[var(--color-text-muted)]">01</p>
            <h2 className="mt-2 text-lg font-bold text-[var(--color-text)]">
              3 loại câu hỏi linh hoạt
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-muted)]">
              Thiết kế phiếu gồm trắc nghiệm 1 đáp án, chọn nhiều phương án và câu hỏi tự luận góp ý chi tiết.
            </p>
          </div>

          <div className="border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5">
            <p className="font-mono-tabular text-xs font-semibold text-[var(--color-text-muted)]">02</p>
            <h2 className="mt-2 text-lg font-bold text-[var(--color-text)]">
              Gửi ý kiến trực tiếp &amp; ẩn danh
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-muted)]">
              Không lưu danh tính người trả lời khi bật chế độ ẩn danh, giúp cán bộ, chiến sĩ an tâm phản ánh trung thực.
            </p>
          </div>

          <div className="border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5">
            <p className="font-mono-tabular text-xs font-semibold text-[var(--color-text-muted)]">03</p>
            <h2 className="mt-2 text-lg font-bold text-[var(--color-text)]">
              Tự động khóa &amp; xuất báo cáo
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-muted)]">
              Tự động khóa phiếu đúng giờ Việt Nam, tổng hợp tỷ lệ phần trăm, thống kê đơn vị và xuất file CSV tức thì.
            </p>
          </div>
        </div>
      </section>

      {/* Survey Directory */}
      <section className="pt-10 lg:pt-14">
        <div className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Danh mục triển khai
            </p>
            <h2 className="font-display mt-1 text-3xl font-bold uppercase tracking-tight text-[var(--color-text)] sm:text-4xl">
              CÁC CUỘC KHẢO SÁT TRỰC TUYẾN
            </h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search input */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <label htmlFor="survey-search" className="sr-only">
                Tìm kiếm cuộc khảo sát
              </label>
              <input
                id="survey-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên, mã khảo sát..."
                className="min-h-[42px] w-full border border-[var(--color-border)] bg-[var(--color-surface)] pl-9 pr-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] sm:w-64"
              />
            </div>

            {/* Segmented status filter */}
            <div
              role="group"
              aria-label="Lọc trạng thái khảo sát"
              className="flex flex-wrap border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5"
            >
              {(
                [
                  { id: 'all', label: 'Tất cả' },
                  { id: 'active', label: 'Đang mở' },
                  { id: 'upcoming', label: 'Sắp mở' },
                  { id: 'closed', label: 'Đã khóa' },
                ] as const
              ).map((tab) => {
                const active = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`min-h-[36px] px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      active
                        ? 'bg-[var(--color-inverse-bg)] text-[var(--color-inverse-text)]'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Loading / Error / Empty / List states */}
        {loading ? (
          <div className="space-y-4 py-8" aria-busy="true">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse border border-[var(--color-border-soft)] bg-[var(--color-surface)]"
              />
            ))}
          </div>
        ) : error ? (
          <div className="my-8 border border-[var(--color-status-closed)] bg-[var(--color-surface)] p-6">
            <p className="text-sm font-semibold text-[var(--color-status-closed)]">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="btn-editorial-outline mt-4 min-h-[40px] px-4 py-2 text-xs font-semibold uppercase tracking-wider cursor-pointer"
            >
              Thử tải lại
            </button>
          </div>
        ) : filteredSurveys.length === 0 ? (
          <div className="my-8 border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-8 text-center">
            <p className="text-base font-semibold text-[var(--color-text)]">
              Không tìm thấy cuộc khảo sát phù hợp
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Thử xóa bộ lọc tìm kiếm hoặc tạo một cuộc khảo sát trực tuyến mới.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              {(searchQuery || statusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="btn-editorial-outline min-h-[42px] px-4 py-2 text-xs font-semibold uppercase tracking-wider cursor-pointer"
                >
                  Đặt lại bộ lọc
                </button>
              )}
              <button
                type="button"
                onClick={() => onNavigate('create')}
                className="btn-editorial-primary min-h-[42px] px-4 py-2 text-xs font-semibold uppercase tracking-wider cursor-pointer"
              >
                Tạo khảo sát mới
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)] border-b border-[var(--color-border)]">
            {filteredSurveys.map((survey, idx) => {
              const statusLabel = getStatusLabel(survey.computedStatus);
              const statusColorClass =
                survey.computedStatus === 'active'
                  ? 'text-[var(--color-status-active)]'
                  : survey.computedStatus === 'upcoming'
                    ? 'text-[var(--color-status-warning)]'
                    : 'text-[var(--color-status-closed)]';

              return (
                <article
                  key={survey.id}
                  className="grid grid-cols-1 gap-4 py-6 transition-colors hover:bg-[var(--color-surface)]/70 lg:grid-cols-12 lg:items-center lg:gap-6 lg:px-3"
                >
                  <div className="lg:col-span-6">
                    {/* Unboxed clean metadata line */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-text-muted)]">
                      <span className="font-mono-tabular font-semibold text-[var(--color-text)]">
                        {String(idx + 1).padStart(2, '0')} · {survey.code}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className={`font-semibold ${statusColorClass}`}>{statusLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span>{survey.isAnonymous ? 'Ẩn danh tuyệt đối' : 'Có định danh'}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {survey.targetScope === 'all'
                          ? 'Toàn hệ thống'
                          : `${survey.targetUnits.length} đơn vị`}
                      </span>
                    </div>

                    <h3 className="mt-2 text-lg font-bold leading-snug text-[var(--color-text)] sm:text-xl">
                      {survey.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-muted)]">
                      {survey.purpose}
                    </p>
                  </div>

                  {/* Schedule & Count */}
                  <div className="grid grid-cols-2 gap-4 text-xs lg:col-span-3">
                    <div>
                      <p className="uppercase tracking-wider text-[var(--color-text-muted)]">
                        Thời hạn (Giờ VN)
                      </p>
                      <p className="font-mono-tabular mt-1 text-[var(--color-text)]">
                        {formatVietnamDateTime(survey.startTime)}
                      </p>
                      <p className="font-mono-tabular text-[var(--color-text-muted)]">
                        → {formatVietnamDateTime(survey.endTime)}
                      </p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wider text-[var(--color-text-muted)]">
                        Đã tiếp nhận
                      </p>
                      <p className="font-display mt-1 text-2xl font-bold tabular-nums text-[var(--color-text)]">
                        {survey.responseCount}{' '}
                        <span className="font-sans text-xs font-normal text-[var(--color-text-muted)]">
                          phiếu · {survey.questions.length} câu
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Action controls */}
                  <div className="flex flex-wrap items-center gap-2 lg:col-span-3 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => onOpenTake(survey.id)}
                      className="btn-editorial-primary min-h-[40px] px-3.5 py-2 text-xs font-semibold uppercase tracking-wider whitespace-nowrap cursor-pointer"
                    >
                      {survey.computedStatus === 'active' ? 'Tham gia' : 'Xem phiếu'}
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenReport(survey.id)}
                      className="btn-editorial-outline inline-flex min-h-[40px] items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider whitespace-nowrap cursor-pointer"
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      <span>Báo cáo</span>
                    </button>

                    <button
                      type="button"
                      aria-label={`Sao chép liên kết cho ${survey.title}`}
                      onClick={() => handleCopyShareLink(survey.id)}
                      className="btn-editorial-outline inline-flex min-h-[40px] min-w-[40px] items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-medium whitespace-nowrap cursor-pointer"
                      title="Sao chép liên kết chia sẻ"
                    >
                      {copiedId === survey.id ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Đã chép</span>
                        </>
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={lockingId === survey.id}
                      aria-label={
                        survey.manualLocked
                          ? `Mở khóa ${survey.title}`
                          : `Khóa phiếu ${survey.title}`
                      }
                      onClick={() => handleLockToggle(survey.id)}
                      className="btn-editorial-outline inline-flex min-h-[40px] min-w-[40px] items-center justify-center px-2.5 py-2 text-xs font-medium cursor-pointer disabled:opacity-50"
                      title={survey.manualLocked ? 'Mở lại khảo sát' : 'Khóa khảo sát ngay'}
                    >
                      {survey.manualLocked ? (
                        <Unlock className="h-3.5 w-3.5" />
                      ) : (
                        <Lock className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Numbered FAQ Accordion */}
      <section className="pt-14 lg:pt-20">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Giải đáp quy trình
            </p>
            <h2 className="font-display mt-1 text-3xl font-bold uppercase tracking-tight text-[var(--color-text)] sm:text-4xl">
              CÂU HỎI THƯỜNG GẶP
            </h2>
          </div>

          <div className="divide-y divide-[var(--color-border)] border-t border-b border-[var(--color-border)] lg:col-span-8">
            {FAQ_ITEMS.map((item) => {
              const isOpen = openFaqIndex === item.index;
              return (
                <div key={item.index}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqIndex(isOpen ? null : item.index)}
                    className="flex w-full min-h-[56px] items-center justify-between gap-4 py-4 text-left cursor-pointer"
                  >
                    <span className="flex items-baseline gap-4">
                      <span className="font-mono-tabular text-xs font-semibold text-[var(--color-text-muted)]">
                        {item.index}
                      </span>
                      <span className="text-base font-semibold text-[var(--color-text)]">
                        {item.question}
                      </span>
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-[var(--color-text)] transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="pb-5 pl-8 pr-6 text-sm leading-relaxed text-[var(--color-text-muted)]">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
