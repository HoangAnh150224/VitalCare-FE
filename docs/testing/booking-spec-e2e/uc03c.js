// UC-03 C1 again: working hours are hard-deleted rows, so the day is emptied by deleting them, then restored.
const h = require("./harness.js");
const { check, sql } = h;
const saved = sql("select id, employee_id, start_time, end_time, visit_minutes, coalesce(exam_room_id::text,'null') from doctor_working_hours where id in (218, 219)");
const restore = () => {
  for (const [id, emp, s, e, m, room] of saved) {
    sql(`insert into doctor_working_hours (id, employee_id, day_of_week, start_time, end_time, visit_minutes, created_at, version, exam_room_id)
         values (${id}, ${emp}, 6, '${s}', '${e}', ${m}, now(), 0, ${room}) on conflict (id) do nothing`);
  }
};
(async () => {
  sql("delete from doctor_working_hours where id in (218, 219)");
  const b = await h.browser();
  const page = await (await b.newContext()).newPage();
  await h.signIn(page, "0900000002", "Manager@123");
  await page.goto(h.BASE + "/appointments/walk-in");
  await page.getByRole("radio", { name: "Khách mới" }).click();
  const box = page.getByRole("combobox").filter({ hasText: "Chọn phòng khám" });
  await box.click();
  await page.getByRole("option", { name: "VitalCare Clinic", exact: true }).click();
  await page.waitForTimeout(2500);
  const t = (await page.locator("#main-content").innerText()).replace(/\s+/g, " ");
  check("RULE-24 / C1 hôm nay hết suất → báo, kèm các ngày còn lượt", t.includes("hết lượt") && t.includes("Các ngày còn lượt"), t.slice(0, 400));
  check("RULE-27 C1 walk-in không chọn được ngày khác (chỉ để báo bệnh nhân)", (await page.getByRole("button", { name: /thg 11, 2026 · còn/ }).count()) === 0);
  const desk = await h.token("0900000002", "Manager@123");
  const full = await h.api("POST", "/appointments/walk-in", { newPatient: { fullName: "Phạm Văn Hết", phone: "0389001005", dateOfBirth: "1970-01-01", gender: "male" }, clinicId: "5b1f8c2e-6a3d-4f7e-9c41-2d8e0a7b3c19", reason: "x" }, desk);
  check("RULE-39 / C1 hết suất: API từ chối, không để lại hồ sơ mồ côi (all-or-nothing)", full.status === 422 && sql("select count(*) from customer where phone='+84389001005'")[0][0] === "0", JSON.stringify(full.body));
  check("RULE-35 lỗi hết suất bằng tiếng Việt trên giao diện", t.includes("Ngày này phòng khám không có bác sĩ khám hoặc đã hết lượt"));
  await b.close();
  restore();
  check("RULE-39 khôi phục ca làm việc sau test", sql("select count(*) from doctor_working_hours where id in (218, 219)")[0][0] === "2");
  h.summary("UC03c");
})().catch((e) => { console.error(e); restore(); h.summary("UC03c"); process.exit(1); });
