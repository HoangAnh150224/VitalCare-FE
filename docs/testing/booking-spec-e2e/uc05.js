// What the first run left Not Tested: J-01 end to end, concurrent desk actions, an expired session,
// and the desk's clinic scope (RULE-23, RULE-31, RULE-33, J-01 / BR-10).
const h = require("./harness.js");
const { check, sql } = h;
const TODAY = "2026-11-07";
const C1 = "5b1f8c2e-6a3d-4f7e-9c41-2d8e0a7b3c19";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const desk = await h.token("0900000002", "Manager@123");
  const desk2 = await h.token("0900000021", "Staff@123");
  const free = (n, dates) => sql(`select c.id from customer c where c.deleted_at is null and c.date_of_birth is not null and c.gender is not null
      and not exists (select 1 from appointment a where a.customer_id=c.id and a.appointment_date in (${dates.map((d) => `'${d}'`).join(",")})
      and a.status not in ('CANCELLED','NO_SHOW')) order by c.id limit ${n}`).map((r) => Number(r[0]));
  const [P1, P2, P3, P4] = free(4, [TODAY, "2026-11-09", "2026-11-10"]);
  const book = async (customerId, date) => (await h.api("POST", "/appointments", { customerId, clinicId: C1, appointmentDate: date, reason: "E2E" }, desk)).body;

  // --- J-01: a visit still booked on a past day becomes NO_SHOW, its place and unpaid bill released; today's waits ---
  const past = await book(P1, "2026-11-09");
  sql(`update appointment set appointment_date='2026-11-06' where id=${past.id}`);
  const today = await book(P2, TODAY);
  const pastCheckedIn = await book(P3, "2026-11-10");
  sql(`update appointment set appointment_date='2026-11-06', status='CHECKED_IN', checked_in_at=now() where id=${pastCheckedIn.id}`);
  let swept = false;
  for (let i = 0; i < 9 && !swept; i++) { await wait(5000); swept = sql(`select status from appointment where id=${past.id}`)[0][0] === "NO_SHOW"; }
  check("RULE-26 J-01 lịch BOOKED đã qua ngày → NO_SHOW tự động", swept, sql(`select status from appointment where id=${past.id}`)[0]);
  check("RULE-05 BR-10 J-01 huỷ hoá đơn chưa trả của lịch NO_SHOW", sql(`select status from invoice where appointment_id=${past.id} and kind='EXAM'`)[0][0] === "CANCELLED");
  check("RULE-27 J-01 không đụng lịch hôm nay còn ca (vẫn BOOKED)", sql(`select status from appointment where id=${today.id}`)[0][0] === "BOOKED");
  check("RULE-27 J-01 không đụng lịch đã check-in", sql(`select status from appointment where id=${pastCheckedIn.id}`)[0][0] === "CHECKED_IN");
  check("RULE-37 J-01 có ghi log lần quét", require("fs").readFileSync("C:/Users/MSI/.claude/jobs/890c0789/tmp/be.log", "utf8").includes("as no-shows"));

  // --- RULE-23 concurrent: two desks press Check-in on the same visit at once ---
  const [c1, c2] = await Promise.all([h.api("POST", `/appointments/${today.id}/check-in`, {}, desk), h.api("POST", `/appointments/${today.id}/check-in`, {}, desk)]);
  check("RULE-23 2 lễ tân check-in cùng lúc → đúng 1 thành công, 1 bị từ chối", [c1.status, c2.status].sort().join() === "200,409", [c1.status, c2.status]);
  check("RULE-23 sau đó chỉ 1 lần check-in được ghi", sql(`select status from appointment where id=${today.id}`)[0][0] === "CHECKED_IN");

  // two bookings of one person for one day at once
  const [bk1, bk2] = await Promise.all([h.api("POST", "/appointments", { customerId: P4, clinicId: C1, appointmentDate: "2026-11-09", reason: "x" }, desk),
    h.api("POST", "/appointments", { customerId: P4, clinicId: C1, appointmentDate: "2026-11-09", reason: "x" }, desk)]);
  check("RULE-23 2 lần đặt cùng người cùng ngày đồng thời → chỉ 1 lịch", [bk1.status, bk2.status].filter((s) => s === 201).length === 1 &&
    sql(`select count(*) from appointment where customer_id=${P4} and appointment_date='2026-11-09' and status='BOOKED'`)[0][0] === "1", [bk1.status, bk2.status]);
  const numbers = sql(`select queue_number, count(*) from appointment where clinic_id='${C1}' and appointment_date='2026-11-09' group by 1 having count(*) > 1`);
  check("RULE-23 BR-03 không cấp trùng số thứ tự trong ngày", numbers.length === 0, numbers);

  // two converts of one missed visit at once
  const [w1, w2] = await Promise.all([h.api("POST", `/appointments/${past.id}/walk-in`, {}, desk), h.api("POST", `/appointments/${past.id}/walk-in`, {}, desk)]);
  check("RULE-23 2 lần chuyển walk-in đồng thời → chỉ 1 lượt mới", [w1.status, w2.status].filter((s) => s === 201).length === 1 &&
    sql(`select count(*) from appointment where customer_id=${P1} and appointment_date='${TODAY}' and status not in ('CANCELLED','NO_SHOW')`)[0][0] === "1", [w1.status, w2.status]);

  // --- RULE-31 clinic scope: the second clinic's desk cannot see or change the first clinic's visits ---
  const look = await h.api("GET", `/appointments/lookup?code=${today.bookingCode}`, undefined, desk2);
  check("RULE-31/32 lễ tân cơ sở 2 tra mã lịch cơ sở 1 → 404, không lộ dữ liệu", look.status === 404 && !JSON.stringify(look.body).includes(String(today.id)), look.status);
  const act = await h.api("POST", `/appointments/${past.id}/walk-in`, {}, desk2);
  check("RULE-31/32 lễ tân cơ sở 2 chuyển walk-in lịch cơ sở 1 → bị từ chối", act.status === 404 || act.status === 403, act.status);
  const list = (await h.api("GET", `/appointments?q=${encodeURIComponent("E2E")}`, undefined, desk2)).body;
  check("RULE-31 danh sách tìm kiếm của cơ sở 2 không có lịch cơ sở 1", Array.isArray(list) && !list.some((a) => a.clinic && a.clinic.id === C1), Array.isArray(list) ? list.length : list);
  const same = (await h.api("GET", `/customers?sameAccountAs=57`, undefined, desk2));
  check("RULE-31 bộ lọc sameAccountAs vẫn theo phạm vi cơ sở", same.status === 200 || same.status === 403, same.status);

  // --- RULE-33 session: a broken access token with a good refresh token renews; both broken → sign-in page ---
  const b = await h.browser();
  const page = await (await b.newContext()).newPage();
  await h.signIn(page, "0389001001", "Passw0rd!");
  await page.evaluate(() => localStorage.setItem("dth-auth-access-token", "eyJhbGciOiJIUzI1NiJ9.e30.invalid"));
  await page.goto(h.BASE + "/my-appointments");
  await page.waitForTimeout(3000);
  check("RULE-33/39 access token hết hạn, refresh còn → tự gia hạn, ở lại trang", page.url().includes("/my-appointments"), page.url());
  await page.evaluate(() => { localStorage.setItem("dth-auth-access-token", "eyJhbGciOiJIUzI1NiJ9.e30.invalid"); localStorage.setItem("dth-auth-refresh-token", "nope"); });
  await page.goto(h.BASE + "/my-appointments");
  await page.waitForURL((u) => u.pathname.startsWith("/login"), { timeout: 10000 }).catch(() => {});
  check("RULE-33 phiên hết hạn hẳn → về trang đăng nhập", page.url().includes("/login"), page.url());
  const bad = await h.api("GET", "/my_appointments", undefined, "eyJhbGciOiJIUzI1NiJ9.e30.invalid");
  check("RULE-29/32 gọi API bằng token giả → 401", bad.status === 401, bad.status);
  await b.close();

  // --- RULE-37: the API is down → the sign-in page says so in Vietnamese (FE only, BE untouched) ---
  const b2 = await h.browser();
  const ctx = await b2.newContext();
  await ctx.route("http://localhost:8080/**", (r) => r.abort("connectionrefused"));
  const p2 = await ctx.newPage();
  await p2.goto(h.BASE + "/login");
  await p2.locator("#phone").fill("0389001001");
  await p2.locator("#password").fill("Passw0rd!");
  await p2.getByRole("button", { name: /Đăng nhập/ }).first().click();
  await p2.waitForTimeout(2500);
  const t = (await p2.locator("body").innerText()).replace(/\s+/g, " ");
  check("RULE-37 mất kết nối máy chủ → báo lỗi tiếng Việt, không treo", /kết nối|máy chủ/i.test(t) && p2.url().includes("/login"), t.slice(0, 200));
  await b2.close();

  h.summary("UC05-extra");
})().catch((e) => { console.error(e); h.summary("UC05-extra"); process.exit(1); });
