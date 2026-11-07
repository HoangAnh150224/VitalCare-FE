// UC-02 part 2: B1 late (paid online) → walk-in, cancelled → walk-in, not found, refuse.
const h = require("./harness.js");
const fs = require("fs");
const { check, sql } = h;
const TODAY = "2026-11-07";
const C1 = "5b1f8c2e-6a3d-4f7e-9c41-2d8e0a7b3c19";
const ids = JSON.parse(fs.readFileSync("C:/Users/MSI/.claude/jobs/890c0789/tmp/uc01-ids.json", "utf8"));

(async () => {
  const desk = await h.token("0900000002", "Manager@123");
  const before = sql(`select status from appointment where id=${ids.paidVisit}`)[0][0];
  check("RULE-39 lần chuyển lỗi trước (500) đã rollback: lịch trễ vẫn BOOKED, không có lượt mồ côi", before === "BOOKED" &&
    sql(`select count(*) from appointment where customer_id=58 and appointment_date='${TODAY}' and status not in ('CANCELLED','NO_SHOW')`)[0][0] === "0", before);
  const late = sql(`select booking_code from appointment where id=${ids.paidVisit}`)[0][0];
  const [Z] = sql(`select c.id from customer c where c.deleted_at is null and c.date_of_birth is not null and c.gender is not null
      and c.id not in (57,58) and not exists (select 1 from appointment a where a.customer_id=c.id and a.appointment_date in ('${TODAY}','2026-11-12','2026-11-13') and a.status not in ('CANCELLED','NO_SHOW'))
      order by c.id desc limit 1`).map((r) => Number(r[0]));
  const cancelled = (await h.api("POST", "/appointments", { customerId: Z, clinicId: C1, appointmentDate: "2026-11-12", reason: "Đau đầu" }, desk)).body;
  await h.api("POST", `/appointments/${cancelled.id}/cancel`, { reason: "Bệnh nhân gọi huỷ" }, desk);

  const b = await h.browser();
  const page = await (await b.newContext()).newPage();
  const body = async () => (await page.locator("#main-content").innerText()).replace(/\s+/g, " ");
  const search = async (term) => {
    await page.goto(h.BASE + "/appointments/check-in");
    await page.locator("#booking-code").fill(term);
    await page.getByRole("button", { name: "Tra cứu" }).click();
    await page.waitForTimeout(2000);
  };
  await h.signIn(page, "0900000002", "Manager@123");

  // B1 late, already paid online → walk-in today, fee carried
  await search(late);
  let t = await body();
  check("RULE-34 B1 đến trễ → báo đã qua ngày, phí đã trả sẽ chuyển", t.includes("đã qua ngày hẹn") && t.includes("Phí khám đã trả sẽ được chuyển"), t.slice(0, 300));
  await page.getByRole("button", { name: "Chuyển sang khám trực tiếp" }).click();
  await page.waitForURL(/\/appointments\/show\/\d+/, { timeout: 10000 }).catch(() => {});
  const fresh = Number((page.url().match(/show\/(\d+)/) || [])[1]);
  let r = fresh ? sql(`select status, appointment_date, customer_id, paid_at is not null from appointment where id=${fresh}`)[0] : null;
  check("RULE-02 B1 chuyển walk-in: lượt mới hôm nay, cùng hồ sơ, đã trả → vào hàng chờ ngay (BR-04)", r && r.join() === `READY_FOR_EXAMINATION,${TODAY},58,t`, r || page.url());
  check("RULE-05 lịch cũ → NO_SHOW", sql(`select status from appointment where id=${ids.paidVisit}`)[0][0] === "NO_SHOW");
  const bills = fresh ? sql(`select appointment_id, status from invoice where kind='EXAM' and appointment_id in (${ids.paidVisit}, ${fresh}) order by id`) : [];
  check("RULE-19/25 tiền đã trả chuyển sang lượt mới, hoá đơn mới bị huỷ, không thu 2 lần",
    bills.filter((x) => x[1] === "PAID").length === 1 && (bills.find((x) => x[1] === "PAID") || [])[0] === String(fresh) && bills.some((x) => x[1] === "CANCELLED"), bills);
  const again = await h.api("POST", `/appointments/${ids.paidVisit}/walk-in`, {}, desk);
  check("RULE-16/23 bấm chuyển walk-in lần 2 → từ chối, không tạo thêm", again.status === 409, JSON.stringify(again.body));

  // B1 cancelled → walk-in, charged normally
  await search(cancelled.bookingCode);
  t = await body();
  check("RULE-34 B1 lịch đã huỷ → cho chuyển walk-in", t.includes("Lượt này đã bị huỷ"), t.slice(0, 300));
  await page.getByRole("button", { name: "Chuyển sang khám trực tiếp" }).click();
  await page.waitForURL(/\/appointments\/show\/\d+/, { timeout: 10000 }).catch(() => {});
  const fromCancelled = Number((page.url().match(/show\/(\d+)/) || [])[1]);
  r = fromCancelled ? sql(`select a.status, i.status from appointment a join invoice i on i.appointment_id=a.id and i.kind='EXAM' where a.id=${fromCancelled}`)[0] : null;
  check("RULE-26 lượt từ lịch huỷ: CHECKED_IN, phí PENDING (thu như thường)", r && r.join() === "CHECKED_IN,UNPAID", r || page.url());

  // Not found
  await search("0999999990");
  t = await body();
  check("RULE-03 B1 không tìm thấy → gợi ý khám trực tiếp", t.includes("Không tìm thấy lượt đăng ký khám") && (await page.getByRole("link", { name: "khám trực tiếp" }).count()) > 0, t.slice(0, 300));

  // Refuse = cancel with a reason
  const toRefuse = (await h.api("POST", "/appointments", { customerId: Z, clinicId: C1, appointmentDate: "2026-11-13", reason: "x" }, desk)).body;
  const noReason = await h.api("POST", `/appointments/${toRefuse.id}/cancel`, { reason: "" }, desk);
  check("RULE-07 từ chối (huỷ) không lý do → báo lỗi", noReason.status === 422, noReason.status);
  await h.api("POST", `/appointments/${toRefuse.id}/cancel`, { reason: "Sai thông tin" }, desk);
  check("RULE-26 B1 từ chối → CANCELLED, trả suất", sql(`select status, cancel_reason from appointment where id=${toRefuse.id}`)[0].join() === "CANCELLED,Sai thông tin");
  const ok = await h.api("POST", `/appointments/${toRefuse.id}/check-in`, {}, desk);
  check("RULE-26 lịch đã huỷ không check-in được (chuyển trạng thái không hợp lệ)", ok.status === 409, ok.status);

  await b.close();
  h.summary("UC02b");
})().catch((e) => { console.error(e); h.summary("UC02b"); process.exit(1); });
