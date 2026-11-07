// UC-03 Tiếp nhận bệnh nhân walk-in (không tài khoản) — RULE-tagged, verified in the DB.
const h = require("./harness.js");
const { check, sql } = h;
const TODAY = "2026-11-07";

(async () => {
  const b = await h.browser();
  const page = await (await b.newContext()).newPage();
  const body = async () => (await page.locator("#main-content").innerText()).replace(/\s+/g, " ");
  const open = async () => {
    await page.goto(h.BASE + "/appointments/walk-in");
    await page.getByRole("radio", { name: "Khách mới" }).waitFor({ timeout: 10000 });
    await page.waitForTimeout(1200);
  };
  const pickClinic = async () => {
    const box = page.getByRole("combobox").filter({ hasText: "Chọn phòng khám" });
    if (await box.count()) {
      await box.click();
      await page.getByRole("option", { name: "VitalCare Clinic", exact: true }).click();
      await page.waitForTimeout(800);
    }
  };
  const submit = () => page.getByRole("button", { name: "Đăng ký và tiếp nhận" }).click();
  await h.signIn(page, "0900000002", "Manager@123");

  // RULE-07 / BR-07 new patient: every field, the phone included
  await open();
  await page.getByRole("radio", { name: "Khách mới" }).click();
  await pickClinic();
  await submit();
  let t = await body();
  check("RULE-07 / BR-07 bỏ trống → báo thiếu họ tên, SĐT (bắt buộc), ngày sinh, giới tính",
    ["Nhập họ tên", "Nhập số điện thoại", "Nhập ngày sinh", "Chọn giới tính"].every((m) => t.includes(m)), t.slice(0, 500));
  check("RULE-07 lý do khám bắt buộc", t.includes("Vui lòng nhập lý do khám"));

  const fields = page.locator("form");
  const fillNew = async (name, phone, dob) => {
    await fields.getByLabel("Họ và tên").fill(name);
    await fields.getByLabel("Số điện thoại").fill(phone);
    await fields.getByLabel("Ngày sinh").fill(dob);
    await page.getByRole("combobox", { name: "Giới tính" }).click();
    await page.getByRole("option", { name: "Nữ" }).click();
    await page.getByPlaceholder("Theo dõi sức khỏe định kỳ").fill("Ho, sốt nhẹ");
  };
  await fillNew("Lê Thị Khách", "123", "1990-05-05");
  await submit();
  check("RULE-09 SĐT sai định dạng → báo lỗi", (await body()).includes("Số điện thoại Việt Nam, ví dụ 0901234567"));

  // BR-06: the same person again (name, birth date, phone of profile 57)
  await fields.getByLabel("Họ và tên").fill("Nguyễn Văn Thử");
  await fields.getByLabel("Số điện thoại").fill("0389001001");
  await fields.getByLabel("Ngày sinh").fill("1985-03-01");
  await submit();
  await page.waitForTimeout(2000);
  t = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  check("RULE-16 / BR-06 hồ sơ trùng → từ chối, yêu cầu chọn hồ sơ có sẵn", /đã tồn tại|already exists/i.test(t), t.slice(0, 300));

  // Main flow 3–8: new profile, today's visit, check-in, fee
  await open();
  await page.getByRole("radio", { name: "Khách mới" }).click();
  await pickClinic();
  await fillNew("Lê Thị Khách", "0389 001 003", "1990-05-05");
  await submit();
  await page.waitForTimeout(800);
  check("RULE-14 (ghi nhận) SĐT có khoảng trắng: form quầy chưa nhận, phải nhập liền", (await body()).includes("Số điện thoại Việt Nam, ví dụ 0901234567"));
  await fields.getByLabel("Số điện thoại").fill("+84389001003");
  await submit();
  await page.waitForURL(/\/appointments\/show\/\d+/, { timeout: 15000 }).catch(() => {});
  const id = Number((page.url().match(/show\/(\d+)/) || [])[1]);
  check("RULE-01 đăng ký walk-in → sang trang lượt khám để thu phí", id > 0, page.url());
  const cust = sql(`select c.id, c.phone, c.user_id is null, c.full_name from customer c join appointment a on a.customer_id=c.id where a.id=${id}`)[0];
  check("RULE-20 BR-07/BR-08 hồ sơ mới không tài khoản, SĐT chuẩn hoá +84", cust && cust[1] === "+84389001003" && cust[2] === "t" && cust[3] === "Lê Thị Khách", cust);
  let r = sql(`select status, appointment_date, queue_number is not null from appointment where id=${id}`)[0];
  check("RULE-26 bước 6–7 lượt hôm nay, đã check-in, chưa trả → CHECKED_IN", r.join() === `CHECKED_IN,${TODAY},t`, r);
  check("RULE-20 phí khám PENDING", sql(`select status from invoice where appointment_id=${id} and kind='EXAM'`)[0][0] === "UNPAID");
  await page.getByRole("button", { name: "Thu phí khám" }).click();
  await page.locator("#cash-given").fill("10000");
  t = (await page.locator('[role="dialog"]').innerText()).replace(/\s+/g, " ");
  check("RULE-03 / C2 khách đưa thiếu tiền → báo thiếu, không cho xác nhận", t.includes("Khách đưa còn thiếu") && await page.getByRole("button", { name: /Xác nhận đã thu/ }).isDisabled(), t.slice(0, 200));
  await page.locator("#cash-given").fill("");
  await page.getByRole("button", { name: /Xác nhận đã thu/ }).click();
  await page.waitForTimeout(2000);
  r = sql(`select a.status, i.status from appointment a join invoice i on i.appointment_id=a.id and i.kind='EXAM' where a.id=${id}`)[0];
  check("RULE-26 bước 8–9 thu phí → PAID → READY_FOR_EXAMINATION", r.join() === "READY_FOR_EXAMINATION,PAID", r);
  await page.reload(); await page.waitForTimeout(1500);
  check("RULE-34 bước 10 nút In phiếu khám", (await page.getByRole("button", { name: "In phiếu khám" }).count()) > 0);

  // Known profile: search finds it, a second visit today is refused
  await open();
  await page.getByPlaceholder("Tìm theo tên, số điện thoại, mã hồ sơ hoặc giấy tờ định danh").fill("0389001003");
  await page.waitForTimeout(1500);
  await page.getByRole("combobox", { name: "Khách hàng" }).click();
  check("RULE-01 bước 2 tìm hồ sơ có sẵn theo SĐT", (await page.getByRole("option", { name: /Lê Thị Khách/ }).count()) > 0);
  await page.getByRole("option", { name: /Lê Thị Khách/ }).first().click();
  await pickClinic();
  await page.getByPlaceholder("Theo dõi sức khỏe định kỳ").fill("Tái khám");
  await submit();
  await page.waitForTimeout(2000);
  check("RULE-16 một hồ sơ hai lượt cùng ngày cùng cơ sở → từ chối", page.url().includes("/walk-in") &&
    sql(`select count(*) from appointment where customer_id=${cust[0]} and appointment_date='${TODAY}'`)[0][0] === "1");

  // C1: no places left today → the desk sees other days, cannot pick them
  sql("update doctor_working_hours set deleted_at=now() where id in (218, 219)");
  await open();
  await page.getByRole("radio", { name: "Khách mới" }).click();
  await pickClinic();
  await page.waitForTimeout(1500);
  t = await body();
  check("RULE-24 / C1 hôm nay hết suất → báo, kèm các ngày còn lượt", t.includes("hết lượt") && t.includes("Các ngày còn lượt"), t.slice(0, 400));
  check("RULE-27 C1 walk-in không chọn được ngày khác (chỉ để báo bệnh nhân)", (await page.getByRole("button", { name: /thg 11, 2026 · còn/ }).count()) === 0);
  const desk = await h.token("0900000002", "Manager@123");
  const full = await h.api("POST", "/appointments/walk-in", { newPatient: { fullName: "Phạm Văn Đầy", phone: "0389001004", dateOfBirth: "1970-01-01", gender: "male" }, clinicId: "5b1f8c2e-6a3d-4f7e-9c41-2d8e0a7b3c19", reason: "x" }, desk);
  check("RULE-39 / C1 hết suất: API từ chối và không để lại hồ sơ mồ côi", full.status === 422 && sql("select count(*) from customer where phone='+84389001004'")[0][0] === "0", JSON.stringify(full.body));
  sql("update doctor_working_hours set deleted_at=null where id in (218, 219)");

  // RULE-34 phone width
  await page.setViewportSize({ width: 390, height: 844 });
  await open();
  check("RULE-34 màn walk-in trên điện thoại không tràn ngang", !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));

  await b.close();
  h.summary("UC03");
})().catch((e) => { console.error(e); sql("update doctor_working_hours set deleted_at=null where id in (218, 219)"); h.summary("UC03"); process.exit(1); });
