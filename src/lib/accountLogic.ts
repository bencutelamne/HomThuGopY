import {
  FEEDBACK_UNITS,
  USER_ROLE_META,
  type AccountCreateInput,
  type AccountRecord,
  type AccountUpdateInput,
  type AuthUser,
  type FeedbackUnit,
  type PublicAccount,
  type UserRole,
} from '../types/survey';

export const ROOT_ADMIN_USERNAME = 'admin';

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function isRootAdminUsername(username: string): boolean {
  return normalizeUsername(username) === ROOT_ADMIN_USERNAME;
}

export function isValidUserRole(role: unknown): role is UserRole {
  return role === 'admin' || role === 'officer' || role === 'soldier';
}

export function isValidFeedbackUnit(unit: unknown): unit is FeedbackUnit {
  return typeof unit === 'string' && FEEDBACK_UNITS.includes(unit as FeedbackUnit);
}

/**
 * Validates YYYY-MM-DD calendar date and ensures it is between 1940-01-01 and today (VN time).
 */
export function isValidDateOfBirth(dob: string, nowMs: number = Date.now()): boolean {
  if (typeof dob !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    return false;
  }
  const [yStr, mStr, dStr] = dob.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (year < 1940) {
    return false;
  }

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return false;
  }

  // Compare against Vietnam current date (UTC+7) so DOB cannot be in the future
  const vnToday = new Date(nowMs + 7 * 60 * 60 * 1000);
  const todayUtc = Date.UTC(
    vnToday.getUTCFullYear(),
    vnToday.getUTCMonth(),
    vnToday.getUTCDate(),
  );
  return parsed.getTime() <= todayUtc;
}

/**
 * Formats YYYY-MM-DD as DD/MM/YYYY for Vietnamese display.
 */
export function formatDateOfBirthVN(dob: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    return dob || '-';
  }
  const [y, m, d] = dob.split('-');
  return `${d}/${m}/${y}`;
}

export function getRoleLabel(role: UserRole): string {
  return USER_ROLE_META[role]?.label ?? role;
}

export function getRoleShortLabel(role: UserRole): string {
  return USER_ROLE_META[role]?.shortLabel ?? role;
}

export function getRoleLevel(role: UserRole): number {
  return USER_ROLE_META[role]?.level ?? 3;
}

/**
 * Formats user display title consistently across the entire application:
 * - admin -> "Adminstrator"
 * - officer -> "Cán bộ <fullName>"
 * - soldier -> "Chiến sĩ <fullName>"
 */
export function formatAccountDisplayTitle(role: UserRole, fullName: string): string {
  const cleanName = fullName.trim();
  if (role === 'admin') {
    return 'Adminstrator';
  }
  if (role === 'officer') {
    return cleanName ? `Cán bộ ${cleanName}` : 'Cán bộ';
  }
  return cleanName ? `Chiến sĩ ${cleanName}` : 'Chiến sĩ';
}

export interface AccountValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateAccountCreate(
  input: Partial<AccountCreateInput>,
  existingAccounts: ReadonlyArray<Pick<AccountRecord, 'username'>>,
  nowMs: number = Date.now(),
): AccountValidationResult {
  const errors: Record<string, string> = {};
  const rawUsername = typeof input.username === 'string' ? input.username.trim() : '';
  const normalizedUsername = normalizeUsername(rawUsername);

  if (!rawUsername) {
    errors.username = 'Vui lòng nhập tên đăng nhập.';
  } else if (rawUsername.length < 3 || rawUsername.length > 32) {
    errors.username = 'Tên đăng nhập phải từ 3 đến 32 ký tự.';
  } else if (!/^[a-zA-Z0-9._-]+$/.test(rawUsername)) {
    errors.username = 'Tên đăng nhập chỉ được chứa chữ cái không dấu, số và ký tự . _ -';
  } else if (existingAccounts.some((acc) => normalizeUsername(acc.username) === normalizedUsername)) {
    errors.username = `Tên đăng nhập "${normalizedUsername}" đã tồn tại trong hệ thống.`;
  }

  const password = typeof input.password === 'string' ? input.password : '';
  if (!password || password.trim().length < 3) {
    errors.password = 'Mật khẩu phải có ít nhất 3 ký tự.';
  }

  const fullName = typeof input.fullName === 'string' ? input.fullName.trim() : '';
  if (!fullName) {
    errors.fullName = 'Vui lòng nhập họ và tên.';
  } else if (fullName.length < 2 || fullName.length > 100) {
    errors.fullName = 'Họ và tên phải từ 2 đến 100 ký tự.';
  }

  const dateOfBirth = typeof input.dateOfBirth === 'string' ? input.dateOfBirth.trim() : '';
  if (!dateOfBirth) {
    errors.dateOfBirth = 'Vui lòng chọn ngày tháng năm sinh.';
  } else if (!isValidDateOfBirth(dateOfBirth, nowMs)) {
    errors.dateOfBirth = 'Ngày tháng năm sinh không hợp lệ.';
  }

  if (!isValidFeedbackUnit(input.unit)) {
    errors.unit = 'Vui lòng chọn đơn vị (Đại đội 1, Đại đội 104 hoặc Đại đội 102).';
  }

  if (!isValidUserRole(input.role)) {
    errors.role = 'Vui lòng chọn quyền truy cập hợp lệ (Adminstrator, Cán bộ hoặc Chiến sĩ).';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateAccountUpdate(
  existing: Pick<AccountRecord, 'id' | 'username' | 'role'>,
  input: AccountUpdateInput,
  nowMs: number = Date.now(),
): AccountValidationResult {
  const errors: Record<string, string> = {};

  if (input.fullName !== undefined) {
    const fullName = input.fullName.trim();
    if (!fullName) {
      errors.fullName = 'Vui lòng nhập họ và tên.';
    } else if (fullName.length < 2 || fullName.length > 100) {
      errors.fullName = 'Họ và tên phải từ 2 đến 100 ký tự.';
    }
  }

  if (input.dateOfBirth !== undefined) {
    const dateOfBirth = input.dateOfBirth.trim();
    if (!dateOfBirth) {
      errors.dateOfBirth = 'Vui lòng chọn ngày tháng năm sinh.';
    } else if (!isValidDateOfBirth(dateOfBirth, nowMs)) {
      errors.dateOfBirth = 'Ngày tháng năm sinh không hợp lệ.';
    }
  }

  if (input.unit !== undefined && !isValidFeedbackUnit(input.unit)) {
    errors.unit = 'Vui lòng chọn đơn vị (Đại đội 1, Đại đội 104 hoặc Đại đội 102).';
  }

  if (input.role !== undefined) {
    if (!isValidUserRole(input.role)) {
      errors.role = 'Quyền truy cập không hợp lệ.';
    } else if (isRootAdminUsername(existing.username) && input.role !== 'admin') {
      errors.role = 'Không thể hạ quyền tài khoản quản trị gốc (admin).';
    }
  }

  if (input.password !== undefined && input.password !== '') {
    if (input.password.trim().length < 3) {
      errors.password = 'Mật khẩu mới phải có ít nhất 3 ký tự.';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function canDeleteAccount(target: Pick<AccountRecord, 'username'>): {
  allowed: boolean;
  reason?: string;
} {
  if (isRootAdminUsername(target.username)) {
    return {
      allowed: false,
      reason: 'Không thể xóa tài khoản quản trị gốc (admin).',
    };
  }
  return { allowed: true };
}

export function toAuthUser(record: AccountRecord): AuthUser {
  return {
    id: record.id,
    username: record.username,
    displayName: formatAccountDisplayTitle(record.role, record.fullName),
    fullName: record.fullName,
    dateOfBirth: record.dateOfBirth,
    unit: record.unit,
    role: record.role,
  };
}

export function toPublicAccount(record: AccountRecord): PublicAccount {
  return {
    ...toAuthUser(record),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    isRootAdmin: isRootAdminUsername(record.username),
  };
}

export function createRootAdminSeed(
  passwordHash: string,
  nowIso: string = new Date().toISOString(),
): AccountRecord {
  return {
    id: 'acc-root-admin',
    username: ROOT_ADMIN_USERNAME,
    displayName: 'Adminstrator',
    fullName: 'Quản trị viên hệ thống',
    dateOfBirth: '1990-01-01',
    unit: 'Đại đội 1',
    role: 'admin',
    passwordHash,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}
