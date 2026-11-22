/**
 * FE-02 → FE-23: the logic the clinic screens show and send, run against the real code.
 * Report-5.1_Unit Test.xlsx, sheet FE_ClinicLogic (Note column = test title prefix).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { condition, valueWithUnit } from "@/domains/alerts/types";
import { formatBookingCode, formatQueueNumber } from "@/domains/appointment/types";
import { auditSubject } from "@/domains/audit-log/types";
import { billingErrorText, translateBillingMessage } from "@/domains/billing/messages";
import { parseResult } from "@/domains/billing/result-text";
import { isOrderOutstanding } from "@/domains/billing/types";
import { deviceTypeLabel } from "@/domains/device/types";
import { isClinicalStaff } from "@/domains/employee/types";
import { bodyMassIndex, isEncounterLocked, newEncounterPath } from "@/domains/encounter/types";
import { vitalFlag, vitalRangeText } from "@/domains/encounter/vital-ranges";
import { fullAddress, profileKind, relativesFull } from "@/domains/profile/types";
import { cellText, csvCell, reportErrorText } from "@/domains/reports/types";
import { resultsErrorText } from "@/domains/results/types";
import { sharedParts } from "@/domains/sharing/types";
import { toBookingPayload } from "@/features/clinic/appointments/booking";
import { birthDateProblem, clinicToday, oldestBirthDate } from "@/features/clinic/appointments/clinic-day";
import { closedDayReason, doctorLabel } from "@/features/clinic/appointments/doctor-day";
import { revisionLabel } from "@/features/clinic/first-aid/parts";
import { createRevenueWorkbook } from "@/features/clinic/invoices/revenue-excel";
import { toMedicalServiceRequest } from "@/features/clinic/medical-services/fields";

describe("FE-02 IoMT Device Management — deviceTypeLabel", () => {
  it("DV1 a known code reads in Vietnamese, whatever its case and spaces", () => {
    expect(deviceTypeLabel(" wrist_monitor ")).toBe("Vòng đeo tay theo dõi");
  });
  it("DV2 any other type is shown as typed; none is null", () => {
    expect(deviceTypeLabel("Máy đo SpO₂")).toBe("Máy đo SpO₂");
    expect(deviceTypeLabel("")).toBeNull();
    expect(deviceTypeLabel(null)).toBeNull();
  });
});

describe("FE-05 / FE-19 Alerts — condition, valueWithUnit", () => {
  it("AL1 a rule reads as a sentence with its unit", () => {
    expect(condition("SPO2", "BELOW", 90)).toBe("SpO₂ dưới 90%");
    expect(condition("HEART_RATE", "ABOVE", 120)).toBe("Nhịp tim trên 120 bpm");
    expect(condition("BODY_TEMPERATURE", "ABOVE", 38.5)).toBe("Nhiệt độ cơ thể trên 38.5 °C");
  });
  it("AL2 a threshold sent as a decimal string is read as a number", () => {
    expect(condition("SPO2", "BELOW", "92.00" as unknown as number)).toBe("SpO₂ dưới 92%");
  });
  it("AL3 a value with its unit; no value is a dash", () => {
    expect(valueWithUnit("HEART_RATE", 72)).toBe("72 bpm");
    expect(valueWithUnit("SKIN_TEMPERATURE", 0)).toBe("0 °C");
    expect(valueWithUnit("SPO2", null)).toBe("—");
    expect(valueWithUnit("SPO2", undefined)).toBe("—");
  });
});

describe("FE-07 Patient Management — profileKind, fullAddress, relativesFull", () => {
  it("PT1 the owner is Bản thân; a relative is their relationship, or Người thân", () => {
    expect(profileKind({ self: true, relationship: null })).toBe("Bản thân");
    expect(profileKind({ self: false, relationship: "child" })).toBe("Con");
    expect(profileKind({ self: false, relationship: null })).toBe("Người thân");
  });
  it("PT2 the address leaves out what is not filled in; nothing is null", () => {
    expect(fullAddress({ address: "12 Lê Lợi", ward: null, province: "Hà Nội" })).toBe("12 Lê Lợi, Hà Nội");
    expect(fullAddress({ address: null, ward: null, province: null })).toBeNull();
  });
  it("PT3 two relatives fill the account; the owner does not count", () => {
    expect(relativesFull([{ self: true }, { self: false }])).toBe(false);
    expect(relativesFull([{ self: true }, { self: false }, { self: false }])).toBe(true);
  });
});

describe("FE-08 / FE-18 Clinical encounter — bodyMassIndex, vitalFlag, vitalRangeText, isEncounterLocked, newEncounterPath", () => {
  it("EN1 BMI to one decimal from kg and cm", () => {
    expect(bodyMassIndex({ weightKg: 70, heightCm: 175 } as never)).toBe(22.9);
  });
  it("EN2 no BMI without both weight and height", () => {
    expect(bodyMassIndex({ weightKg: 70, heightCm: null } as never)).toBeNull();
    expect(bodyMassIndex({ weightKg: null, heightCm: 170 } as never)).toBeNull();
    expect(bodyMassIndex(null)).toBeNull();
  });
  it("EN3 a reading outside the normal range is Thấp or Cao; the edges are normal", () => {
    expect(vitalFlag("pulse", 59)).toBe("Thấp");
    expect(vitalFlag("pulse", 60)).toBeNull();
    expect(vitalFlag("pulse", 100)).toBeNull();
    expect(vitalFlag("pulse", 101)).toBe("Cao");
    expect(vitalFlag("spo2", 94)).toBe("Thấp");
    expect(vitalFlag("spo2", 100)).toBeNull();
  });
  it("EN4 no flag for weight, height or no value", () => {
    expect(vitalFlag("weightKg", 300)).toBeNull();
    expect(vitalFlag("temperature", null)).toBeNull();
  });
  it("EN5 the range as a patient reads it", () => {
    expect(vitalRangeText("pulse")).toBe("60–100");
    expect(vitalRangeText("temperature")).toBe("36–37,5");
    expect(vitalRangeText("spo2")).toBe("≥ 95");
    expect(vitalRangeText("heightCm")).toBeNull();
  });
  it("EN6 a completed encounter locks once editableUntil has passed", () => {
    const now = Date.parse("2026-11-22T03:00:00Z");
    expect(isEncounterLocked({ editableUntil: "2026-11-22T02:59:59Z" }, now)).toBe(true);
    expect(isEncounterLocked({ editableUntil: "2026-11-22T03:00:01Z" }, now)).toBe(false);
    expect(isEncounterLocked({ editableUntil: null }, now)).toBe(false);
  });
  it("EN7 the create path carries the patient and, when given, the appointment", () => {
    expect(newEncounterPath({ customerId: 5, patientName: "Trần Thị Bích" })).toBe(
      "/clinical-encounters/create?customerId=5&patient=Tr%E1%BA%A7n+Th%E1%BB%8B+B%C3%ADch",
    );
    expect(newEncounterPath({ customerId: 5, patientName: "A", appointmentId: 9 })).toBe(
      "/clinical-encounters/create?customerId=5&patient=A&appointmentId=9",
    );
  });
});

describe("FE-09 / FE-17 Staff — isClinicalStaff", () => {
  it("ST1 only a doctor can be on a care team", () => {
    expect(isClinicalStaff("doctor")).toBe(true);
    expect(isClinicalStaff("receptionist")).toBe(false);
    expect(isClinicalStaff("technician")).toBe(false);
    expect(isClinicalStaff("clinic_admin")).toBe(false);
  });
});

describe("FE-10 Appointment — booking code, queue number, payload, dates, doctors", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 22/11/2026 06:30 in Vietnam is still 21/11 in UTC.
    vi.setSystemTime(new Date("2026-11-21T23:30:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("AP1 a booking code is printed in two groups of four; other lengths as they are", () => {
    expect(formatBookingCode("K7M29QXA")).toBe("K7M2-9QXA");
    expect(formatBookingCode("ABC")).toBe("ABC");
    expect(formatBookingCode(null)).toBe("—");
  });
  it("AP2 a queue number has at least two digits", () => {
    expect(formatQueueNumber(7)).toBe("07");
    expect(formatQueueNumber(123)).toBe("123");
    expect(formatQueueNumber(0)).toBe("00");
    expect(formatQueueNumber(null)).toBe("—");
  });
  it("AP3 the payload: reason trimmed, profile as a number, no clinic sent as undefined", () => {
    expect(
      toBookingPayload({ patientId: "12", clinicId: "", employeeId: "", appointmentDate: "2026-11-25", reason: "  Ho  ", department: "Hô hấp" }),
    ).toEqual({ patientId: 12, clinicId: undefined, appointmentDate: "2026-11-25", reason: "Ho", department: "Hô hấp" });
  });
  it("AP4 the desk's payload has no patientId", () => {
    expect(
      toBookingPayload({ clinicId: "c1", employeeId: "3", appointmentDate: "2026-11-25", reason: "Sốt", department: "" }),
    ).not.toHaveProperty("patientId");
  });
  it("AP5 today is counted in the clinic's time zone, not UTC", () => {
    expect(clinicToday()).toBe("2026-11-22");
    expect(oldestBirthDate()).toBe("1906-11-22");
  });
  it("AP6 date of birth: today and later refused, 120 years ago taken, older refused, empty passes", () => {
    expect(birthDateProblem("2026-11-22")).toBe("Ngày sinh phải nằm ở quá khứ");
    expect(birthDateProblem("2026-11-21")).toBe(true);
    expect(birthDateProblem("1906-11-22")).toBe(true);
    expect(birthDateProblem("1906-11-21")).toBe("Vui lòng nhập năm sinh hợp lý.");
    expect(birthDateProblem("")).toBe(true);
  });
  it("AP7 a doctor is shown with their specialty when they have one", () => {
    expect(doctorLabel({ fullName: "BS. An", specialty: "Tim mạch" })).toBe("BS. An · Tim mạch");
    expect(doctorLabel({ fullName: "BS. An", specialty: null })).toBe("BS. An");
  });
  it("AP8 why a day cannot be booked: nobody working, today full, another day full", () => {
    const off = [{ day: { working: false } }] as never;
    const on = [{ day: { working: true } }] as never;
    expect(closedDayReason(off, "2026-11-23", "2026-11-22")).toBe("Ngày này phòng khám không có bác sĩ khám. Vui lòng chọn ngày khác.");
    expect(closedDayReason(on, "2026-11-22", "2026-11-22")).toBe("Hôm nay phòng khám đã hết lượt hoặc hết giờ nhận đăng ký. Vui lòng chọn ngày khác.");
    expect(closedDayReason(on, "2026-11-23", "2026-11-22")).toBe("Ngày này phòng khám đã hết lượt khám. Vui lòng chọn ngày khác.");
  });
});

describe("FE-11 / FE-21 Sharing — sharedParts", () => {
  it("SH1 what is shared, in order, as one line", () => {
    expect(sharedParts({ shareVitals: true, shareAlerts: true, shareAppointments: true })).toBe("Sinh hiệu, Cảnh báo, Lượt khám");
    expect(sharedParts({ shareVitals: false, shareAlerts: true, shareAppointments: false })).toBe("Cảnh báo");
    expect(sharedParts({ shareVitals: false, shareAlerts: false, shareAppointments: false })).toBe("");
  });
});

describe("FE-12 Reports — cellText, csvCell, reportErrorText", () => {
  it("RP1 cells as the table shows them", () => {
    expect(cellText(1234.56, "number")).toBe("1.234,6");
    expect(cellText("2026-11-22T10:00:00Z", "date")).toBe("22/11/2026");
    expect(cellText(true, "yesno")).toBe("Có");
    expect(cellText(false, "yesno")).toBe("Không");
    expect(cellText("AVAILABLE", "status")).toBe("Sẵn sàng");
    expect(cellText("UNKNOWN_X", "status")).toBe("UNKNOWN_X");
    expect(cellText(null)).toBe("");
  });
  it("RP2 a datetime is shown in Vietnam's time", () => {
    expect(cellText("2026-11-21T23:30:00Z", "datetime")).toContain("22/11/2026");
  });
  it("RP3 CSV: numbers plain, dates ISO, datetime in Vietnam", () => {
    expect(csvCell(1234.5, "number")).toBe("1234.5");
    expect(csvCell("2026-11-22T10:00:00Z", "date")).toBe("2026-11-22");
    expect(csvCell("2026-11-21T23:30:00Z", "datetime")).toBe("2026-11-22 06:30");
  });
  it("RP4 CSV: text a spreadsheet would run as a formula is defused", () => {
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell("+84912345678")).toBe("'+84912345678");
    expect(csvCell("-5")).toBe("'-5");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell("Bình thường")).toBe("Bình thường");
  });
  it("RP5 the API's refusals in Vietnamese; anything else generic", () => {
    expect(reportErrorText({ message: "The caller has no clinic" })).toBe("Tài khoản của bạn chưa gắn với cơ sở nào.");
    expect(reportErrorText({ message: "The end is before the start" })).toBe("Ngày bắt đầu phải trước ngày kết thúc.");
    expect(reportErrorText({ message: "A report covers at most a year" })).toBe("Báo cáo tối đa một năm.");
    expect(reportErrorText(null)).toBe("Không tải được báo cáo. Thử lại sau.");
  });
});

describe("FE-16 First-aid content — revisionLabel", () => {
  it("FA1 a revision reads as v<n>", () => {
    expect(revisionLabel(3)).toBe("v3");
  });
});

describe("FE-20 Audit log — auditSubject", () => {
  it("AU1 a numeric record is #id", () => {
    expect(auditSubject({ entityId: 42, before: null, after: null } as never)).toBe("#42");
  });
  it("AU2 a clinic (UUID key) is named from its state, after before before", () => {
    expect(auditSubject({ entityId: null, before: { name: "Cũ" }, after: { name: "VitalCare Hà Nội" } } as never)).toBe("VitalCare Hà Nội");
    expect(auditSubject({ entityId: null, before: { clinicId: "c-1" }, after: null } as never)).toBe("c-1");
    expect(auditSubject({ entityId: null, before: null, after: { name: "" } } as never)).toBeNull();
  });
});

describe("FE-22 Medical services — toMedicalServiceRequest, isOrderOutstanding, parseResult, resultsErrorText", () => {
  it("MS1 the request: code trimmed and upper-cased, numbers as numbers, blank description null", () => {
    expect(
      toMedicalServiceRequest({ code: " xn-01 ", name: "Xét nghiệm máu", description: "  ", price: "120000", category: "lab", turnaroundMinutes: "60", status: "active" } as never),
    ).toMatchObject({ code: "XN-01", price: 120000, turnaroundMinutes: 60, description: null });
  });
  it("MS2 an order is outstanding until it is reviewed or cancelled", () => {
    expect(isOrderOutstanding({ status: "ordered" })).toBe(true);
    expect(isOrderOutstanding({ status: "in_progress" })).toBe(true);
    expect(isOrderOutstanding({ status: "result_ready" })).toBe(true);
    expect(isOrderOutstanding({ status: "reviewed" })).toBe(false);
    expect(isOrderOutstanding({ status: "cancelled" })).toBe(false);
  });
  it("MS3 a typed result: indicators with unit, reference and flags; conclusion; the rest as description", () => {
    const parsed = parseResult(
      "Mẫu máu tĩnh mạch\n• Glucose: 7.2 ↑ mmol/L (3.9–6.4) · HbA1c: 5.6 % (< 6.5)\nKết luận: Đường huyết cao",
    );
    expect(parsed.description).toEqual(["Mẫu máu tĩnh mạch"]);
    expect(parsed.conclusion).toBe("Đường huyết cao");
    expect(parsed.indicators).toEqual([
      { name: "Glucose", value: "7.2", unit: "mmol/L", reference: "3.9–6.4", flag: "high" },
      { name: "HbA1c", value: "5.6", unit: "%", reference: "< 6.5", flag: null },
    ]);
  });
  it("MS4 a bullet that is not a measurement stays description; empty text is empty", () => {
    expect(parseResult("• Ghi chú: bệnh nhân nhịn ăn").description).toEqual(["• Ghi chú: bệnh nhân nhịn ăn"]);
    expect(parseResult(null)).toEqual({ description: [], indicators: [], conclusion: null });
  });
  it("MS5 a low flag is read", () => {
    expect(parseResult("- Tiểu cầu: 90 ↓ G/L (150–450)").indicators[0].flag).toBe("low");
  });
  it("MS6 results and feedback refusals in Vietnamese", () => {
    expect(resultsErrorText({ message: "You already gave feedback on this visit; edit it instead" })).toBe("Bạn đã góp ý cho lượt khám này; hãy sửa góp ý cũ.");
    expect(resultsErrorText({ message: "Feedback is given on a completed visit" })).toBe("Chỉ góp ý được cho lượt khám đã hoàn tất.");
    expect(resultsErrorText({ errors: { rating: "Rate from 1 to 5" } })).toBe("Chọn số sao từ 1 đến 5.");
    expect(resultsErrorText({ message: "Start the service before telling the patient when to come back for its result" })).toBe(
      "Bắt đầu thực hiện dịch vụ rồi mới hẹn giờ trả kết quả.",
    );
  });
});

describe("FE-23 Billing — translateBillingMessage, billingErrorText, createRevenueWorkbook", () => {
  it("BL1 a known message is translated by its prefix; an unknown one is kept", () => {
    expect(translateBillingMessage("Another service already has that code")).toBe("Mã dịch vụ này đã có.");
    expect(translateBillingMessage("Failed to fetch")).toBe("Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
    expect(translateBillingMessage("Something new")).toBe("Something new");
    // KAN-122: a blocked period refused by the API
    expect(translateBillingMessage("That doctor already has a period overlapping this one on that day")).toMatch(/^Bác sĩ đã có khoảng chặn trùng/);
    expect(translateBillingMessage("2 registered visit(s) fall in that time; move or cancel them first")).toMatch(/^Có 2 lượt đăng ký khám/);
  });
  it("BL2 a 422 says its field message, not 'Validation failed'; nothing is a generic retry", () => {
    expect(billingErrorText({ message: "Validation failed", errors: { file: "A file can be at most 10 MB" } })).toBe("File tối đa 10 MB.");
    expect(billingErrorText(null)).toBe("Không thực hiện được. Vui lòng thử lại.");
  });
  const day = (date: string, paid: number, unpaid: number) => ({
    date, invoices: 2, paidInvoices: 1, consultationRevenue: paid, serviceRevenue: 0, totalRevenue: paid, unpaidInvoices: 1, unpaidAmount: unpaid,
  });
  const report = {
    from: "2026-01-01",
    to: "2026-06-30",
    days: [day("2026-05-02", 300000, 0), day("2026-01-15", 100000, 50000), day("2026-02-10", 200000, 0)],
    total: { invoices: 6, paidInvoices: 3, consultationRevenue: 600000, serviceRevenue: 0, totalRevenue: 600000, unpaidInvoices: 3, unpaidAmount: 50000 },
  };
  it("BL3 the revenue workbook: summary by quarter for a year, days in date order, total row", () => {
    const book = createRevenueWorkbook(report as never, "year", "Năm 2026");
    const summary = book.getWorksheet("Tổng hợp")!;
    const details = book.getWorksheet("Chi tiết theo ngày")!;
    expect(summary.getCell("A8").value).toBe("Quý 1/2026");
    expect(summary.getCell("F8").value).toBe(300000);
    expect(summary.getCell("A9").value).toBe("Quý 2/2026");
    expect(summary.getCell("A10").value).toBe("TỔNG CỘNG");
    expect(summary.getCell("F10").value).toBe(600000);
    expect([8, 9, 10].map((r) => details.getCell(`A${r}`).value)).toEqual(["15/01/2026", "10/02/2026", "02/05/2026"]);
    expect(summary.getCell("A3").value).toBe("Từ 01/01/2026 đến 30/06/2026 · Đơn vị: VNĐ");
  });
  it("BL4 a quarter is summed by month", () => {
    const summary = createRevenueWorkbook(report as never, "quarter", "Quý 1/2026").getWorksheet("Tổng hợp")!;
    expect(["A8", "A9", "A10"].map((c) => summary.getCell(c).value)).toEqual(["Tháng 1/2026", "Tháng 2/2026", "Tháng 5/2026"]);
  });
});
