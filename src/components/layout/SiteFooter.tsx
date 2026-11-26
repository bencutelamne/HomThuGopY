import type { AppView } from './SiteHeader';

interface SiteFooterProps {
  onNavigate: (view: AppView) => void;
}

export function SiteFooter({ onNavigate }: SiteFooterProps) {
  return (
    <footer className="mt-20 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-5 lg:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          <div className="md:col-span-6">
            <p className="font-display text-2xl font-bold uppercase tracking-tight text-[var(--color-text)]">
              HỆ THỐNG KHẢO SÁT TRỰC TUYẾN
            </p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--color-text-muted)]">
              Nền tảng tạo lập, triển khai phiếu khảo sát 3 loại câu hỏi, tiếp nhận tâm tư nguyện vọng ẩn danh và tự động tổng hợp báo cáo thống kê trên máy tính, máy tính bảng và điện thoại.
            </p>
          </div>

          <div className="md:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Chức năng chính
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('create')}
                  className="hover:underline text-left cursor-pointer"
                >
                  Tạo khảo sát trực tuyến mới
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('take')}
                  className="hover:underline text-left cursor-pointer"
                >
                  Tham gia trả lời phiếu
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('feedback')}
                  className="hover:underline text-left cursor-pointer"
                >
                  Gửi ý kiến, nguyện vọng trực tiếp
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('report')}
                  className="hover:underline text-left cursor-pointer"
                >
                  Tổng hợp &amp; Báo cáo thống kê
                </button>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Quy chuẩn vận hành
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-[var(--color-text-muted)]">
              <li>Múi giờ chuẩn: Giờ Việt Nam (UTC+7)</li>
              <li>Bảo mật: Không lưu danh tính khi bật ẩn danh</li>
              <li>Tự động khóa phiếu &amp; tổng hợp số liệu</li>
              <li>Hỗ trợ đa thiết bị: PC, Tablet, Mobile</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-[var(--color-border-soft)] pt-6 text-xs text-[var(--color-text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <span>Hệ thống Khảo sát &amp; Tiếp nhận Ý kiến Nội bộ — Miễn phí &amp; Bảo mật.</span>
          <span className="font-mono-tabular">Phiên bản triển khai đa thiết bị</span>
        </div>
      </div>
    </footer>
  );
}
