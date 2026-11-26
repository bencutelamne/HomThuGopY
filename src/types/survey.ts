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

export interface FeedbackEntry {
  id: string;
  receiptCode: string;
  category: string;
  targetUnit: string;
  isAnonymous: boolean;
  senderName?: string;
  subject: string;
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
