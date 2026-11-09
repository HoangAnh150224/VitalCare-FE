// UC-02 Check-in tại quầy cho lịch đặt trước (B1 cases, B2) — RULE-tagged, verified in the DB.
const h = require("./harness.js");
const fs = require("fs");
const { check, sql } = h;
const C1 = "5b1f8c2e-6a3d-4f7e-9c41-2d8e0a7b3c19";
const TODAY = "2026-11-07";
const ids = JSON.parse(fs.readFileSync("C:/Users/MSI/.claude/jobs/890c0789/tmp/uc01-ids.json", "utf8"));

(async () => {
  const desk = await h.token("0900000002", "Manager@123");
  const patient = await h.token("0389001001", "Passw0rd!");

  // --- data ---
  let A = (await h.api("POST", "/my_appointments", { clinicId: C1, appointmentDate: TODAY, reason: "Khám hôm nay" }, patient)).body;
  if (!A.id) {
    const [id, code] = sql(`select id, booking_code from appointment where customer_id=57 and appointment_date='${TODAY}' and status='BOOKED'`)[0];
    A = { id: Number(id), bookingCode: code };
  }
  sql(`update appointment set appointment_date='2026-11-06' where id=${ids.paidVisit}`);
  const late = sql(`select booking_code from appointment where id=${ids.paidVisit}`)[0][0];
  const [Y, Z] = sql(`select c.id from customer c where c.deleted_at is null and c.date_of_birth is not null and c.gender is not null
      and c.id not in (57,58) and not exists (select 1 from appointment a where a.customer_id=c.id and a.appointment_date in ('${TODAY}','2026-11-10','2026-11-12') and a.status not in ('CANCELLED','NO_SHOW'))
      order by c.id limit 2`).map((r) => Number(r[0]));
  sql(`update customer set national_id='079199000123' where id=${Y}`);
  const early = (await h.api("POST", "/appointments", { customerId: Y, clinicId: C1, appointmentDate: "2026-11-10", reason: "Tái khám" }, desk)).body;
  const cancelled = (await h.api("POST", "/appointments", { customerId: Z, clinicId: C1, appointmentDate: "2026-11-12", reason: "Đau đầu" }, desk)).body;
  await h.api("POST", `/appointments/${cancelled.id}/cancel`, { reason: "Bệnh nhân gọi huỷ" }, desk);
  check("RULE-04 dữ liệu chuẩn bị đủ (A hôm nay, trễ đã trả, sớm, đã huỷ)", A.id && early.id && cancelled.id && late, JSON.stringify({ A: A.id, early: early.id, cancelled: cancelled.id }));

  const b = await h.browser();
  const page = await (await b.newContext()).newPage();
  const body = async () => (await page.locator("#main-content").innerText()).replace(/\s+/g, " ");
  const search = async (term) => {
    await page.goto(h.BASE + "/appointments/check-in");
    await page.locator("#booking-code").fill(term);
    await page.getByRole("button", { name: "Tra cứu" }).click();
    await page.waitForTimeout(2000);
  };

  // RULE-30 a patient cannot open the desk screen
  await h.signIn(page, "0389001001", "Passw0rd!");
  await page.goto(h.BASE + "/appointments/check-in");
  await page.waitForTimeout(2000);
  check("RULE-30 bệnh nhân không vào được màn quầy", !(await page.locator("#booking-code").count()));
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());

  await h.signIn(page, "0900000002", "Manager@123");

  // Step 1–2 by phone (not a code) → list, today's first
  await search("0389001001");
  let t = await body();
  check("RULE-01 bước 2 tìm theo SĐT → danh sách lượt", t.includes("Nguyễn Văn Thử") && t.includes(A.bookingCode.slice(0, 4)), t.slice(0, 400));
  await page.getByRole("button", { name: new RegExp(A.bookingCode.slice(0, 4)) }).first().click();
  await page.waitForTimeout(800);

  // B1 wrong examinee, same account
  await page.getByRole("button", { name: "Sai người khám?" }).click();
  await page.waitForTimeout(1500);
  await page.getByRole("combobox").filter({ hasText: "Chọn hồ sơ trong tài khoản" }).click();
  await page.getByRole("option", { name: /Trần Thị Mẹ/ }).click();
  await page.getByRole("button", { name: "Đổi người khám" }).click();
  await page.waitForTimeout(1500);
  let r = sql(`select a.customer_id, i.customer_id from appointment a join invoice i on i.appointment_id=a.id and i.kind='EXAM' and i.status<>'CANCELLED' where a.id=${A.id}`)[0];
  check("RULE-21 B1 sai người (cùng tài khoản) → đổi người khám, hoá đơn theo", r.join() === "58,58", r);
  const back = await h.api("POST", `/appointments/${A.id}/examinee`, { customerId: 57 }, desk);
  check("RULE-21 đổi lại người khám ban đầu", back.status === 200 && sql(`select customer_id from appointment where id=${A.id}`)[0][0] === "57");
  const stranger = await h.api("POST", `/appointments/${A.id}/examinee`, { customerId: Y }, desk);
  check("RULE-27/31 đổi sang hồ sơ tài khoản khác → từ chối", stranger.status === 422, JSON.stringify(stranger.body));

  // Step 3–4: check in by code (unpaid → CHECKED_IN)
  await search(A.bookingCode);
  await page.getByRole("button", { name: "Tiếp nhận" }).click();
  await page.getByRole("button", { name: "Xác nhận tiếp nhận" }).click();
  await page.waitForTimeout(1500);
  r = sql(`select status, checked_in_at is not null, paid_at is null from appointment where id=${A.id}`)[0];
  check("RULE-26 bước 4 check-in, chưa trả phí → CHECKED_IN (chưa vào hàng chờ)", r.join() === "CHECKED_IN,t,t", r);
  check("RULE-36 thông báo đã tiếp nhận", (await body()).includes("Đã tiếp nhận"));

  // Already checked in (quét trùng)
  await search(A.bookingCode);
  t = await body();
  check("RULE-16 B1 quét trùng → báo đã tiếp nhận, không tạo gì mới", t.includes("Lượt này đã được tiếp nhận") && !(await page.getByRole("button", { name: "Tiếp nhận" }).count()), t.slice(0, 300));
  const dupCheckIn = await h.api("POST", `/appointments/${A.id}/check-in`, {}, desk);
  check("RULE-26 check-in lần 2 qua API → 409", dupCheckIn.status === 409);

  // Step 5–7: fee at the desk → READY_FOR_EXAMINATION
  await page.goto(h.BASE + "/appointments/show/" + A.id);
  await page.getByRole("button", { name: "Thu phí khám" }).click();
  await page.getByRole("button", { name: /Xác nhận đã thu/ }).click();
  await page.waitForTimeout(2000);
  r = sql(`select a.status, a.paid_at is not null, i.status from appointment a join invoice i on i.appointment_id=a.id and i.kind='EXAM' and i.status<>'CANCELLED' where a.id=${A.id}`)[0];
  check("RULE-26 BR-04 check-in + PAID → READY_FOR_EXAMINATION", r.join() === "READY_FOR_EXAMINATION,t,PAID", r);
  await page.reload(); await page.waitForTimeout(1500);
  check("RULE-34 bước 8 có nút In phiếu khám khi đã vào hàng chờ", (await page.getByRole("button", { name: "In phiếu khám" }).count()) > 0);
  const board = (await h.api("GET", `/appointments?status=ready_for_examination&appointmentDate=${TODAY}`, undefined, desk)).body;
  check("RULE-25 BR-05 lượt nằm trong hàng chờ hôm nay", Array.isArray(board) && board.some((x) => x.id === A.id), JSON.stringify(board).slice(0, 200));

  // B1 early: by citizen id → move to today → check in
  await search("079199000123");
  t = await body();
  check("RULE-01 bước 1 tìm theo CCCD", t.includes(early.bookingCode.slice(0, 4)), t.slice(0, 300));
  await page.getByRole("button", { name: new RegExp(early.bookingCode.slice(0, 4)) }).first().click();
  await page.waitForTimeout(800);
  check("RULE-34 B1 đến sớm → gợi ý đổi sang hôm nay", (await body()).includes("đến sớm hơn ngày hẹn"));
  await page.getByRole("button", { name: "Đổi sang hôm nay" }).click();
  await page.waitForTimeout(2000);
  r = sql(`select appointment_date, status from appointment where id=${early.id}`)[0];
  check("RULE-21 B1 đến sớm, còn suất → lịch chuyển sang hôm nay", r.join() === `${TODAY},BOOKED`, r);
  check("RULE-34 sau khi sửa → hiện nút Tiếp nhận", (await page.getByRole("button", { name: "Tiếp nhận" }).count()) > 0);

  // B1 late, already paid online → walk-in today, fee carried
  await search(late);
  t = await body();
  // J-01 may already have marked it a no-show (it sweeps every 20 s here): both read as "came late".
  check("RULE-34 B1 đến trễ / NO_SHOW → báo, phí đã trả sẽ chuyển", (t.includes("đã qua ngày hẹn") || t.includes("đã ghi nhận không đến")) && t.includes("Phí khám đã trả sẽ được chuyển"), t.slice(0, 300));
  await page.getByRole("button", { name: "Chuyển sang khám trực tiếp" }).click();
  await page.waitForURL(/\/appointments\/show\/\d+/, { timeout: 10000 }).catch(() => {});
  const fresh = Number((page.url().match(/show\/(\d+)/) || [])[1]);
  r = sql(`select status, appointment_date, customer_id, paid_at is not null from appointment where id=${fresh}`)[0];
  check("RULE-02 B1 chuyển walk-in: lượt mới hôm nay, cùng hồ sơ, đã trả → vào hàng chờ ngay", r && r.join() === `READY_FOR_EXAMINATION,${TODAY},58,t`, r);
  check("RULE-05 lịch cũ → NO_SHOW", sql(`select status from appointment where id=${ids.paidVisit}`)[0][0] === "NO_SHOW");
  const bills = sql(`select appointment_id, status from invoice where kind='EXAM' and appointment_id in (${ids.paidVisit}, ${fresh}) order by id`);
  check("RULE-19/25 tiền đã trả chuyển sang lượt mới, hoá đơn mới bị huỷ, không thu 2 lần",
    bills.filter((x) => x[1] === "PAID").length === 1 && bills.find((x) => x[1] === "PAID")[0] === String(fresh) && bills.some((x) => x[1] === "CANCELLED"), bills);
  const again = await h.api("POST", `/appointments/${ids.paidVisit}/walk-in`, {}, desk);
  check("RULE-16/23 bấm chuyển walk-in lần 2 → từ chối, không tạo thêm", again.status === 409, JSON.stringify(again.body));

  // B1 cancelled → walk-in, charged normally
  await search(cancelled.bookingCode);
  t = await body();
  check("RULE-34 B1 lịch đã huỷ → cho chuyển walk-in", t.includes("Lượt này đã bị huỷ"), t.slice(0, 300));
  await page.getByRole("button", { name: "Chuyển sang khám trực tiếp" }).click();
  await page.waitForURL(/\/appointments\/show\/\d+/, { timeout: 10000 }).catch(() => {});
  const fromCancelled = Number((page.url().match(/show\/(\d+)/) || [])[1]);
  r = sql(`select a.status, i.status from appointment a join invoice i on i.appointment_id=a.id and i.kind='EXAM' where a.id=${fromCancelled}`)[0];
  check("RULE-26 lượt từ lịch huỷ: CHECKED_IN, phí PENDING (thu như thường)", r && r.join() === "CHECKED_IN,UNPAID", r);

  // Not found
  await search("0999999990");
  t = await body();
  check("RULE-03 B1 không tìm thấy → gợi ý khám trực tiếp", t.includes("Không tìm thấy lượt đăng ký khám") && (await page.getByRole("link", { name: "khám trực tiếp" }).count()) > 0, t.slice(0, 300));

  // B1 refuse = cancel with reason (existing), on the early visit now today? keep it: use API on a fresh booking
  const toRefuse = (await h.api("POST", "/appointments", { customerId: Z, clinicId: C1, appointmentDate: "2026-11-13", reason: "x" }, desk)).body;
  const noReason = await h.api("POST", `/appointments/${toRefuse.id}/cancel`, { reason: "" }, desk);
  check("RULE-07 từ chối (huỷ) không lý do → báo lỗi", noReason.status === 422);
  await h.api("POST", `/appointments/${toRefuse.id}/cancel`, { reason: "Sai thông tin" }, desk);
  check("RULE-26 B1 từ chối → CANCELLED, trả suất", sql(`select status, cancel_reason from appointment where id=${toRefuse.id}`)[0].join() === "CANCELLED,Sai thông tin");

  fs.writeFileSync("C:/Users/MSI/.claude/jobs/890c0789/tmp/uc02-ids.json", JSON.stringify({ A: A.id, early: early.id, fresh, fromCancelled, toRefuse: toRefuse.id, Y, Z }));
  await b.close();
  h.summary("UC02");
})().catch((e) => { console.error(e); h.summary("UC02"); process.exit(1); });
