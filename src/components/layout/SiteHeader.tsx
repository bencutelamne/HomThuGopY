import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export type AppView = 'overview' | 'create' | 'take' | 'report' | 'feedback';

interface SiteHeaderProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
}

const NAV_ITEMS: Array<{ view: AppView; label: string }> = [
  { view: 'overview', label: 'Tổng quan' },
  { view: 'create', label: 'Tạo khảo sát' },
  { view: 'take', label: 'Làm khảo sát' },
  { view: 'feedback', label: 'Gửi ý kiến' },
  { view: 'report', label: 'Báo cáo' },
];

export function SiteHeader({ activeView, onNavigate }: SiteHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (view: AppView) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-5 lg:gap-8 lg:px-6">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => handleNav('overview')}
          className="font-display text-xl font-extrabold uppercase tracking-tight text-[var(--color-text)] whitespace-nowrap shrink-0 cursor-pointer"
        >
          KHẢO SÁT TRỰC TUYẾN
        </button>

        {/* Zone 2: Concise single-line navigation links */}
        <nav aria-label="Điều hướng chính" className="hidden lg:flex items-center gap-6">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.view;
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => handleNav(item.view)}
                className={`relative py-1 text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[var(--color-text)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {item.label}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 -bottom-0.5 h-[1.5px] bg-[var(--color-text)] transition-transform duration-200 origin-left ${
                    isActive ? 'scale-x-100' : 'scale-x-0'
                  }`}
                />
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action + mobile drawer trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleNav('create')}
            className="hidden sm:inline-flex btn-editorial-primary px-4 py-2 text-xs font-semibold uppercase tracking-wider whitespace-nowrap shrink-0 cursor-pointer"
          >
            Tạo phiếu mới
          </button>

          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex lg:hidden items-center justify-center min-h-[44px] min-w-[44px] border border-[var(--color-border)] text-[var(--color-text)] cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="Điều hướng di động"
          className="lg:hidden border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
        >
          <div className="flex flex-col divide-y divide-[var(--color-border-soft)]">
            {NAV_ITEMS.map((item) => {
              const isActive = activeView === item.view;
              return (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => handleNav(item.view)}
                  className={`flex min-h-[44px] items-center justify-between py-2 text-left text-sm font-medium whitespace-nowrap ${
                    isActive ? 'text-[var(--color-text)] font-semibold' : 'text-[var(--color-text-muted)]'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && <span className="font-mono-tabular text-xs">Đang chọn</span>}
                </button>
              );
            })}
            <div className="pt-3 pb-1 sm:hidden">
              <button
                type="button"
                onClick={() => handleNav('create')}
                className="btn-editorial-primary w-full min-h-[44px] px-4 py-2 text-xs font-semibold uppercase tracking-wider"
              >
                Tạo phiếu mới
              </button>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
