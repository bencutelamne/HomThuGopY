export type QuestionType = 'single_choice' | 'multiple_choice' | 'open_text';

export type TargetScope = 'all' | 'specific_units';

export type SurveyStatus = 'upcoming' | 'active' | 'closed';

export interface SurveyQuestion {
  id: string;
  order: number;
  type: QuestionType;
  prompt: string;
  required: boolean;
  options: string[];
  placeholder?: string;
}

export interface Survey {
  id: string;
  code: string;
  title: string;
  purpose: string;
  instructions: string;
  startTime: string; // ISO string with +07:00 offset
  endTime: string;   // ISO string with +07:00 offset
  targetScope: TargetScope;
  targetUnits: string[];
  isAnonymous: boolean;
  manualLocked: boolean;
  createdAt: string;
  questions: SurveyQuestion[];
}

export interface SurveyAnswerValue {
  questionId: string;
  selectedOptions?: string[];
  textValue?: string;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  receiptCode: string;
  submittedAt: string;
  respondentName?: string; // Omitted when survey.isAnonymous === true
  respondentUnit?: string; // Optional unit for aggregation if selected
  answers: SurveyAnswerValue[];
}

export type UserRole = 'admin' | 'officer' | 'soldier';

export interface RoleMetadata {
  role: UserRole;
  level: 1 | 2 | 3;
  label: string;
  shortLabel: string;
  description: string;
}

export const USER_ROLE_META: Record<UserRole, RoleMetadata> = {
  admin: {
    role: 'admin',
    level: 1,
    label: 'Adminstrator',
    shortLabel: 'Adminstrator',
    description: 'Quyền cao nhất, có thể sử dụng toàn bộ chức năng của trang web.',
  },
  officer: {
    role: 'officer',
    level: 2,
    label: 'Cán bộ',
    shortLabel: 'Cán bộ',
    description: 'Được xem các lá thư góp ý, đánh dấu trạng thái tiếp nhận và gửi góp ý.',
  },
  soldier: {
    role: 'soldier',
    level: 3,
    label: 'Chiến sĩ',
    shortLabel: 'Chiến sĩ',
    description: 'Chỉ duy nhất có quyền đóng góp ý kiến cho đơn vị của mình thông qua hòm thư góp ý.',
  },
};

export const USER_ROLE_ORDER: UserRole[] = ['admin', 'officer', 'soldier'];

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  fullName: string;
  dateOfBirth: string; // YYYY-MM-DD
  unit: FeedbackUnit;
  role: UserRole;
}

export interface AccountRecord extends AuthUser {
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicAccount extends AuthUser {
  createdAt: string;
  updatedAt: string;
  isRootAdmin: boolean;
}

export interface AccountCreateInput {
  username: string;
  password: string;
  fullName: string;
  dateOfBirth: string;
  unit: string;
  role: UserRole;
}

export interface AccountUpdateInput {
  fullName?: string;
  dateOfBirth?: string;
  unit?: string;
  role?: UserRole;
  password?: string;
}

export interface FeedbackSummary {
  total: number;
  byUnit: Record<string, number>;
}

export interface FeedbackEntry {
  id: string;
  receiptCode: string;
  category?: string;
  targetUnit: string;
  isAnonymous: boolean;
  senderName?: string;
  subject?: string;
  content: string;
  createdAt: string;
  status: 'received' | 'reviewed';
}

export interface SurveyDraft {
  title: string;
  purpose: string;
  instructions: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endDate: string;   // YYYY-MM-DD
  endTime: string;   // HH:mm
  targetScope: TargetScope;
  targetUnits: string[];
  isAnonymous: boolean;
  questions: SurveyQuestion[];
}

export interface QuestionOptionStat {
  option: string;
  count: number;
  percentage: number;
}

export interface QuestionReport {
  questionId: string;
  order: number;
  type: QuestionType;
  prompt: string;
  totalAnswered: number;
  optionStats: QuestionOptionStat[];
  textResponses: Array<{
    receiptCode: string;
    submittedAt: string;
    unit?: string;
    text: string;
  }>;
}

export interface SurveyReport {
  surveyId: string;
  totalResponses: number;
  anonymousCount: number;
  identifiedCount: number;
  unitBreakdown: Array<{ unit: string; count: number; percentage: number }>;
  questionReports: QuestionReport[];
  generatedAt: string;
}

export const FEEDBACK_UNITS = ['Đại đội 1', 'Đại đội 104', 'Đại đội 102'] as const;

export type FeedbackUnit = (typeof FEEDBACK_UNITS)[number];

export const AVAILABLE_UNITS: string[] = [
  'Phòng Tham mưu',
  'Phòng Chính trị',
  'Phòng Hậu cần - Kỹ thuật',
  'Tiểu đoàn 1',
  'Tiểu đoàn 2',
  'Tiểu đoàn 3',
  'Đại đội Thông tin',
  'Đại đội Vệ binh',
];

export const FEEDBACK_CATEGORIES: string[] = [
  'Công tác tư tưởng & Sinh hoạt đơn vị',
  'Đời sống, chế độ & Hậu cần',
  'Huấn luyện, kỷ luật & Nền nếp chính quy',
  'Bảo vệ an ninh & Dân chủ cơ sở',
  'Đề xuất, sáng kiến cải tiến',
];
