import { LogIn, LogOut, Menu, Shield, ShieldCheck, UserCheck, Users, X } from 'lucide-react';
import { useState } from 'react';
import { formatAccountDisplayTitle, isRootAdminUsername } from '../../lib/accountLogic';
import logoQuanDoan34 from '../../pics/Logo_quân_đoàn_34.png';
import type { AuthUser } from '../../types/survey';

export type AppTab = 'submit' | 'list' | 'accounts' | 'login';

interface SiteHeaderProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  feedbackCount: number;
  currentUser: AuthUser | null;
  onLogout: () => Promise<void> | void;
}

export function SiteHeader({
  activeTab,
  onSelectTab,
  feedbackCount,
  currentUser,
  onLogout,
}: SiteHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const isOfficer = currentUser?.role === 'officer';
  const canViewFeedback = isAdmin || isOfficer;
  const isRootAdmin = Boolean(
    currentUser && isRootAdminUsername(currentUser.username) && currentUser.role === 'admin',
  );
  const isHomePage = activeTab === 'submit';

  const navItems: Array<{ id: AppTab; label: string }> = [
    { id: 'submit', label: 'Gửi góp ý' },
    ...(canViewFeedback ? [{ id: 'list' as const, label: 'Theo dõi tiếp nhận' }] : []),
    ...(isRootAdmin ? [{ id: 'accounts' as const, label: 'Quản lý tài khoản' }] : []),
  ];

  const handleSelect = (tab: AppTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  const handleLogoutClick = async () => {
    setMobileMenuOpen(false);
    await onLogout();
  };

  return (
    <header className="sticky top-0 z-40">
      {/* Top Dark Forest Green Navigation Bar */}
      <div className="border-b border-white/10 bg-[var(--color-nav-bg)]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-5 lg:gap-8 lg:px-6">
          <button
            type="button"
            onClick={() => handleSelect('submit')}
            className="flex items-center gap-3 text-left text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            <img
              src={logoQuanDoan34}
              alt="Logo Quân đoàn 34"
              className="h-10 w-10 shrink-0 object-contain drop-shadow-sm"
            />
            <span className="flex flex-col leading-none">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent-gold)]">
                Nội bộ đơn vị
              </span>
              <span className="mt-0.5 text-sm font-extrabold uppercase tracking-wide text-white sm:text-base">
                HÒM THƯ GÓP Ý
              </span>
            </span>
          </button>

          <div className="flex items-center gap-4 lg:gap-6 shrink-0">
            <nav aria-label="Điều hướng chính" className="hidden lg:flex items-center gap-6">
              {navItems.map((item) => {
                const isActive = item.id === activeTab;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={`relative py-1.5 text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      isActive
                        ? 'text-[var(--color-accent-gold)] font-semibold'
                        : 'text-white/85 hover:text-white'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.id === 'list' && (
                      <span className="font-mono-tabular ml-1.5 text-xs opacity-85">
                        ({feedbackCount})
                      </span>
                    )}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-0 -bottom-0.5 h-[2px] rounded-full bg-[var(--color-accent-gold)] transition-transform duration-200 origin-left ${
                        isActive ? 'scale-x-100' : 'scale-x-0'
                      }`}
                    />
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-2.5 shrink-0">
              {currentUser && (
                <div className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white">
                  {isAdmin ? (
                    <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-status-active)]" />
                  ) : isOfficer ? (
                    <Shield className="h-3.5 w-3.5 text-[var(--color-accent-gold)]" />
                  ) : (
                    <UserCheck className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                  )}
                  <span className="font-semibold">
                    {formatAccountDisplayTitle(currentUser.role, currentUser.fullName)}
                  </span>
                  {!isHomePage && (
                    <button
                      type="button"
                      onClick={handleLogoutClick}
                      className="ml-1 border-l border-white/20 pl-2 font-semibold uppercase tracking-wider text-white/75 hover:text-white cursor-pointer"
                    >
                      Đăng xuất
                    </button>
                  )}
                </div>
              )}

              {isHomePage ? (
                currentUser ? (
                  <button
                    type="button"
                    onClick={handleLogoutClick}
                    className="hidden sm:inline-flex btn-editorial-primary items-center gap-1.5 px-4 py-2 text-xs uppercase tracking-wider whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Đăng xuất</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSelect('login')}
                    className="hidden sm:inline-flex btn-editorial-primary items-center gap-1.5 px-4 py-2 text-xs uppercase tracking-wider whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Đăng nhập</span>
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => handleSelect('submit')}
                  className="hidden sm:inline-flex btn-editorial-primary px-4 py-2 text-xs uppercase tracking-wider whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Viết góp ý mới
                </button>
              )}

              <button
                type="button"
                aria-label={mobileMenuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="inline-flex lg:hidden items-center justify-center min-h-[42px] min-w-[42px] rounded-lg border border-white/25 bg-white/5 text-white cursor-pointer"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav
            aria-label="Điều hướng di động"
            className="lg:hidden border-t border-white/15 bg-[#15351e] px-4 py-3"
          >
            <div className="flex flex-col divide-y divide-white/10">
              {navItems.map((item) => {
                const isActive = item.id === activeTab;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={`flex min-h-[44px] items-center justify-between py-2 text-left text-sm font-medium whitespace-nowrap cursor-pointer ${
                      isActive ? 'text-[var(--color-accent-gold)] font-semibold' : 'text-white/85'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      {item.id === 'accounts' && <Users className="h-3.5 w-3.5 text-[var(--color-accent-gold)]" />}
                      {item.label}
                      {item.id === 'list' ? ` (${feedbackCount})` : ''}
                    </span>
                    {isActive && <span className="font-mono-tabular text-xs">Đang xem</span>}
                  </button>
                );
              })}

              <div className="pt-3 mt-1 flex flex-wrap items-center justify-between gap-2">
                {currentUser ? (
                  <>
                    <span className="text-xs font-semibold text-white">
                      Đang đăng nhập: {formatAccountDisplayTitle(currentUser.role, currentUser.fullName)}
                    </span>
                    <div className="flex items-center gap-2">
                      {!isHomePage && (
                        <button
                          type="button"
                          onClick={() => handleSelect('submit')}
                          className="btn-editorial-primary px-3.5 py-2 text-xs uppercase tracking-wider cursor-pointer"
                        >
                          Viết góp ý mới
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleLogoutClick}
                        className="btn-editorial-outline px-3.5 py-2 text-xs font-semibold uppercase tracking-wider cursor-pointer"
                      >
                        Đăng xuất
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSelect(isHomePage ? 'login' : 'submit')}
                    className="btn-editorial-primary w-full py-2.5 text-xs uppercase tracking-wider cursor-pointer"
                  >
                    {isHomePage ? 'Đăng nhập' : 'Viết góp ý mới'}
                  </button>
                )}
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
