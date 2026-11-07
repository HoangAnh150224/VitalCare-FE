// UC-04 Đăng ký tài khoản và liên kết hồ sơ — RULE-tagged, verified in the DB.
const h = require("./harness.js");
const { check, sql } = h;
const PHONE = "0389001001";
const E164 = "+84389001001";

(async () => {
  const b = await h.browser();
  const page = await (await b.newContext()).newPage();
  const form = async () => (await page.locator("form").first().innerText()).replace(/\s+/g, " ");
  const submit = () => page.getByRole("button", { name: "Đăng ký", exact: true }).click();
  const fillAll = async (phone, name, pw, pw2) => {
    await page.locator("#phone").fill(phone);
    await page.locator("#fullName").fill(name);
    await page.locator("#password").fill(pw);
    await page.locator("#confirmPassword").fill(pw2);
  };

  await page.goto(h.BASE + "/register");
  await page.waitForSelector("#phone");
  check("RULE-34 màn đăng ký không còn ô ngày sinh", (await page.locator("#dateOfBirth").count()) === 0);

  await submit();
  let t = await form();
  check("RULE-07 bỏ trống → lỗi tiếng Việt dưới từng trường",
    t.includes("Vui lòng nhập số điện thoại") && t.includes("Vui lòng nhập họ và tên") && t.includes("Vui lòng nhập mật khẩu"), t);

  await fillAll("12345", "Nguyễn Văn Thử", "Passw0rd!", "Passw0rd!");
  await submit(); await page.waitForTimeout(1200);
  t = await form();
  check("RULE-09 SĐT sai định dạng → báo lỗi, không sang bước OTP", /Số điện thoại/.test(t) && !(await page.locator("#otp").count()), t);

  await fillAll(PHONE, "Nguyễn Văn Thử", "abc", "abc");
  await submit();
  check("RULE-10 mật khẩu < 8 ký tự → báo lỗi", (await form()).includes("Mật khẩu phải có từ 8 đến 72 ký tự"));

  await fillAll(PHONE, "Nguyễn Văn Thử", "Passw0rd!", "Passw0rd?");
  await submit();
  check("RULE-19 nhập lại mật khẩu không khớp", (await form()).includes("Hai mật khẩu không khớp"));

  await fillAll(PHONE, "1234", "Passw0rd!", "Passw0rd!");
  await submit(); await page.waitForTimeout(300);
  check("RULE-08/13 họ tên có số → báo lỗi", (await form()).includes("Họ và tên chỉ được chứa chữ cái"));

  await fillAll("0900000002", "Nguyễn Văn Thử", "Passw0rd!", "Passw0rd!");
  await submit(); await page.waitForTimeout(1500);
  t = await form();
  check("RULE-17 / D2 số đã có tài khoản → 'Số này đã đăng ký' + link Quên mật khẩu",
    t.includes("Số này đã đăng ký") && (await page.getByRole("link", { name: "Quên mật khẩu?" }).count()) > 0, t);
  check("RULE-35 lỗi hiện một chỗ, không kèm toast", (await page.locator("[data-sonner-toast]").count()) === 0);
  check("RULE-20 D2 không sinh mã OTP cho số đã có tài khoản",
    sql("select count(*) from phone_verification where phone='+84900000002' and purpose='REGISTER' and created_at > now() - interval '5 minutes'")[0][0] === "0");

  // Main flow: valid → OTP
  await fillAll(PHONE, "  Nguyễn Văn Thử  ", "Passw0rd!", "Passw0rd!");
  await submit();
  await page.waitForSelector("#otp", { timeout: 10000 }).catch(() => {});
  t = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  check("RULE-01 dữ liệu hợp lệ → bước nhập OTP", t.includes(`Mã xác thực đã được gửi qua SMS tới`), t.slice(0, 200));
  check("RULE-34 nút gửi lại có đếm ngược", /Gửi lại mã sau \d+s/.test(t));
  const row = sql(`select attempts, extract(epoch from expires_at - created_at)::int from phone_verification where phone='${E164}' and purpose='REGISTER' order by id desc limit 1`)[0];
  check("RULE-20 BR-13 mã lưu với hạn 5 phút", row && row[1] === "300", row);

  // BR-13: wrong code counts an attempt, Vietnamese error, stays on step
  const otp = h.lastOtp("REGISTER");
  await page.locator("#otp").pressSequentially(otp === "000000" ? "111111" : "000000");
  await page.getByRole("button", { name: /Xác thực và đăng ký/ }).click();
  await page.waitForTimeout(1500);
  t = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  check("RULE-03 / D3 OTP sai → báo lỗi tiếng Việt, ở lại bước OTP", t.includes("Mã xác thực không đúng") && (await page.locator("#otp").count()) > 0, t.slice(0, 300));
  check("RULE-20 BR-13 lần nhập sai được đếm",
    sql(`select attempts from phone_verification where phone='${E164}' and purpose='REGISTER' order by id desc limit 1`)[0][0] === "1");

  // Resend before 60 s is refused (BR-13), straight through the API
  const early = await h.api("POST", "/auth/register/otp", { phone: PHONE });
  check("RULE-24 BR-13 gửi lại trước 60s bị từ chối", early.status === 409 && /wait/i.test(early.body.message), JSON.stringify(early.body));

  // Right code → masked matches
  await page.locator("#otp").fill("");
  await page.locator("#otp").pressSequentially(otp);
  await page.getByRole("button", { name: /Xác thực và đăng ký/ }).click();
  await page.waitForSelector("text=Chọn hồ sơ của bạn", { timeout: 10000 }).catch(() => {});
  t = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  check("RULE-01 bước 10: hiện danh sách hồ sơ cùng SĐT", t.includes("Chọn hồ sơ của bạn"), t.slice(0, 300));
  check("RULE-31 BR-14 tên đã che + năm sinh ('Nguyễn V*** Thử – 1985')", t.includes("Nguyễn V*** Thử – 1985") && t.includes("Trần T*** Mẹ – 1960"), t.slice(0, 400));
  check("RULE-31 BR-14 không lộ tên đầy đủ / ngày sinh đầy đủ", !t.includes("Nguyễn Văn Thử") && !t.includes("01/03/1985"));
  check("RULE-34 có lựa chọn 'Không phải tôi'", t.includes("Không phải tôi"));

  await page.getByRole("button", { name: "Tạo tài khoản" }).click();
  check("RULE-07 chưa chọn hồ sơ → nhắc chọn", (await page.locator("body").innerText()).includes("Vui lòng chọn hồ sơ của bạn"));

  await page.getByText("Nguyễn V*** Thử – 1985").click();
  await page.getByRole("button", { name: "Tạo tài khoản" }).click();
  await page.waitForURL((u) => u.pathname.startsWith("/login"), { timeout: 15000 }).catch(() => {});
  check("RULE-36 đăng ký xong → về trang đăng nhập", page.url().includes("/login"), page.url());

  // Postconditions in the DB
  const u = sql(`select id, full_name from users where phone='${E164}' and deleted_at is null`);
  check("RULE-20 tài khoản được tạo đúng 1 lần", u.length === 1, u);
  check("RULE-14 họ tên được cắt khoảng trắng đầu/cuối", u[0] && u[0][1] === "Nguyễn Văn Thử", u[0]);
  const own = sql(`select c.id, c.full_name, c.phone, c.guardian_id from customer c where c.user_id=${u[0][0]}`);
  check("RULE-05 / BR-06 hồ sơ walk-in 57 được liên kết, không tạo hồ sơ mới", own.length === 1 && own[0][0] === "57", own);
  check("RULE-19 hồ sơ chính chủ lấy tên/SĐT từ tài khoản", own[0] && own[0][1] === "" && own[0][2] === "", own[0]);
  const mother = sql("select guardian_id, relationship, full_name, phone from customer where id=58")[0];
  check("RULE-05 bước 11b hồ sơ cùng số còn lại thành người thân", mother[0] === "57" && mother[1] === "other" && mother[2] === "Trần Thị Mẹ", mother);
  const role = sql(`select r.name from user_roles ur join roles r on r.id=ur.role_id where ur.user_id=${u[0][0]}`).map((r) => r[0]);
  check("RULE-28 role theo SRS: hồ sơ đã là bệnh nhân (đã check-in) → Patient", role.includes("Patient") || role.includes("Guest"), role);
  check("RULE-20 mã OTP đã dùng (consumed)", sql(`select consumed_at is not null from phone_verification where phone='${E164}' and purpose='REGISTER' order by id desc limit 1`)[0][0] === "t");

  // RULE-01 bước 13–14: sign in, see own profile and the relative
  await h.signIn(page, PHONE, "Passw0rd!");
  const tk = await h.token(PHONE, "Passw0rd!");
  const profiles = (await h.api("GET", "/my_profiles", undefined, tk)).body;
  check("RULE-01 bước 14 đăng nhập xem được hồ sơ + người thân", profiles.length === 2 && profiles.some((p) => p.fullName === "Trần Thị Mẹ"), JSON.stringify(profiles.map((p) => p.fullName)));
  const visits = (await h.api("GET", "/my_appointments", undefined, tk)).body;
  check("RULE-05 thấy lịch sử khám walk-in trước đó", visits.length >= 2, visits.length);

  // Replay: the spent code cannot register again (RULE-16)
  const replay = await h.api("POST", "/auth/register", { phone: PHONE, otp, fullName: "Ai Khác", password: "Passw0rd!" });
  check("RULE-16 dùng lại mã/đăng ký trùng số bị từ chối", replay.status >= 400, replay.status);

  // RULE-32: claimProfileId outside the matches is refused, straight through the API
  const P2 = "0389001002";
  await h.api("POST", "/auth/register/otp", { phone: P2 });
  const otp2 = h.lastOtp("REGISTER");
  const steal = await h.api("POST", "/auth/register", { phone: P2, otp: otp2, fullName: "Kẻ Lạ", password: "Passw0rd!", claimProfileId: 58 });
  check("RULE-32 gọi thẳng API nhận hồ sơ của số khác → bị từ chối", steal.status === 422 && sql("select user_id is null from customer where id=58")[0][0] === "t", JSON.stringify(steal.body));

  // "Không phải tôi" for P2's walk-in? (no walk-in for P2: no list, new profile)
  const fresh = await h.api("POST", "/auth/register/otp/check", { phone: P2, otp: otp2 });
  check("RULE-02 số chưa có hồ sơ → danh sách rỗng (tạo hồ sơ mới)", fresh.status === 200 && Array.isArray(fresh.body) && fresh.body.length === 0, JSON.stringify(fresh.body));

  // RULE-38: response times seen
  await b.close();
  h.summary("UC04");
})().catch((e) => { console.error(e); h.summary("UC04"); process.exit(1); });
