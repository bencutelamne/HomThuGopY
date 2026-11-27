import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canDeleteAccount,
  createRootAdminSeed,
  formatAccountDisplayTitle,
  formatDateOfBirthVN,
  isRootAdminUsername,
  isValidDateOfBirth,
  normalizeUsername,
  toAuthUser,
  toPublicAccount,
  validateAccountCreate,
  validateAccountUpdate,
} from './accountLogic';
import { hashPassword, verifyPassword } from './passwordHash';

test('hashPassword and verifyPassword work securely with scrypt', () => {
  const hashed = hashPassword('admin');
  assert.ok(hashed.startsWith('scrypt$'));
  assert.notEqual(hashed, 'admin');
  assert.equal(verifyPassword('admin', hashed), true);
  assert.equal(verifyPassword('wrong-pass', hashed), false);
  assert.equal(verifyPassword('admin', 'invalid-format'), false);
});

test('isValidDateOfBirth checks calendar validity and future dates', () => {
  const fixedNow = Date.parse('2026-11-27T08:00:00+07:00');
  assert.equal(isValidDateOfBirth('1998-05-14', fixedNow), true);
  assert.equal(isValidDateOfBirth('2026-11-27', fixedNow), true);
  assert.equal(isValidDateOfBirth('2026-11-28', fixedNow), false);
  assert.equal(isValidDateOfBirth('2026-02-30', fixedNow), false);
  assert.equal(isValidDateOfBirth('1920-01-01', fixedNow), false);
  assert.equal(isValidDateOfBirth('14/05/1998', fixedNow), false);
  assert.equal(formatDateOfBirthVN('1998-05-14'), '14/05/1998');
});

test('validateAccountCreate enforces required fields, fixed units, 3 roles, and unique username', () => {
  const existing = [{ username: 'admin' }];
  const fixedNow = Date.parse('2026-11-27T08:00:00+07:00');

  const validOfficer = validateAccountCreate(
    {
      username: 'CanBo_104',
      password: '123',
      fullName: 'Trần Văn Hùng',
      dateOfBirth: '1992-08-20',
      unit: 'Đại đội 104',
      role: 'officer',
    },
    existing,
    fixedNow,
  );
  assert.equal(validOfficer.valid, true);

  const dupAdmin = validateAccountCreate(
    {
      username: 'ADMIN',
      password: '456',
      fullName: 'Người dùng trùng',
      dateOfBirth: '1995-01-01',
      unit: 'Đại đội 1',
      role: 'soldier',
    },
    existing,
    fixedNow,
  );
  assert.equal(dupAdmin.valid, false);
  assert.ok(dupAdmin.errors.username);

  const invalidFields = validateAccountCreate(
    {
      username: 'a',
      password: '12',
      fullName: '',
      dateOfBirth: '2026-02-31',
      unit: 'Tiểu đoàn 9',
      role: 'superadmin' as never,
    },
    existing,
    fixedNow,
  );
  assert.equal(invalidFields.valid, false);
  assert.ok(invalidFields.errors.username);
  assert.ok(invalidFields.errors.password);
  assert.ok(invalidFields.errors.fullName);
  assert.ok(invalidFields.errors.dateOfBirth);
  assert.ok(invalidFields.errors.unit);
  assert.ok(invalidFields.errors.role);
});

test('root admin is protected from deletion and role downgrade', () => {
  const seed = createRootAdminSeed(hashPassword('admin'), '2026-11-27T00:00:00.000Z');
  assert.equal(isRootAdminUsername(seed.username), true);
  assert.equal(normalizeUsername('  AdMiN '), 'admin');

  const delCheck = canDeleteAccount(seed);
  assert.equal(delCheck.allowed, false);

  const soldierDelCheck = canDeleteAccount({ username: 'chiensi01' });
  assert.equal(soldierDelCheck.allowed, true);

  const downgradeAttempt = validateAccountUpdate(seed, { role: 'officer' });
  assert.equal(downgradeAttempt.valid, false);
  assert.ok(downgradeAttempt.errors.role);

  const validRootUpdate = validateAccountUpdate(seed, {
    fullName: 'Nguyễn Quản Trị',
    unit: 'Đại đội 102',
    role: 'admin',
  });
  assert.equal(validRootUpdate.valid, true);
});

test('toAuthUser and toPublicAccount strip passwordHash and format displayName', () => {
  const seed = createRootAdminSeed(hashPassword('admin'), '2026-11-27T00:00:00.000Z');
  const auth = toAuthUser(seed);
  const pub = toPublicAccount(seed);

  assert.equal('passwordHash' in auth, false);
  assert.equal('passwordHash' in pub, false);
  assert.equal(pub.isRootAdmin, true);
  assert.equal(pub.displayName, 'Adminstrator');
  assert.equal(formatAccountDisplayTitle('admin', 'Nguyễn Văn X'), 'Adminstrator');
  assert.equal(formatAccountDisplayTitle('officer', 'Trần Văn Hùng'), 'Cán bộ Trần Văn Hùng');
  assert.equal(formatAccountDisplayTitle('soldier', 'Huỳnh Gia Kiệt'), 'Chiến sĩ Huỳnh Gia Kiệt');
});
