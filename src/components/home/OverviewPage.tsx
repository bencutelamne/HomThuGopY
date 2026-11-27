import { ArrowUpRight, Plus } from 'lucide-react';
import { useMemo } from 'react';
import type { SurveyListItem } from '../../api/client';

interface OverviewPageProps {
  surveys: SurveyListItem[];
}

export function OverviewPage({ surveys }: OverviewPageProps) {
  const stats = useMemo(() => {
    const total = surveys.length;
    const active = surveys.filter((s) => s.computedStatus === 'active').length;
    const totalResponses = surveys.reduce((sum, s) => sum + s.responseCount, 0);
    const anonCount = surveys.filter((s) => s.isAnonymous).length;
    const anonPct = total > 0 ? Math.round((anonCount / total) * 100) : 100;
    return { total, active, totalResponses, anonPct };
  }, [surveys]);

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
                className="btn-editorial-primary inline-flex min-h-[44px] items-center gap-2 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Tạo khảo sát mới</span>
              </button>

              <button
                type="button"
                className="btn-editorial-outline inline-flex min-h-[44px] items-center gap-2 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap cursor-pointer"
              >
                <span>Tham gia khảo sát</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>
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
    </div>
  );
}
