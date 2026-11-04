/**
 * Simulated readings for the landing film. Nothing here comes from a device
 * or the API — the page is public and the API answers nobody signed out — and
 * the page labels it as simulated wherever it is shown.
 */

/** One reading every 20 minutes over the last eight hours, oldest first. */
export const SPO2 = [97, 97, 96, 97, 98, 97, 96, 96, 97, 97, 96, 97, 97, 96, 95, 96, 97, 96, 95, 94, 93, 91, 92, 93];
export const HEART_RATE = [74, 76, 75, 78, 77, 76, 74, 73, 75, 77, 79, 78, 76, 75, 77, 80, 82, 79, 78, 81, 84, 88, 86, 83];
export const TEMPERATURE = [34.1, 34.1, 34.2, 34.2, 34.3, 34.2, 34.1, 34.0, 34.1, 34.2, 34.2, 34.3, 34.2, 34.2, 34.1, 34.2, 34.3, 34.2, 34.2, 34.3, 34.2, 34.2, 34.3, 34.2];

/** Where the SpO₂ trace leaves the band its doctor set: the last few readings. */
export const SPO2_DIP_FROM = 18;
/** The alert threshold set for this (simulated) patient. Illustrative, not a clinical rule. */
export const SPO2_THRESHOLD = 94;

export const LIVE = { spo2: 97, heartRate: 76, temperature: 34.2 };

export const PATIENTS = [
  { name: "Trần Thị Lan", code: "BN-0217", spo2: 91, hr: 88, status: "alert" as const },
  { name: "Nguyễn Văn Hùng", code: "BN-0198", spo2: 97, hr: 72, status: "ok" as const },
  { name: "Lê Minh Châu", code: "BN-0241", spo2: 96, hr: 81, status: "ok" as const },
  { name: "Phạm Quốc Bảo", code: "BN-0176", spo2: 95, hr: 69, status: "ok" as const },
];

export const DEVICES = [
  { name: "Máy đo SpO₂ OX-14", battery: 82 },
  { name: "Miếng dán nhiệt độ TP-03", battery: 64 },
  { name: "Máy đo SpO₂ OX-09", battery: 47 },
];

export const VISITS = [
  { time: "08:30", name: "Nguyễn Văn Hùng", queue: 3 },
  { time: "09:10", name: "Lê Minh Châu", queue: 5 },
  { time: "10:00", name: "Phạm Quốc Bảo", queue: 8 },
];

/** Alert → acknowledged → resolved, the life of an alert in the API, said for people. */
export const ALERT_STEPS = ["Tạo cảnh báo", "Báo nhân viên y tế", "Đã xem xét", "Theo dõi tiếp"];

/** What each scene says. The film and the still version both read from here. */
export const SCENES = [
  {
    nav: "Tại nhà",
    title: "Chăm sóc liên tục, cả khi đã rời phòng khám.",
    body: "Phòng khám cấp thiết bị IoMT để bệnh nhân đo SpO₂, nhịp tim và nhiệt độ ngay tại nhà. Đội chăm sóc theo dõi từ xa.",
  },
  {
    nav: "Đo sinh hiệu",
    title: "Mỗi lần đo là một bộ sinh hiệu.",
    body: "Máy kẹp ngón tay ghi SpO₂ và nhịp tim, miếng dán trên da ghi nhiệt độ. Mỗi con số gắn với đúng thiết bị đã đo ra nó.",
  },
  {
    nav: "Truyền dữ liệu",
    title: "Dữ liệu đi một đường an toàn.",
    body: "Thiết bị gửi qua điện thoại hoặc gateway tại nhà. Máy chủ VitalCare tiếp nhận, kiểm tra rồi lưu vào hồ sơ của đúng bệnh nhân.",
  },
  {
    nav: "Dashboard",
    title: "Bác sĩ thấy xu hướng, không chỉ con số.",
    body: "Bác sĩ và điều dưỡng xem bệnh nhân mình phụ trách, chỉ số hiện tại, biểu đồ tám giờ qua, thiết bị đang kết nối và lịch khám trong ngày.",
  },
  {
    nav: "Cảnh báo",
    title: "Vượt ngưỡng, đội chăm sóc được báo ngay.",
    body: "SpO₂ xuống 91%, dưới ngưỡng 94% bác sĩ đặt cho bệnh nhân này. Hệ thống tạo cảnh báo, còn việc xem xét và quyết định thuộc về nhân viên y tế.",
  },
  {
    nav: "Kết nối",
    title: "Thiết bị kết nối. Theo dõi liên tục. Phối hợp chăm sóc tốt hơn.",
    body: "Bệnh nhân và người chăm sóc xem cùng các chỉ số, thông báo và lịch tái khám trên ứng dụng di động.",
  },
];

/** The limits of what scene 5 shows, said where it is shown. */
export const ALERT_NOTE =
  "Số liệu và ngưỡng chỉ để minh họa. Ngưỡng do bác sĩ đặt cho từng bệnh nhân; VitalCare không chẩn đoán hay quyết định điều trị.";
