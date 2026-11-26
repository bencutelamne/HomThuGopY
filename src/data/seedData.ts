import type { FeedbackEntry, Survey, SurveyResponse } from '../types/survey';

export const SEED_SURVEYS: Survey[] = [
  {
    id: 'srv-01-2026',
    code: 'KS-2026-01',
    title: 'Khảo sát tình hình đơn vị tháng 01/2026',
    purpose:
      'Nắm tình hình toàn diện của đơn vị trong tháng 01/2026; đánh giá kết quả thực hiện nhiệm vụ, công tác quản lý, duy trì nền nếp chính quy, chấp hành kỷ luật, tình hình tư tưởng, đời sống và các vấn đề phát sinh; làm cơ sở để cấp ủy, chỉ huy kịp thời lãnh đạo, chỉ đạo, giải quyết những khó khăn, vướng mắc và đề ra biện pháp thực hiện nhiệm vụ trong thời gian tiếp theo.',
    instructions:
      'Đồng chí vui lòng đọc kỹ từng câu hỏi trước khi trả lời. Kết quả khảo sát được tổng hợp phục vụ công tác lãnh đạo, chỉ huy và bảo mật ẩn danh tuyệt đối.',
    startTime: '2026-11-01T07:00:00+07:00',
    endTime: '2026-12-31T17:00:00+07:00',
    targetScope: 'all',
    targetUnits: [],
    isAnonymous: true,
    manualLocked: false,
    createdAt: '2026-11-01T06:30:00+07:00',
    questions: [
      {
        id: 'q-01-1',
        order: 1,
        type: 'single_choice',
        prompt:
          'Đồng chí đánh giá như thế nào về công tác quán triệt nhiệm vụ, nắm bắt và giải quyết tình hình tư tưởng tại đơn vị?',
        required: true,
        options: [
          'Rất tốt — Kịp thời, sâu sát, giải quyết thấu đáo',
          'Tốt — Đáp ứng yêu cầu nhiệm vụ',
          'Trung bình — Cần tăng cường đối thoại trực tiếp',
          'Chưa đạt — Còn chậm nắm bắt tâm tư bộ đội',
        ],
      },
      {
        id: 'q-01-2',
        order: 2,
        type: 'multiple_choice',
        prompt:
          'Những nội dung công tác nào đồng chí nhận thấy đơn vị cần tập trung củng cố, nâng cao chất lượng trong thời gian tới? (Có thể chọn nhiều đáp án)',
        required: true,
        options: [
          'Duy trì nền nếp chính quy, quản lý kỷ luật',
          'Công tác bảo vệ an ninh, bí mật quân sự',
          'Bảo đảm đời sống vật chất, tinh thần và chế độ tiêu chuẩn',
          'Tổ chức huấn luyện, sẵn sàng chiến đấu sát thực tế',
          'Phát huy dân chủ cơ sở và đối thoại định kỳ',
        ],
      },
      {
        id: 'q-01-3',
        order: 3,
        type: 'open_text',
        prompt: 'Ý kiến đề xuất, kiến nghị của đồng chí đối với cấp ủy, chỉ huy đơn vị:',
        required: false,
        options: [],
        placeholder: 'Đồng chí ghi rõ ý kiến đóng góp cụ thể...',
      },
    ],
  },
  {
    id: 'srv-11-2026',
    code: 'KS-2026-11',
    title: 'Khảo sát chất lượng sinh hoạt tư tưởng tháng 11/2026',
    purpose:
      'Đánh giá hiệu quả hình thức tổ chức sinh hoạt chính trị, tư tưởng và mức độ tiếp thu của cán bộ, chiến sĩ tại các đơn vị trực thuộc.',
    instructions:
      'Chọn các phương án phản ánh đúng thực tế tại đơn vị công tác. Mọi thông tin đóng góp đều được ẩn danh hoàn toàn.',
    startTime: '2026-11-10T07:00:00+07:00',
    endTime: '2026-12-20T17:00:00+07:00',
    targetScope: 'specific_units',
    targetUnits: ['Tiểu đoàn 1', 'Tiểu đoàn 2', 'Phòng Chính trị'],
    isAnonymous: true,
    manualLocked: false,
    createdAt: '2026-11-09T14:00:00+07:00',
    questions: [
      {
        id: 'q-11-1',
        order: 1,
        type: 'single_choice',
        prompt: 'Thời lượng và hình thức sinh hoạt tư tưởng hiện nay có phù hợp với đặc thù nhiệm vụ đơn vị không?',
        required: true,
        options: [
          'Rất phù hợp, nội dung thiết thực',
          'Phù hợp, cần bổ sung thêm ví dụ thực tiễn',
          'Chưa phù hợp, nội dung còn khô khan',
        ],
      },
      {
        id: 'q-11-2',
        order: 2,
        type: 'multiple_choice',
        prompt: 'Hình thức truyền đạt nào mang lại hiệu quả tiếp thu tốt nhất?',
        required: true,
        options: [
          'Trao đổi, tọa đàm trực tiếp theo tổ, tiểu đội',
          'Trình chiếu tư liệu, video minh họa trực quan',
          'Khảo sát nhanh và giải đáp thắc mắc ẩn danh trên phần mềm',
        ],
      },
      {
        id: 'q-11-3',
        order: 3,
        type: 'open_text',
        prompt: 'Chủ đề sinh hoạt tư tưởng đồng chí mong muốn được trao đổi trong tháng tới:',
        required: false,
        options: [],
        placeholder: 'Nhập đề xuất chủ đề hoặc kiến nghị cụ thể...',
      },
    ],
  },
  {
    id: 'srv-10-2026',
    code: 'KS-2026-10',
    title: 'Khảo sát công tác bảo đảm hậu cần, đời sống quý IV/2026',
    purpose:
      'Tổng hợp đánh giá về chất lượng bữa ăn, nhà ở, quân trang và điều kiện sinh hoạt văn hóa thể thao trước khi tổng kết năm.',
    instructions:
      'Cuộc khảo sát đã hết thời gian tiếp nhận phiếu và được hệ thống tự động khóa để xuất báo cáo tổng hợp.',
    startTime: '2026-10-01T07:00:00+07:00',
    endTime: '2026-10-25T17:00:00+07:00',
    targetScope: 'all',
    targetUnits: [],
    isAnonymous: true,
    manualLocked: false,
    createdAt: '2026-09-29T09:00:00+07:00',
    questions: [
      {
        id: 'q-10-1',
        order: 1,
        type: 'single_choice',
        prompt: 'Mức độ hài lòng chung về chất lượng bữa ăn và vệ sinh an toàn thực phẩm tại bếp ăn đơn vị:',
        required: true,
        options: [
          'Hài lòng cao',
          'Đạt yêu cầu',
          'Cần cải thiện thực đơn theo mùa',
        ],
      },
      {
        id: 'q-10-2',
        order: 2,
        type: 'multiple_choice',
        prompt: 'Hạng mục cơ sở vật chất nào cần ưu tiên bảo dưỡng trong giai đoạn tới?',
        required: true,
        options: [
          'Hệ thống nước nóng và khu vệ sinh',
          'Trang thiết bị thể thao ngoài trời',
          'Hệ thống chiếu sáng và quạt phòng ở',
        ],
      },
      {
        id: 'q-10-3',
        order: 3,
        type: 'open_text',
        prompt: 'Kiến nghị bổ sung về công tác hậu cần, đời sống:',
        required: false,
        options: [],
        placeholder: 'Nhập ý kiến góp ý...',
      },
    ],
  },
];

export const SEED_RESPONSES: SurveyResponse[] = [
  {
    id: 'res-1',
    surveyId: 'srv-01-2026',
    receiptCode: 'PH-0126-841',
    submittedAt: '2026-11-18T08:15:00+07:00',
    respondentUnit: 'Tiểu đoàn 1',
    answers: [
      { questionId: 'q-01-1', selectedOptions: ['Rất tốt — Kịp thời, sâu sát, giải quyết thấu đáo'] },
      {
        questionId: 'q-01-2',
        selectedOptions: [
          'Công tác bảo vệ an ninh, bí mật quân sự',
          'Phát huy dân chủ cơ sở và đối thoại định kỳ',
        ],
      },
      {
        questionId: 'q-01-3',
        textValue: 'Đề nghị duy trì đều đặn hộp thư góp ý ẩn danh trước các đợt kiểm tra định kỳ.',
      },
    ],
  },
  {
    id: 'res-2',
    surveyId: 'srv-01-2026',
    receiptCode: 'PH-0126-842',
    submittedAt: '2026-11-18T14:30:00+07:00',
    respondentUnit: 'Tiểu đoàn 2',
    answers: [
      { questionId: 'q-01-1', selectedOptions: ['Tốt — Đáp ứng yêu cầu nhiệm vụ'] },
      {
        questionId: 'q-01-2',
        selectedOptions: [
          'Duy trì nền nếp chính quy, quản lý kỷ luật',
          'Công tác bảo vệ an ninh, bí mật quân sự',
          'Bảo đảm đời sống vật chất, tinh thần và chế độ tiêu chuẩn',
        ],
      },
      {
        questionId: 'q-01-3',
        textValue: 'Cần bổ sung thêm tài liệu hướng dẫn quy trình bảo mật thông tin trên thiết bị cá nhân.',
      },
    ],
  },
  {
    id: 'res-3',
    surveyId: 'srv-01-2026',
    receiptCode: 'PH-0126-843',
    submittedAt: '2026-11-19T09:10:00+07:00',
    respondentUnit: 'Phòng Tham mưu',
    answers: [
      { questionId: 'q-01-1', selectedOptions: ['Rất tốt — Kịp thời, sâu sát, giải quyết thấu đáo'] },
      {
        questionId: 'q-01-2',
        selectedOptions: ['Tổ chức huấn luyện, sẵn sàng chiến đấu sát thực tế'],
      },
      {
        questionId: 'q-01-3',
        textValue: 'Tăng thời lượng thực hành xử lý tình huống hiệp đồng ban đêm.',
      },
    ],
  },
  {
    id: 'res-4',
    surveyId: 'srv-01-2026',
    receiptCode: 'PH-0126-844',
    submittedAt: '2026-11-20T16:40:00+07:00',
    respondentUnit: 'Đại đội Thông tin',
    answers: [
      { questionId: 'q-01-1', selectedOptions: ['Trung bình — Cần tăng cường đối thoại trực tiếp'] },
      {
        questionId: 'q-01-2',
        selectedOptions: [
          'Bảo đảm đời sống vật chất, tinh thần và chế độ tiêu chuẩn',
          'Phát huy dân chủ cơ sở và đối thoại định kỳ',
        ],
      },
      {
        questionId: 'q-01-3',
        textValue: 'Mong muốn chỉ huy giải đáp sớm lịch nghỉ phép cuối năm để anh em chủ động kế hoạch gia đình.',
      },
    ],
  },
  {
    id: 'res-5',
    surveyId: 'srv-11-2026',
    receiptCode: 'PH-1126-201',
    submittedAt: '2026-11-12T10:00:00+07:00',
    respondentUnit: 'Tiểu đoàn 1',
    answers: [
      { questionId: 'q-11-1', selectedOptions: ['Rất phù hợp, nội dung thiết thực'] },
      {
        questionId: 'q-11-2',
        selectedOptions: [
          'Trình chiếu tư liệu, video minh họa trực quan',
          'Khảo sát nhanh và giải đáp thắc mắc ẩn danh trên phần mềm',
        ],
      },
      { questionId: 'q-11-3', textValue: 'Kỹ năng sử dụng mạng xã hội an toàn, đúng quy định.' },
    ],
  },
  {
    id: 'res-6',
    surveyId: 'srv-10-2026',
    receiptCode: 'PH-1026-501',
    submittedAt: '2026-10-12T11:20:00+07:00',
    respondentUnit: 'Tiểu đoàn 1',
    answers: [
      { questionId: 'q-10-1', selectedOptions: ['Hài lòng cao'] },
      { questionId: 'q-10-2', selectedOptions: ['Hệ thống nước nóng và khu vệ sinh'] },
      { questionId: 'q-10-3', textValue: 'Bếp ăn bảo đảm nóng sốt, đúng giờ.' },
    ],
  },
  {
    id: 'res-7',
    surveyId: 'srv-10-2026',
    receiptCode: 'PH-1026-502',
    submittedAt: '2026-10-15T15:05:00+07:00',
    respondentUnit: 'Tiểu đoàn 3',
    answers: [
      { questionId: 'q-10-1', selectedOptions: ['Đạt yêu cầu'] },
      {
        questionId: 'q-10-2',
        selectedOptions: ['Hệ thống nước nóng và khu vệ sinh', 'Trang thiết bị thể thao ngoài trời'],
      },
      { questionId: 'q-10-3', textValue: 'Đề nghị bổ sung thêm lưới bóng chuyền cho sân khu B.' },
    ],
  },
  {
    id: 'res-8',
    surveyId: 'srv-10-2026',
    receiptCode: 'PH-1026-503',
    submittedAt: '2026-10-18T09:45:00+07:00',
    respondentUnit: 'Phòng Hậu cần - Kỹ thuật',
    answers: [
      { questionId: 'q-10-1', selectedOptions: ['Hài lòng cao'] },
      { questionId: 'q-10-2', selectedOptions: ['Hệ thống chiếu sáng và quạt phòng ở'] },
    ],
  },
];

export const SEED_FEEDBACK: FeedbackEntry[] = [
  {
    id: 'fb-1',
    receiptCode: 'YK-2026-104',
    category: 'Đời sống, chế độ & Hậu cần',
    targetUnit: 'Tiểu đoàn 2',
    isAnonymous: true,
    subject: 'Đề xuất điều chỉnh giờ mở cửa phòng đọc sách buổi tối',
    content:
      'Kính đề nghị chỉ huy đơn vị xem xét kéo dài thời gian mở phòng đọc đến 21h30 các ngày thứ Tư và thứ Sáu để cán bộ, chiến sĩ có thêm thời gian ôn tập tài liệu.',
    createdAt: '2026-11-22T19:30:00+07:00',
    status: 'reviewed',
  },
  {
    id: 'fb-2',
    receiptCode: 'YK-2026-109',
    category: 'Bảo vệ an ninh & Dân chủ cơ sở',
    targetUnit: 'Toàn hệ thống',
    isAnonymous: true,
    subject: 'Góp ý quy trình tiếp nhận phiếu khảo sát định kỳ',
    content:
      'Việc điền phiếu trực tuyến ẩn danh trên điện thoại giúp anh em mạnh dạn phản ánh những vấn đề thực tế hơn rất nhiều so với bỏ phiếu giấy tập trung.',
    createdAt: '2026-11-24T10:15:00+07:00',
    status: 'received',
  },
];
