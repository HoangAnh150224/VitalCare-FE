// UC-01 Đặt lịch khám online — RULE-tagged, verified in the DB. VNPay answers are signed here with the
// test terminal's secret (the BE runs with APP_VNPAY_HASH_SECRET=testsecret-e2e), nothing reaches VNPay.
const h = require("./harness.js");
const crypto = require("crypto");
const fs = require("fs");
const { check, sql } = h;
const PHONE = "0389001001", PW = "Passw0rd!";
const SECRET = "testsecret-e2e";

function vnpReturn(payUrl, responseCode) {
  const sent = new URL(payUrl).searchParams;
  const p = { vnp_Amount: sent.get("vnp_Amount"), vnp_TxnRef: sent.get("vnp_TxnRef"), vnp_TmnCode: sent.get("vnp_TmnCode"),
    vnp_ResponseCode: responseCode, vnp_TransactionStatus: responseCode, vnp_TransactionNo: String(Date.now()).slice(-8),
    vnp_OrderInfo: sent.get("vnp_OrderInfo") };
  const enc = (s) => encodeURIComponent(s).replace(/%20/g, "+").replace(/[!'()~]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
  const query = Object.keys(p).sort().filter((k) => p[k]).map((k) => `${enc(k)}=${enc(p[k])}`).join("&");
  const hash = crypto.createHmac("sha512", SECRET).update(query, "utf8").digest("hex");
  return `${h.API}/payments/vnpay/return?${query}&vnp_SecureHash=${hash}`;
}

(async () => {
  const b = await h.browser();
  const page = await (await b.newContext()).newPage();
  const body = async () => (await page.locator("body").innerText()).replace(/\s+/g, " ");

  // RULE-29 not signed in → sign-in page
  await page.goto(h.BASE + "/my-appointments/create");
  await page.waitForURL((u) => u.pathname.startsWith("/login"), { timeout: 10000 }).catch(() => {});
  check("RULE-29 chưa đăng nhập → chuyển về đăng nhập", page.url().includes("/login"), page.url());

  await h.signIn(page, PHONE, PW);
  await page.goto(h.BASE + "/my-appointments/create");
  await page.waitForSelector("text=Người tới khám");
  await page.getByRole("combobox").filter({ hasText: "Chọn phòng khám" }).waitFor({ timeout: 10000 });
  await page.waitForTimeout(500);

  // Step 1: examinee (a relative) and day
  await page.getByRole("combobox").filter({ hasText: /Nguyễn Văn Thử|Chọn người tới khám/ }).first().click();
  await page.getByRole("option", { name: /Trần Thị Mẹ/ }).click();
  await page.waitForTimeout(500);
  await page.getByRole("combobox").filter({ hasText: "Chọn phòng khám" }).click();
  await page.getByRole("option", { name: "VitalCare Clinic", exact: true }).click();
  await page.waitForTimeout(500);
  // A1: Sunday 08/11 has no turns → the next days with places are offered
  await page.locator('input[type="date"]').fill("2026-11-08");
  await page.waitForSelector("text=Các ngày còn lượt", { timeout: 10000 }).catch(() => {});
  let t = (await page.locator("form").innerText()).replace(/\s+/g, " ");
  console.log("DEBUG", await page.getByRole("combobox").allInnerTexts(), await page.locator('input[type="date"]').inputValue());
  check("RULE-02 / A1 ngày hết suất → gợi ý các ngày còn lượt", t.includes("Các ngày còn lượt") && /9 thg 11, 2026 · còn \d+ lượt/.test(t), t.slice(0, 400));
  check("RULE-34 không gợi ý ngày nghỉ (Chủ nhật 8/11)", !/8 thg 11, 2026 · còn/.test(t));
  await page.getByRole("button", { name: /^9 thg 11, 2026 · còn/ }).click();
  check("RULE-02 / A1 bấm ngày gợi ý → chọn lại ngày", (await page.locator('input[type="date"]').inputValue()) === "2026-11-09");

  // RULE-07: reason required
  await page.getByRole("button", { name: "Đăng ký khám" }).click();
  check("RULE-07 bỏ trống lý do khám → báo lỗi", (await body()).includes("Vui lòng nhập lý do khám"));

  await page.getByPlaceholder("Theo dõi sức khỏe định kỳ").fill("Khám tổng quát cho mẹ");
  const t0 = Date.now();
  await page.getByRole("button", { name: "Đăng ký khám" }).click();
  await page.waitForURL(/\/my-appointments\/show\/\d+/, { timeout: 15000 }).catch(() => {});
  check("RULE-38 đặt lịch phản hồi < 3s", Date.now() - t0 < 3000, `${Date.now() - t0}ms`);
  const id = Number((page.url().match(/show\/(\d+)/) || [])[1]);
  check("RULE-01 bước 3 tạo lịch → sang phiếu khám", id > 0, page.url());

  // Postconditions
  const row = sql(`select status, customer_id, appointment_date, queue_number, booking_code, paid_at from appointment where id=${id}`)[0] || [];
  check("RULE-20 / RULE-26 lịch BOOKED cho người thân, đúng ngày", row[0] === "BOOKED" && row[1] === "58" && row[2] === "2026-11-09", row);
  check("RULE-25 BR-03 có số thứ tự trong ngày", Number(row[3]) >= 1, row[3]);
  const inv = sql(`select status from invoice where appointment_id=${id} and kind='EXAM'`);
  check("RULE-20 phí khám PENDING (hoá đơn UNPAID)", inv.length === 1 && inv[0][0] === "UNPAID", inv);
  await page.waitForTimeout(1500);
  check("RULE-05 BR-12 xác nhận trong app (thông báo)", sql(`select count(*) from notification where link like '%/my-appointments/show/${id}%'`)[0][0] !== "0");
  check("RULE-37 BR-12 SMS: chưa có mẫu tin → ghi log, không gửi", fs.readFileSync("C:/Users/MSI/.claude/jobs/890c0789/tmp/be.log", "utf8").includes("Booking confirmation for"));
  t = await body();
  check("RULE-34 phiếu hiện số thứ tự và mã", t.includes(row[4].slice(0, 4)), t.slice(0, 300));

  // Step 4: how to pay
  check("RULE-01 bước 4 có lựa chọn thanh toán Online / Trả tại quầy", t.includes("Chọn cách thanh toán") && t.includes("Trả tại quầy"), t.slice(0, 500));
  await page.getByRole("button", { name: "Trả tại quầy" }).click();
  t = await body();
  check("RULE-02 chọn trả tại quầy → giữ chỗ đến giờ tiếp nhận cuối (BR-10)", t.includes("Bạn sẽ trả phí khám tại quầy") && t.includes("giữ đến hết giờ tiếp nhận"));
  check("RULE-20 trả tại quầy: vẫn PENDING", sql(`select status from invoice where appointment_id=${id} and kind='EXAM'`)[0][0] === "UNPAID");

  // Online, failing first (A2)
  await page.getByRole("button", { name: "Đổi sang thanh toán online" }).click();
  let payUrl = null;
  await page.route("https://sandbox.vnpayment.vn/**", (r) => { payUrl = r.request().url(); r.abort(); });
  await page.getByRole("button", { name: /Thanh toán qua VNPay/ }).click();
  await page.waitForTimeout(2500);
  check("RULE-01 bước 5 chuyển sang cổng VNPay (đúng số tiền)", payUrl && /vnp_Amount=\d+/.test(payUrl), payUrl);
  await page.goto(vnpReturn(payUrl, "24"));
  await page.waitForURL(/payment=|\/my-appointments\/show\//, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  t = await body();
  check("RULE-03 / A2 thanh toán thất bại → báo lỗi, cho thử lại / trả tại quầy", t.includes("Thanh toán chưa thành công") || t.includes("Chọn cách thanh toán"), t.slice(0, 300));
  check("RULE-39 thanh toán lỗi: lịch vẫn BOOKED, phí vẫn PENDING",
    sql(`select a.status, i.status from appointment a join invoice i on i.appointment_id=a.id and i.kind='EXAM' where a.id=${id}`)[0].join() === "BOOKED,UNPAID");

  // Retry → success
  if (await page.getByRole("button", { name: "Thanh toán online" }).count()) await page.getByRole("button", { name: "Thanh toán online" }).click();
  payUrl = null;
  await page.getByRole("button", { name: /Thanh toán qua VNPay/ }).click();
  await page.waitForTimeout(2500);
  await page.goto(vnpReturn(payUrl, "00"));
  await page.waitForTimeout(2500);
  t = await body();
  check("RULE-36 thanh toán thành công → thông báo", t.includes("Thanh toán thành công") || t.includes("Đã thanh toán"), t.slice(0, 300));
  const paid = sql(`select a.status, i.status, a.paid_at is not null from appointment a join invoice i on i.appointment_id=a.id and i.kind='EXAM' where a.id=${id}`)[0];
  check("RULE-26 / BR-04 đã trả nhưng chưa check-in → vẫn BOOKED, PAID", paid.join() === "BOOKED,PAID,t", paid);
  const replay = await page.goto(vnpReturn(payUrl, "00"));
  check("RULE-16 callback VNPay gửi lại không ghi nhận 2 lần", sql(`select count(*) from payment p join invoice i on i.id=p.invoice_id where i.appointment_id=${id} and p.status='PAID'`)[0][0] === "1");

  // RULE-16/24: second visit at that clinic that day for the same person
  const tk = await h.token(PHONE, PW);
  const dup = await h.api("POST", "/my_appointments", { patientId: 58, clinicId: "5b1f8c2e-6a3d-4f7e-9c41-2d8e0a7b3c19", appointmentDate: "2026-11-09", reason: "Lần 2" }, tk);
  check("RULE-16 đặt trùng cùng người cùng ngày → từ chối", dup.status === 409, JSON.stringify(dup.body));
  const past = await h.api("POST", "/my_appointments", { patientId: 58, clinicId: "5b1f8c2e-6a3d-4f7e-9c41-2d8e0a7b3c19", appointmentDate: "2026-11-01", reason: "x" }, tk);
  check("RULE-12 ngày trong quá khứ → từ chối", past.status === 422, JSON.stringify(past.body));
  const other = await h.api("POST", "/my_appointments", { patientId: 1, clinicId: "5b1f8c2e-6a3d-4f7e-9c41-2d8e0a7b3c19", appointmentDate: "2026-11-10", reason: "x" }, tk);
  check("RULE-31 đặt cho hồ sơ không thuộc tài khoản → từ chối", other.status === 422, JSON.stringify(other.body));
  const staffApi = await h.api("GET", "/appointments", undefined, tk);
  check("RULE-30/32 bệnh nhân gọi API của quầy → 403", staffApi.status === 403, staffApi.status);

  // BR-11: three no-shows → online only
  const second = await h.api("POST", "/my_appointments", { clinicId: "5b1f8c2e-6a3d-4f7e-9c41-2d8e0a7b3c19", appointmentDate: "2026-11-10", reason: "Tái khám" }, tk);
  const third = await h.api("POST", "/my_appointments", { patientId: 58, clinicId: "5b1f8c2e-6a3d-4f7e-9c41-2d8e0a7b3c19", appointmentDate: "2026-11-11", reason: "Tái khám" }, tk);
  sql(`update appointment set status='NO_SHOW' where id in (144, 145, ${third.body.id})`);
  const rules = (await h.api("GET", "/my_appointments/payment-rules", undefined, tk)).body;
  check("RULE-25 BR-11 đếm 3 lần NO_SHOW của tài khoản", rules.noShows === 3 && rules.onlinePaymentRequired === true, JSON.stringify(rules));
  await page.goto(h.BASE + "/my-appointments/show/" + second.body.id);
  await page.waitForSelector("text=Phí khám", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);
  t = await body();
  check("RULE-27 BR-11 ẩn 'Trả tại quầy', báo cần thanh toán online", !t.includes("Trả tại quầy") && t.includes("3 lần không đến"), t.slice(0, 500));

  // RULE-34 phone layout
  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check("RULE-34 phiếu trên điện thoại không tràn ngang", !overflow);

  fs.writeFileSync("C:/Users/MSI/.claude/jobs/890c0789/tmp/uc01-ids.json", JSON.stringify({ paidVisit: id, second: second.body.id, third: third.body.id }));
  await b.close();
  h.summary("UC01");
})().catch((e) => { console.error(e); h.summary("UC01"); process.exit(1); });
