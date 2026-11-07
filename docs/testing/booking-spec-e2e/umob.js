// Mobile app (Flutter, run as a web build at a phone's size) — UC-04 sign-up with profile claim, D2,
// and UC-01 steps 4–8 on the visit's screen (status, fee, online / desk choice, BR-11). RULE-tagged, DB-checked.
const h = require("./harness.js");
const { check, sql } = h;
const M = "http://localhost:5190/";
const PHONE = "0389001014", E164 = "+84389001014";
const C1 = "5b1f8c2e-6a3d-4f7e-9c41-2d8e0a7b3c19";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const desk = await h.token("0900000002", "Manager@123");
  await h.api("POST", "/appointments/walk-in", { newPatient: { fullName: "Hoàng Văn Động", phone: PHONE, dateOfBirth: "1992-04-04", gender: "male" }, clinicId: C1, reason: "Khám" }, desk);
  const walkIn = sql(`select id from customer where phone='${E164}'`)[0][0];

  const b = await h.browser();
  const page = await (await b.newContext({ viewport: { width: 412, height: 915 } })).newPage();
  const semantics = async () => {
    await page.evaluate(() => document.querySelector("flt-semantics-placeholder")?.click());
    await wait(800);
  };
  const text = async () => (await page.evaluate(() => [...document.querySelectorAll("flt-semantics")].map((e) => e.getAttribute("aria-label") || "").join(" ") + " " + (document.querySelector("flt-semantics-host")?.innerText || ""))).replace(/\s+/g, " ");
  const tap = async (name) => { await page.getByRole("button", { name }).first().click(); await wait(1200); };
  const type = async (label, value) => { const f = page.getByRole("textbox", { name: label }).first(); await f.click(); await f.fill(value); await wait(200); };

  await page.goto(M);
  await wait(6000);
  await semantics();
  await tap("Chưa có tài khoản? Đăng ký");
  check("RULE-34 (mobile) có màn Đăng ký từ trang đăng nhập", (await text()).includes("Gửi mã xác nhận qua SMS"), (await text()).slice(0, 200));

  // RULE-07 empty
  await tap("Gửi mã xác nhận qua SMS");
  let t = await text();
  check("RULE-07 (mobile) bỏ trống → báo lỗi tiếng Việt", t.includes("Vui lòng nhập số điện thoại") && t.includes("Vui lòng nhập họ và tên"), t.slice(0, 300));

  // D2 a registered number
  await type("Số điện thoại", "0900000002");
  await type("Họ và tên", "Hoàng Văn Động");
  await type("Mật khẩu", "Passw0rd!");
  await type("Nhập lại mật khẩu", "Passw0rd!");
  await tap("Gửi mã xác nhận qua SMS");
  await wait(1500);
  t = await text();
  check("RULE-17 / D2 (mobile) số đã đăng ký → 'Số này đã đăng ký.' + Quên mật khẩu", t.includes("Số này đã đăng ký") && t.includes("Quên mật khẩu?"), t.slice(0, 300));

  // Main flow: code, then the masked profile list
  await type("Số điện thoại", PHONE);
  await tap("Gửi mã xác nhận qua SMS");
  await wait(2000);
  t = await text();
  check("RULE-01 (mobile) sang bước nhập mã PIN", t.includes("đăng ký tài khoản cho số điện thoại"), t.slice(0, 300));
  const otp = h.lastOtp("REGISTER");
  const first = page.getByRole("textbox").first();
  await first.click();
  await first.fill(otp);
  await wait(500);
  await tap("Xác nhận");
  await wait(2500);
  t = await text();
  check("RULE-31 BR-14 (mobile) danh sách hồ sơ che tên 'Hoàng V*** Động – 1992'", t.includes("Chọn hồ sơ của bạn") && t.includes("Hoàng V*** Động – 1992") && !t.includes("Hoàng Văn Động –"), t.slice(0, 400));
  check("RULE-34 (mobile) có lựa chọn 'Không phải tôi'", t.includes("Không phải tôi"));
  await page.getByRole("radio", { name: /Hoàng V\*\*\* Động/ }).first().click().catch(async () => { await page.getByText("Hoàng V*** Động – 1992").click(); });
  await wait(500);
  await tap("Tạo tài khoản");
  await wait(2500);
  const user = sql(`select id from users where phone='${E164}'`);
  check("RULE-20 (mobile) tạo tài khoản, liên kết đúng hồ sơ walk-in", user.length === 1 && sql(`select user_id from customer where id=${walkIn}`)[0][0] === user[0][0], user);
  t = await text();
  check("RULE-36 (mobile) đăng ký xong → về đăng nhập, báo thành công", t.includes("Đăng nhập"), t.slice(0, 200));

  // Sign in, a visit booked (API), its screen: status, fee and the payment choice
  const tk = await h.token(PHONE, "Passw0rd!");
  const visit = (await h.api("POST", "/my_appointments", { clinicId: C1, appointmentDate: "2026-11-09", reason: "Khám từ app" }, tk)).body;
  await page.goto(M);
  await wait(5000);
  await semantics();
  await type("Nhập số điện thoại", PHONE);
  await type("Nhập mật khẩu", "Passw0rd!");
  await page.getByRole("button", { name: "Đăng nhập" }).last().click(); await wait(1500);
  await wait(4000);
  await semantics();
  t = await text();
  check("RULE-01 (mobile) đăng nhập vào trang chủ", !t.includes("Chưa có tài khoản? Đăng ký"), t.slice(0, 200));
  const tabs = [];
  const openVisits = async () => { await page.locator('[role=tab][aria-label="Lịch hẹn"]').click(); await wait(2500); };
  await openVisits();
  await wait(2500);
  t = await text();
  check("RULE-34 (mobile) danh sách hiện trạng thái mới 'Đã đặt lịch'", t.includes("Đã đặt lịch"), (tabs.join("|") + " " + t).slice(0, 300));
  await page.getByRole("button", { name: /Khám từ app|9\/11|Đã đặt lịch/ }).first().click().catch(() => page.getByText("Đã đặt lịch").first().click());
  await wait(3500);
  t = await text();
  check("RULE-01 bước 4 (mobile) chi tiết lịch: phí khám chưa thanh toán + chọn Online / Trả tại quầy", t.includes("Chưa thanh toán") && t.includes("Thanh toán online (VNPay)") && t.includes("Trả tại quầy"), t.slice(0, 500));
  await tap("Trả tại quầy");
  t = await text();
  check("RULE-02 (mobile) chọn trả tại quầy → giữ chỗ đến hết giờ tiếp nhận", t.includes("Bạn sẽ trả phí khám tại quầy"), t.slice(0, 300));
  check("RULE-20 (mobile) trả tại quầy: phí vẫn PENDING", sql(`select status from invoice where appointment_id=${visit.id} and kind='EXAM'`)[0][0] === "UNPAID");

  // BR-11: three no-shows on this account → no desk option
  const extra = [];
  for (const d of ["2026-11-10", "2026-11-11", "2026-11-12"]) extra.push((await h.api("POST", "/my_appointments", { clinicId: C1, appointmentDate: d, reason: "x" }, tk)).body.id);
  sql(`update appointment set status='NO_SHOW' where id in (${extra.join(",")})`);
  await page.reload(); await wait(5000); await semantics();
  await type("Nhập số điện thoại", PHONE).catch(() => {});
  if (await page.getByRole("button", { name: "Đăng nhập" }).count()) { await type("Nhập mật khẩu", "Passw0rd!"); await page.getByRole("button", { name: "Đăng nhập" }).last().click(); await wait(1500); await wait(4000); await semantics(); }
  await openVisits();
  // The one still booked (the other three are no-shows now).
  await page.locator("flt-semantics[role=button]").filter({ hasText: "Đã đặt lịch" }).first().click();
  await wait(3500);
  t = await text();
  check("RULE-27 BR-11 (mobile) 3 lần không đến → ẩn 'Trả tại quầy', yêu cầu online", !t.includes("Trả tại quầy") && t.includes("3 lần không đến"), t.slice(0, 400));

  await page.screenshot({ path: "C:/Users/MSI/.claude/jobs/890c0789/tmp/m-detail.png" });
  await b.close();
  h.summary("UC-mobile");
})().catch(async (e) => { console.error(e); h.summary("UC-mobile"); process.exit(1); });
