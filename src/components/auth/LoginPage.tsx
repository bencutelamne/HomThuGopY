import {
  ArrowLeft,
  Eye,
  EyeOff,
  LogIn,
  LogOut,
  Shield,
  UserCheck,
  Users,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { loginAccount } from '../../api/client';
import {
  formatAccountDisplayTitle,
  formatDateOfBirthVN,
  getRoleLabel,
  isRootAdminUsername,
} from '../../lib/accountLogic';
import type { AuthUser } from '../../types/survey';

interface LoginPageProps {
  currentUser: AuthUser | null;
  onLoginSuccess: (user: AuthUser) => void;
  onLogout: () => Promise<void> | void;
  onBackHome: () => void;
  onGoList: () => void;
  onGoAccounts: () => void;
}

export function LoginPage({
  currentUser,
  onLoginSuccess,
  onLogout,
  onBackHome,
  onGoList,
  onGoAccounts,
}: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await loginAccount(username.trim(), password);
      onLoginSuccess(user);
    } catch (err) {
      const apiErr = err as Error;
      setError(apiErr.message || 'Tên đăng nhập hoặc mật khẩu không đúng.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-5 lg:px-6 lg:py-12">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
        <section className="lg:col-span-5">
          <h1 className="whitespace-nowrap text-[clamp(21px,5.4vw,38px)] lg:text-[clamp(25px,2.5vw,38px)] font-extrabold uppercase leading-[1.08] tracking-[-0.02em] text-white">
            ĐĂNG NHẬP HỆ THỐNG
          </h1>
          <p className="mt-3.5 max-w-md text-sm leading-relaxed text-[var(--color-text-muted)] sm:text-base">
            Đăng nhập bằng tài khoản được cấp để xác định quyền truy cập và tự động gắn thông tin người gửi khi đóng góp ý kiến.
          </p>

          <div className="mt-7 space-y-3">
            <div className="rounded-xl border border-white/18 bg-white/[0.06] p-4 sm:p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-accent-gold)]">
                <Shield className="h-4 w-4" />
                <span>Cán bộ</span>
              </div>
              <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">
                Có quyền xem các lá thư góp ý, cập nhật trạng thái tiếp nhận và gửi ý kiến đóng góp.
              </p>
            </div>
            <div className="rounded-xl border border-white/18 bg-white/[0.06] p-4 sm:p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/90">
                <UserCheck className="h-4 w-4" />
                <span>Chiến sĩ</span>
              </div>
              <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">
                Chỉ duy nhất có quyền đóng góp ý kiến cho đơn vị trong tài khoản của mình thông qua hòm thư góp ý (không xem được thư góp ý của người khác).
              </p>
            </div>
          </div>
        </section>

        <section className="lg:col-span-7">
          <div className="overflow-hidden rounded-2xl border border-white/20 bg-[var(--color-surface-elevated)] shadow-2xl backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/14 bg-white/[0.05] px-5 py-4 sm:px-7">
              <span className="font-mono-tabular text-xs font-bold uppercase tracking-wider text-[var(--color-accent-gold)]">
                PHIẾU XÁC THỰC TÀI KHOẢN
              </span>
              <span className="font-mono-tabular rounded-md border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">
                {currentUser ? 'ĐÃ ĐĂNG NHẬP' : 'NỘI BỘ ĐƠN VỊ'}
              </span>
            </div>

            {currentUser ? (
              <div className="p-6 sm:p-8 space-y-6">
                <div className="rounded-xl border border-[var(--color-status-active)]/45 bg-[#122e1a]/90 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-status-active)]">
                    Phiên làm việc hiện tại
                  </p>
                  <p className="font-display mt-2 text-2xl font-bold uppercase text-white">
                    {formatAccountDisplayTitle(currentUser.role, currentUser.fullName)}
                  </p>
                  <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-white/12 pt-4 text-xs sm:grid-cols-2">
                    <div>
                      <dt className="uppercase tracking-wider text-[var(--color-accent-gold)]">Tài khoản</dt>
                      <dd className="font-mono-tabular mt-0.5 text-sm font-semibold text-white">
                        {currentUser.username}
                      </dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-wider text-[var(--color-accent-gold)]">Quyền truy cập</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-white">
                        {getRoleLabel(currentUser.role)}
                      </dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-wider text-[var(--color-accent-gold)]">Ngày sinh</dt>
                      <dd className="font-mono-tabular mt-0.5 text-sm font-semibold text-white">
                        {formatDateOfBirthVN(currentUser.dateOfBirth)}
                      </dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-wider text-[var(--color-accent-gold)]">Đơn vị</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-white">{currentUser.unit}</dd>
                    </div>
                  </dl>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={onBackHome}
                    className="btn-editorial-primary inline-flex min-h-[44px] items-center gap-2 px-5 py-2.5 text-xs uppercase tracking-wider cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Về trang gửi góp ý</span>
                  </button>

                  {(currentUser.role === 'admin' || currentUser.role === 'officer') && (
                    <button
                      type="button"
                      onClick={onGoList}
                      className="btn-editorial-outline inline-flex min-h-[44px] items-center gap-2 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider cursor-pointer"
                    >
                      <span>Xem danh sách góp ý</span>
                    </button>
                  )}

                  {isRootAdminUsername(currentUser.username) && currentUser.role === 'admin' && (
                    <button
                      type="button"
                      onClick={onGoAccounts}
                      className="btn-editorial-outline inline-flex min-h-[44px] items-center gap-2 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider cursor-pointer"
                    >
                      <Users className="h-3.5 w-3.5 text-[var(--color-accent-gold)]" />
                      <span>Quản lý tài khoản</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onLogout}
                    className="btn-editorial-outline inline-flex min-h-[44px] items-center gap-2 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="p-5 sm:p-7 space-y-6">
                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-[var(--color-status-closed)]/60 bg-[#4c1414]/80 px-4 py-3 text-sm font-medium text-[var(--color-status-closed)]"
                  >
                    {error}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="login-username"
                    className="block text-sm font-semibold text-white"
                  >
                    Tên đăng nhập{' '}
                    <span className="text-[var(--color-accent-gold)]" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <input
                    id="login-username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Nhập tên đăng nhập..."
                    className="mt-2 w-full min-h-[44px] rounded-xl border border-white/25 bg-[#102917]/80 px-3.5 py-2.5 text-sm text-white placeholder:text-white/45 focus:border-[var(--color-accent-gold)] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-sm font-semibold text-white"
                  >
                    Mật khẩu{' '}
                    <span className="text-[var(--color-accent-gold)]" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <div className="relative mt-2">
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="Nhập mật khẩu..."
                      className="w-full min-h-[44px] rounded-xl border border-white/25 bg-[#102917]/80 px-3.5 py-2.5 pr-11 text-sm text-white placeholder:text-white/45 focus:border-[var(--color-accent-gold)] focus:outline-none"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[var(--color-text-muted)] hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/14 pt-5">
                  <button
                    type="button"
                    onClick={onBackHome}
                    className="btn-editorial-outline inline-flex min-h-[48px] items-center gap-2 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Quay lại trang chủ</span>
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-editorial-primary inline-flex min-h-[48px] items-center justify-center gap-2 px-7 py-2.5 text-xs uppercase tracking-wider disabled:opacity-60 cursor-pointer"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>{submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
