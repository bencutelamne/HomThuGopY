import {
  Calendar,
  Check,
  Edit3,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogIn,
  Plus,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  createAccount,
  deleteAccount,
  fetchAccounts,
  updateAccount,
} from '../../api/client';
import {
  formatAccountDisplayTitle,
  formatDateOfBirthVN,
  getRoleShortLabel,
  isRootAdminUsername,
  validateAccountCreate,
  validateAccountUpdate,
} from '../../lib/accountLogic';
import {
  FEEDBACK_UNITS,
  USER_ROLE_META,
  USER_ROLE_ORDER,
  type AuthUser,
  type PublicAccount,
  type UserRole,
} from '../../types/survey';
import type { AppTab } from '../layout/SiteHeader';

interface AccountDashboardPageProps {
  currentUser: AuthUser | null;
  onSwitchTab: (tab: AppTab) => void;
  onSelfAccountUpdated: (updated: AuthUser) => void;
}

interface AccountFormState {
  username: string;
  password: string;
  fullName: string;
  dateOfBirth: string;
  unit: string;
  role: UserRole;
}

const EMPTY_FORM: AccountFormState = {
  username: '',
  password: '',
  fullName: '',
  dateOfBirth: '',
  unit: '',
  role: 'soldier',
};

function getRoleBadgeClass(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'border-[var(--color-status-active)]/50 bg-[var(--color-status-active)]/15 text-[var(--color-status-active)]';
    case 'officer':
      return 'border-[var(--color-accent-gold)]/55 bg-[var(--color-accent-gold)]/15 text-[var(--color-accent-gold)]';
    case 'soldier':
      return 'border-white/25 bg-white/10 text-white/90';
  }
}

function getRoleIcon(role: UserRole) {
  switch (role) {
    case 'admin':
      return <ShieldCheck className="h-3.5 w-3.5 shrink-0" />;
    case 'officer':
      return <Shield className="h-3.5 w-3.5 shrink-0" />;
    case 'soldier':
      return <UserCheck className="h-3.5 w-3.5 shrink-0" />;
  }
}

export function AccountDashboardPage({
  currentUser,
  onSwitchTab,
  onSelfAccountUpdated,
}: AccountDashboardPageProps) {
  const isRootAdmin = Boolean(
    currentUser && isRootAdminUsername(currentUser.username) && currentUser.role === 'admin',
  );

  const [accounts, setAccounts] = useState<PublicAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [unitFilter, setUnitFilter] = useState<string>('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PublicAccount | null>(null);
  const [form, setForm] = useState<AccountFormState>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formSubmitError, setFormSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadAllAccounts = useCallback(async () => {
    if (!isRootAdmin) return;
    setLoading(true);
    setLoadError(null);
    try {
      const list = await fetchAccounts();
      setAccounts(list);
    } catch (err) {
      const apiErr = err as Error;
      setLoadError(apiErr.message || 'Không thể tải cơ sở dữ liệu tài khoản.');
    } finally {
      setLoading(false);
    }
  }, [isRootAdmin]);

  useEffect(() => {
    loadAllAccounts();
  }, [loadAllAccounts]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        setModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modalOpen, saving]);

  const stats = useMemo(() => {
    let adminCount = 0;
    let officerCount = 0;
    let soldierCount = 0;
    for (const acc of accounts) {
      if (acc.role === 'admin') adminCount += 1;
      else if (acc.role === 'officer') officerCount += 1;
      else soldierCount += 1;
    }
    return {
      total: accounts.length,
      adminCount,
      officerCount,
      soldierCount,
    };
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return accounts.filter((acc) => {
      if (roleFilter !== 'ALL' && acc.role !== roleFilter) return false;
      if (unitFilter !== 'ALL' && acc.unit !== unitFilter) return false;
      if (q) {
        const matchName = acc.fullName.toLowerCase().includes(q);
        const matchUser = acc.username.toLowerCase().includes(q);
        const matchUnit = acc.unit.toLowerCase().includes(q);
        if (!matchName && !matchUser && !matchUnit) return false;
      }
      return true;
    });
  }, [accounts, roleFilter, unitFilter, searchQuery]);

  const openCreateModal = () => {
    setEditingAccount(null);
    setForm({ ...EMPTY_FORM, unit: FEEDBACK_UNITS[0], role: 'soldier' });
    setShowPassword(false);
    setFormErrors({});
    setFormSubmitError(null);
    setModalOpen(true);
  };

  const openEditModal = (acc: PublicAccount) => {
    setEditingAccount(acc);
    setForm({
      username: acc.username,
      password: '',
      fullName: acc.fullName,
      dateOfBirth: acc.dateOfBirth,
      unit: acc.unit,
      role: acc.role,
    });
    setShowPassword(false);
    setFormErrors({});
    setFormSubmitError(null);
    setModalOpen(true);
  };

  const clearFieldError = (field: string) => {
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const handleSaveModal = async (e: FormEvent) => {
    e.preventDefault();
    setFormSubmitError(null);

    if (editingAccount) {
      const payload = {
        fullName: form.fullName,
        dateOfBirth: form.dateOfBirth,
        unit: form.unit,
        role: form.role,
        ...(form.password ? { password: form.password } : {}),
      };
      const validation = validateAccountUpdate(editingAccount, payload);
      if (!validation.valid) {
        setFormErrors(validation.errors);
        return;
      }

      setSaving(true);
      try {
        const updated = await updateAccount(editingAccount.id, payload);
        setAccounts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        if (currentUser && updated.id === currentUser.id) {
          onSelfAccountUpdated(updated);
        }
        setModalOpen(false);
        setStatusNotice(`Đã cập nhật thông tin tài khoản "${updated.username}".`);
      } catch (err) {
        const apiErr = err as Error & { fieldErrors?: Record<string, string> };
        if (apiErr.fieldErrors) setFormErrors(apiErr.fieldErrors);
        setFormSubmitError(apiErr.message || 'Không thể cập nhật tài khoản.');
      } finally {
        setSaving(false);
      }
      return;
    }

    const validation = validateAccountCreate(form, accounts);
    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }

    setSaving(true);
    try {
      const created = await createAccount({
        username: form.username,
        password: form.password,
        fullName: form.fullName,
        dateOfBirth: form.dateOfBirth,
        unit: form.unit,
        role: form.role,
      });
      setAccounts((prev) => {
        const root = prev.filter((a) => a.isRootAdmin);
        const others = prev.filter((a) => !a.isRootAdmin);
        return [...root, created, ...others];
      });
      setModalOpen(false);
      setStatusNotice(`Đã thêm tài khoản mới "${created.username}" (${getRoleShortLabel(created.role)}).`);
    } catch (err) {
      const apiErr = err as Error & { fieldErrors?: Record<string, string> };
      if (apiErr.fieldErrors) setFormErrors(apiErr.fieldErrors);
      setFormSubmitError(apiErr.message || 'Không thể tạo tài khoản mới.');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickRoleChange = async (acc: PublicAccount, nextRole: UserRole) => {
    if (acc.isRootAdmin || acc.role === nextRole) return;
    setUpdatingRoleId(acc.id);
    setLoadError(null);
    try {
      const updated = await updateAccount(acc.id, { role: nextRole });
      setAccounts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setStatusNotice(
        `Đã chuyển quyền tài khoản "${updated.username}" sang ${USER_ROLE_META[updated.role].shortLabel}.`,
      );
    } catch (err) {
      const apiErr = err as Error;
      setLoadError(apiErr.message || 'Không thể cập nhật quyền truy cập.');
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleConfirmDelete = async (acc: PublicAccount) => {
    if (acc.isRootAdmin) return;
    setDeletingId(acc.id);
    setLoadError(null);
    try {
      await deleteAccount(acc.id);
      setAccounts((prev) => prev.filter((item) => item.id !== acc.id));
      setConfirmDeleteId(null);
      setStatusNotice(`Đã xóa tài khoản "${acc.username}" khỏi cơ sở dữ liệu.`);
    } catch (err) {
      const apiErr = err as Error;
      setLoadError(apiErr.message || 'Không thể xóa tài khoản.');
    } finally {
      setDeletingId(null);
    }
  };

  if (!isRootAdmin) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-5 lg:px-6 lg:py-16">
        <div className="mx-auto max-w-2xl rounded-2xl border border-white/20 bg-[var(--color-surface-elevated)] p-6 shadow-2xl backdrop-blur-sm sm:p-8">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-[var(--color-status-closed)]" />
            <div>
              <p className="font-mono-tabular text-xs font-semibold uppercase tracking-wider text-[var(--color-status-closed)]">
                Khu vực quản trị đặc biệt · Chỉ tài khoản admin gốc
              </p>
              <h1 className="font-display mt-1 text-3xl font-extrabold uppercase tracking-tight text-white">
                KHÔNG CÓ QUYỀN TRUY CẬP DASHBOARD
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
                {currentUser
                  ? `Tài khoản "${currentUser.username}" không phải tài khoản quản trị gốc (admin). Chỉ duy nhất tài khoản admin mới được phép truy cập và quản lý cơ sở dữ liệu tài khoản.`
                  : 'Vui lòng đăng nhập bằng tài khoản quản trị gốc (admin) để truy cập Dashboard Quản lý tài khoản.'}
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
                <span>Đăng nhập admin</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-5 lg:px-6 lg:py-12">
      {/* Command Header + 4 KPI Cards */}
      <section className="rounded-2xl border border-white/18 bg-[var(--color-surface-elevated)] p-6 shadow-xl backdrop-blur-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-accent-gold)]">
              Cơ sở dữ liệu tài khoản · Chỉ tài khoản admin gốc truy cập
            </p>
            <h1 className="mt-2 text-[clamp(28px,4vw,46px)] font-extrabold uppercase leading-[1.08] tracking-[-0.02em] text-white">
              QUẢN LÝ TÀI KHOẢN &amp; PHÂN QUYỀN
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)]">
              Thêm mới, cập nhật thông tin quân nhân (Họ tên, Ngày sinh, Đơn vị), xóa tài khoản và điều chỉnh quyền truy cập 3 cấp trên toàn hệ thống.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={loadAllAccounts}
              disabled={loading}
              className="btn-editorial-outline inline-flex min-h-[44px] items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="btn-editorial-primary inline-flex min-h-[44px] items-center gap-2 px-5 py-2.5 text-xs uppercase tracking-wider cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm tài khoản</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-white/16 bg-white/[0.06] px-4 py-3.5">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent-gold)]">
              Tổng tài khoản
            </p>
            <p className="font-display mt-1 text-3xl font-bold tabular-nums text-white">
              {stats.total}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--color-status-active)]/30 bg-[var(--color-status-active)]/[0.08] px-4 py-3.5">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-status-active)]">
              Adminstrator
            </p>
            <p className="font-display mt-1 text-3xl font-bold tabular-nums text-white">
              {stats.adminCount}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--color-accent-gold)]/30 bg-[var(--color-accent-gold)]/[0.08] px-4 py-3.5">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent-gold)]">
              Cán bộ
            </p>
            <p className="font-display mt-1 text-3xl font-bold tabular-nums text-white">
              {stats.officerCount}
            </p>
          </div>
          <div className="rounded-xl border border-white/16 bg-white/[0.06] px-4 py-3.5">
            <p className="text-xs font-bold uppercase tracking-wider text-white/85">
              Chiến sĩ
            </p>
            <p className="font-display mt-1 text-3xl font-bold tabular-nums text-white">
              {stats.soldierCount}
            </p>
          </div>
        </div>

        {/* 3-Tier Permission Matrix Strip */}
        <div className="mt-5 grid grid-cols-1 gap-3 border-t border-white/14 pt-5 lg:grid-cols-3">
          {USER_ROLE_ORDER.map((roleKey) => {
            const meta = USER_ROLE_META[roleKey];
            return (
              <div
                key={roleKey}
                className="flex items-start gap-2.5 rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-3 text-xs"
              >
                <span
                  className={`mt-0.5 inline-flex items-center justify-center rounded border p-1.5 ${getRoleBadgeClass(roleKey)}`}
                >
                  {getRoleIcon(roleKey)}
                </span>
                <div>
                  <p className="font-bold uppercase tracking-wider text-white">{meta.label}</p>
                  <p className="mt-0.5 leading-relaxed text-[var(--color-text-muted)]">
                    {meta.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Feedback/Error Banners */}
      {statusNotice && (
        <div
          role="status"
          className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-[var(--color-status-active)]/50 bg-[#122e1a]/95 px-4 py-3 text-sm font-medium text-[var(--color-status-active)]"
        >
          <span className="inline-flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" />
            <span>{statusNotice}</span>
          </span>
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={() => setStatusNotice(null)}
            className="rounded p-1 text-white/70 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {loadError && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-[var(--color-status-closed)]/60 bg-[#4c1414]/85 px-4 py-3 text-sm font-medium text-[var(--color-status-closed)]"
        >
          {loadError}
        </div>
      )}

      {/* Search + Role & Unit Filter Toolbar */}
      <section className="mt-6 space-y-4 border-b border-white/15 pb-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo họ tên, tên đăng nhập hoặc đơn vị..."
              aria-label="Tìm kiếm tài khoản"
              className="w-full min-h-[42px] rounded-xl border border-white/25 bg-[#102917]/80 pl-10 pr-3.5 py-2 text-sm text-white placeholder:text-white/45 focus:border-[var(--color-accent-gold)] focus:outline-none"
            />
          </div>

          <p className="font-mono-tabular text-xs text-[var(--color-text-muted)]">
            Hiển thị {filteredAccounts.length} / {accounts.length} tài khoản
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-bold uppercase tracking-wider text-[var(--color-accent-gold)]">
            Quyền:
          </span>
          {(['ALL', ...USER_ROLE_ORDER] as const).map((roleKey) => {
            const selected = roleFilter === roleKey;
            const label =
              roleKey === 'ALL'
                ? 'Tất cả'
                : USER_ROLE_META[roleKey].shortLabel;
            return (
              <button
                key={roleKey}
                type="button"
                onClick={() => setRoleFilter(roleKey)}
                className={`min-h-[36px] rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                  selected
                    ? 'border-[var(--color-accent-gold)] bg-[var(--color-accent-gold)] text-[var(--color-inverse-text)] font-bold'
                    : 'border-white/20 bg-white/[0.05] text-white hover:border-[var(--color-accent-gold)]/70'
                }`}
              >
                {label}
              </button>
            );
          })}

          <span className="ml-2 mr-1 text-xs font-bold uppercase tracking-wider text-[var(--color-accent-gold)]">
            Đơn vị:
          </span>
          {['ALL', ...FEEDBACK_UNITS].map((unit) => {
            const selected = unitFilter === unit;
            return (
              <button
                key={unit}
                type="button"
                onClick={() => setUnitFilter(unit)}
                className={`min-h-[36px] rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
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
      </section>

      {/* Accounts Table / Cards */}
      {loading && accounts.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-white/16 bg-white/[0.05] py-16 text-center text-sm text-[var(--color-text-muted)]">
          Đang tải cơ sở dữ liệu tài khoản...
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-white/16 bg-white/[0.05] py-16 text-center">
          <Users className="mx-auto h-8 w-8 text-[var(--color-accent-gold)]/80" />
          <p className="mt-3 text-base font-medium text-white">
            Không tìm thấy tài khoản nào phù hợp với bộ lọc hiện tại.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setRoleFilter('ALL');
              setUnitFilter('ALL');
            }}
            className="btn-editorial-outline mt-4 inline-flex min-h-[40px] items-center px-4 py-2 text-xs font-semibold uppercase tracking-wider cursor-pointer"
          >
            Xóa bộ lọc
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="mt-6 hidden overflow-hidden rounded-2xl border border-white/18 bg-[var(--color-surface-elevated)] shadow-xl lg:block">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/14 bg-white/[0.05] text-xs font-bold uppercase tracking-wider text-[var(--color-accent-gold)]">
                    <th className="px-5 py-3.5">Tài khoản &amp; Họ tên</th>
                    <th className="px-4 py-3.5">Ngày sinh</th>
                    <th className="px-4 py-3.5">Đơn vị</th>
                    <th className="px-4 py-3.5">Quyền truy cập</th>
                    <th className="px-5 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredAccounts.map((acc) => {
                    const isDeleting = confirmDeleteId === acc.id;
                    return (
                      <tr
                        key={acc.id}
                        className="transition-colors hover:bg-white/[0.03]"
                      >
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono-tabular rounded border border-white/20 bg-white/[0.08] px-2 py-0.5 text-xs font-bold text-white">
                              @{acc.username}
                            </span>
                            {acc.isRootAdmin && (
                              <span className="inline-flex items-center gap-1 rounded border border-[var(--color-accent-gold)]/55 bg-[var(--color-accent-gold)]/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-accent-gold)]">
                                <Lock className="h-3 w-3" />
                                <span>Tài khoản gốc</span>
                              </span>
                            )}
                          </div>
                          <p className="mt-1.5 font-semibold text-white">
                            {formatAccountDisplayTitle(acc.role, acc.fullName)}
                          </p>
                        </td>

                        <td className="px-4 py-4 font-mono-tabular text-sm text-[var(--color-text-muted)]">
                          {formatDateOfBirthVN(acc.dateOfBirth)}
                        </td>

                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-md border border-white/18 bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-white">
                            {acc.unit}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          {acc.isRootAdmin ? (
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${getRoleBadgeClass(acc.role)}`}
                            >
                              {getRoleIcon(acc.role)}
                              <span>{getRoleShortLabel(acc.role)} (Cố định)</span>
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center justify-center rounded-md border p-1.5 ${getRoleBadgeClass(acc.role)}`}
                              >
                                {getRoleIcon(acc.role)}
                              </span>
                              <select
                                aria-label={`Chỉnh quyền cho ${acc.username}`}
                                value={acc.role}
                                disabled={updatingRoleId === acc.id}
                                onChange={(e) =>
                                  handleQuickRoleChange(acc, e.target.value as UserRole)
                                }
                                className="min-h-[36px] rounded-lg border border-white/25 bg-[#102917] px-2.5 py-1 text-xs font-semibold text-white focus:border-[var(--color-accent-gold)] focus:outline-none disabled:opacity-50 cursor-pointer"
                              >
                                {USER_ROLE_ORDER.map((r) => (
                                  <option key={r} value={r}>
                                    {USER_ROLE_META[r].shortLabel}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          {isDeleting ? (
                            <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-status-closed)]/60 bg-[#4c1414]/85 px-2.5 py-1.5">
                              <span className="text-xs font-semibold text-[var(--color-status-closed)]">
                                Xóa @{acc.username}?
                              </span>
                              <button
                                type="button"
                                disabled={deletingId === acc.id}
                                onClick={() => handleConfirmDelete(acc)}
                                className="rounded bg-[#dc2626] px-2.5 py-1 text-xs font-bold uppercase text-white hover:bg-[#b91c1c] disabled:opacity-60 cursor-pointer"
                              >
                                {deletingId === acc.id ? 'Đang xóa...' : 'Xác nhận'}
                              </button>
                              <button
                                type="button"
                                disabled={deletingId === acc.id}
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded border border-white/25 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/10 cursor-pointer"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEditModal(acc)}
                                className="btn-editorial-outline inline-flex min-h-[36px] items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer"
                              >
                                <Edit3 className="h-3.5 w-3.5 text-[var(--color-accent-gold)]" />
                                <span>Cập nhật</span>
                              </button>

                              {!acc.isRootAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(acc.id)}
                                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[var(--color-status-closed)]/45 bg-[#4c1414]/45 px-3 py-1.5 text-xs font-semibold text-[var(--color-status-closed)] transition-colors hover:bg-[#4c1414]/85 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Xóa</span>
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile & Tablet Cards */}
          <div className="mt-6 space-y-3 lg:hidden">
            {filteredAccounts.map((acc) => {
              const isDeleting = confirmDeleteId === acc.id;
              return (
                <article
                  key={acc.id}
                  className="rounded-xl border border-white/16 bg-[var(--color-surface-elevated)] p-4 shadow-md space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono-tabular rounded border border-white/20 bg-white/[0.08] px-2 py-0.5 text-xs font-bold text-white">
                          @{acc.username}
                        </span>
                        {acc.isRootAdmin && (
                          <span className="inline-flex items-center gap-1 rounded border border-[var(--color-accent-gold)]/55 bg-[var(--color-accent-gold)]/15 px-2 py-0.5 text-[11px] font-bold uppercase text-[var(--color-accent-gold)]">
                            <Lock className="h-3 w-3" />
                            <span>Gốc</span>
                          </span>
                        )}
                      </div>
                      <h2 className="mt-1.5 text-base font-bold text-white">
                        {formatAccountDisplayTitle(acc.role, acc.fullName)}
                      </h2>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold ${getRoleBadgeClass(acc.role)}`}
                    >
                      {getRoleIcon(acc.role)}
                      <span>{getRoleShortLabel(acc.role)}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-y border-white/12 py-2.5 text-xs">
                    <div>
                      <span className="uppercase tracking-wider text-[var(--color-accent-gold)]">
                        Ngày sinh
                      </span>
                      <p className="font-mono-tabular mt-0.5 font-semibold text-white">
                        {formatDateOfBirthVN(acc.dateOfBirth)}
                      </p>
                    </div>
                    <div>
                      <span className="uppercase tracking-wider text-[var(--color-accent-gold)]">
                        Đơn vị
                      </span>
                      <p className="mt-0.5 font-semibold text-white">{acc.unit}</p>
                    </div>
                  </div>

                  {!acc.isRootAdmin && (
                    <div>
                      <label
                        htmlFor={`mobile-role-${acc.id}`}
                        className="block text-xs font-semibold text-[var(--color-text-muted)]"
                      >
                        Chỉnh nhanh quyền truy cập
                      </label>
                      <select
                        id={`mobile-role-${acc.id}`}
                        value={acc.role}
                        disabled={updatingRoleId === acc.id}
                        onChange={(e) =>
                          handleQuickRoleChange(acc, e.target.value as UserRole)
                        }
                        className="mt-1.5 w-full min-h-[40px] rounded-lg border border-white/25 bg-[#102917] px-3 py-1.5 text-xs font-semibold text-white focus:border-[var(--color-accent-gold)] focus:outline-none"
                      >
                        {USER_ROLE_ORDER.map((r) => (
                          <option key={r} value={r}>
                            {USER_ROLE_META[r].label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {isDeleting ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-status-closed)]/60 bg-[#4c1414]/85 p-3">
                      <span className="text-xs font-semibold text-[var(--color-status-closed)]">
                        Xác nhận xóa @{acc.username}?
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={deletingId === acc.id}
                          onClick={() => handleConfirmDelete(acc)}
                          className="min-h-[36px] rounded bg-[#dc2626] px-3 py-1 text-xs font-bold uppercase text-white"
                        >
                          {deletingId === acc.id ? 'Đang xóa...' : 'Xóa'}
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === acc.id}
                          onClick={() => setConfirmDeleteId(null)}
                          className="min-h-[36px] rounded border border-white/25 px-3 py-1 text-xs font-semibold text-white"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(acc)}
                        className="btn-editorial-outline flex-1 inline-flex min-h-[42px] items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold cursor-pointer"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-[var(--color-accent-gold)]" />
                        <span>Cập nhật</span>
                      </button>
                      {!acc.isRootAdmin && (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(acc.id)}
                          className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg border border-[var(--color-status-closed)]/45 bg-[#4c1414]/45 px-4 py-2 text-xs font-semibold text-[var(--color-status-closed)] cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Xóa</span>
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}

      {/* Add / Edit Account Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-modal-title"
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/25 bg-[#122e1a] shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/14 bg-white/[0.04] px-5 py-4 sm:px-6">
              <div>
                <p className="font-mono-tabular text-[11px] font-bold uppercase tracking-wider text-[var(--color-accent-gold)]">
                  {editingAccount ? 'Cập nhật hồ sơ & quyền truy cập' : 'Cấp tài khoản mới'}
                </p>
                <h2
                  id="account-modal-title"
                  className="font-display mt-0.5 text-xl font-extrabold uppercase text-white"
                >
                  {editingAccount
                    ? `Cập nhật tài khoản @${editingAccount.username}`
                    : 'Thêm tài khoản vào hệ thống'}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Đóng hộp thoại"
                disabled={saving}
                onClick={() => setModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-white/[0.05] text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} noValidate className="p-5 sm:p-6 space-y-5">
              {formSubmitError && (
                <div
                  role="alert"
                  className="rounded-lg border border-[var(--color-status-closed)]/60 bg-[#4c1414]/80 px-4 py-3 text-sm font-medium text-[var(--color-status-closed)]"
                >
                  {formSubmitError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Username */}
                <div>
                  <label htmlFor="acc-username" className="block text-sm font-semibold text-white">
                    Tên đăng nhập{' '}
                    {!editingAccount && (
                      <span className="text-[var(--color-accent-gold)]" aria-hidden="true">
                        *
                      </span>
                    )}
                  </label>
                  {editingAccount ? (
                    <div className="mt-2 flex min-h-[44px] items-center justify-between rounded-xl border border-white/18 bg-white/[0.05] px-3.5 py-2 text-sm text-white/80">
                      <span className="font-mono-tabular font-semibold">@{editingAccount.username}</span>
                      <Lock className="h-3.5 w-3.5 text-[var(--color-accent-gold)]" />
                    </div>
                  ) : (
                    <input
                      id="acc-username"
                      type="text"
                      value={form.username}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, username: e.target.value }));
                        clearFieldError('username');
                      }}
                      placeholder="vd: nguyenvana"
                      autoComplete="off"
                      className="mt-2 w-full min-h-[44px] rounded-xl border border-white/25 bg-[#0d2213] px-3.5 py-2 text-sm text-white placeholder:text-white/40 focus:border-[var(--color-accent-gold)] focus:outline-none"
                    />
                  )}
                  {formErrors.username && (
                    <p className="mt-1.5 text-xs font-medium text-[var(--color-status-closed)]">
                      {formErrors.username}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="acc-password" className="block text-sm font-semibold text-white">
                    {editingAccount ? 'Mật khẩu mới (tùy chọn)' : 'Mật khẩu'}{' '}
                    {!editingAccount && (
                      <span className="text-[var(--color-accent-gold)]" aria-hidden="true">
                        *
                      </span>
                    )}
                  </label>
                  <div className="relative mt-2">
                    <input
                      id="acc-password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, password: e.target.value }));
                        clearFieldError('password');
                      }}
                      placeholder={
                        editingAccount
                          ? 'Để trống nếu giữ nguyên mật khẩu'
                          : 'Tối thiểu 3 ký tự...'
                      }
                      autoComplete="new-password"
                      className="w-full min-h-[44px] rounded-xl border border-white/25 bg-[#0d2213] px-3.5 py-2 pr-11 text-sm text-white placeholder:text-white/40 focus:border-[var(--color-accent-gold)] focus:outline-none"
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
                  {formErrors.password && (
                    <p className="mt-1.5 text-xs font-medium text-[var(--color-status-closed)]">
                      {formErrors.password}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Full Name */}
                <div>
                  <label htmlFor="acc-fullname" className="block text-sm font-semibold text-white">
                    Họ và tên{' '}
                    <span className="text-[var(--color-accent-gold)]" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <input
                    id="acc-fullname"
                    type="text"
                    value={form.fullName}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, fullName: e.target.value }));
                      clearFieldError('fullName');
                    }}
                    placeholder="Nhập đầy đủ họ và tên..."
                    className="mt-2 w-full min-h-[44px] rounded-xl border border-white/25 bg-[#0d2213] px-3.5 py-2 text-sm text-white placeholder:text-white/40 focus:border-[var(--color-accent-gold)] focus:outline-none"
                  />
                  {formErrors.fullName && (
                    <p className="mt-1.5 text-xs font-medium text-[var(--color-status-closed)]">
                      {formErrors.fullName}
                    </p>
                  )}
                </div>

                {/* Date of Birth */}
                <div>
                  <label htmlFor="acc-dob" className="block text-sm font-semibold text-white">
                    Ngày tháng năm sinh{' '}
                    <span className="text-[var(--color-accent-gold)]" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <div className="relative mt-2">
                    <input
                      id="acc-dob"
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, dateOfBirth: e.target.value }));
                        clearFieldError('dateOfBirth');
                      }}
                      className="w-full min-h-[44px] rounded-xl border border-white/25 bg-[#0d2213] px-3.5 py-2 text-sm text-white [color-scheme:dark] focus:border-[var(--color-accent-gold)] focus:outline-none"
                    />
                  </div>
                  {formErrors.dateOfBirth && (
                    <p className="mt-1.5 text-xs font-medium text-[var(--color-status-closed)]">
                      {formErrors.dateOfBirth}
                    </p>
                  )}
                </div>
              </div>

              {/* Unit (3 fixed companies) */}
              <div>
                <span id="acc-unit-label" className="block text-sm font-semibold text-white">
                  Đơn vị{' '}
                  <span className="text-[var(--color-accent-gold)]" aria-hidden="true">
                    *
                  </span>
                </span>
                <div
                  role="radiogroup"
                  aria-labelledby="acc-unit-label"
                  className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-3"
                >
                  {FEEDBACK_UNITS.map((unit) => {
                    const selected = form.unit === unit;
                    return (
                      <button
                        key={unit}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => {
                          setForm((prev) => ({ ...prev, unit }));
                          clearFieldError('unit');
                        }}
                        className={`flex min-h-[44px] items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                          selected
                            ? 'border-[var(--color-accent-gold)] bg-[var(--color-accent-gold)] text-[var(--color-inverse-text)]'
                            : 'border-white/20 bg-white/[0.05] text-white hover:border-[var(--color-accent-gold)]/70'
                        }`}
                      >
                        <span>{unit}</span>
                        {selected && <Check className="h-4 w-4 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
                {formErrors.unit && (
                  <p className="mt-1.5 text-xs font-medium text-[var(--color-status-closed)]">
                    {formErrors.unit}
                  </p>
                )}
              </div>

              {/* Access Role (3 tiers) */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span id="acc-role-label" className="block text-sm font-semibold text-white">
                    Quyền truy cập{' '}
                    <span className="text-[var(--color-accent-gold)]" aria-hidden="true">
                      *
                    </span>
                  </span>
                  {editingAccount?.isRootAdmin && (
                    <span className="text-xs font-semibold text-[var(--color-accent-gold)]">
                      Tài khoản gốc luôn giữ quyền Adminstrator
                    </span>
                  )}
                </div>
                <div
                  role="radiogroup"
                  aria-labelledby="acc-role-label"
                  className="mt-2 space-y-2.5"
                >
                  {USER_ROLE_ORDER.map((roleKey) => {
                    const meta = USER_ROLE_META[roleKey];
                    const selected = form.role === roleKey;
                    const disabled = Boolean(editingAccount?.isRootAdmin && roleKey !== 'admin');
                    return (
                      <button
                        key={roleKey}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={disabled}
                        onClick={() => {
                          setForm((prev) => ({ ...prev, role: roleKey }));
                          clearFieldError('role');
                        }}
                        className={`flex w-full items-start justify-between gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                          disabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'
                        } ${
                          selected
                            ? 'border-[var(--color-accent-gold)] bg-[var(--color-accent-gold)]/15 text-white'
                            : 'border-white/18 bg-white/[0.04] text-white hover:border-white/40'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`mt-0.5 inline-flex items-center justify-center rounded border p-1.5 ${getRoleBadgeClass(roleKey)}`}
                          >
                            {getRoleIcon(roleKey)}
                          </span>
                          <div>
                            <p className="text-sm font-bold text-white">{meta.label}</p>
                            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                              {meta.description}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            selected
                              ? 'border-[var(--color-accent-gold)] bg-[var(--color-accent-gold)] text-[var(--color-inverse-text)]'
                              : 'border-white/35'
                          }`}
                        >
                          {selected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {formErrors.role && (
                  <p className="mt-1.5 text-xs font-medium text-[var(--color-status-closed)]">
                    {formErrors.role}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/14 pt-5">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setModalOpen(false)}
                  className="btn-editorial-outline inline-flex min-h-[44px] items-center px-5 py-2 text-xs font-semibold uppercase tracking-wider cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-editorial-primary inline-flex min-h-[44px] items-center gap-2 px-6 py-2 text-xs uppercase tracking-wider disabled:opacity-60 cursor-pointer"
                >
                  {editingAccount ? (
                    <KeyRound className="h-4 w-4" />
                  ) : (
                    <Calendar className="h-4 w-4" />
                  )}
                  <span>
                    {saving
                      ? 'Đang lưu...'
                      : editingAccount
                        ? 'Lưu cập nhật'
                        : 'Tạo tài khoản'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
