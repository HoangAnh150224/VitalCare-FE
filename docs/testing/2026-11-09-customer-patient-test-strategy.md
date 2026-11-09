# Chiến lược kiểm thử — Khách hàng và Bệnh nhân (FE-07, UC-27..31, Bệnh nhân của tôi, Hồ sơ người thân)

- **Ngày viết:** 09/11/2026
- **Trạng thái:** Kế hoạch, chưa chạy.
- **Bộ test case chi tiết:** `2026-11-09_System Test_Khach hang - Benh nhan.xlsx` (cùng thư mục). File dùng khuôn Report-5.3 System Test, gồm 348 case trên 8 sheet. Kết quả chạy ghi vào cột Round 1/2/3 của file đó. Tài liệu này giữ phần phân tích: phạm vi, bảng 39 RULE, mâu thuẫn tài liệu và các nghi vấn.
- **Chuẩn áp dụng:** quy trình 8 bước và 39 RULE trong `SRC_Coce/CLAUDE.md`.
- **Nguồn đã đọc:**
  - SRS (bản 30/9/2026): §2.2.2 UC 27–31, 38–42; §3.8.1–3.8.5; BR-01, BR-02, BR-04, BR-24.
  - Report 1 (bản 29/9/2026): FE-07, FE-09, FE-10, FE-20.
  - Wireframe trong SRS: image42 (danh sách), image49 (chi tiết), image61 (cập nhật), image10 (trạng thái), image121 (đăng ký bệnh nhân).
  - Code FE `src/features/clinic/{customers,my-patients,my-profiles}`, BE `care/customer`, `care/assignment`, migration 008–054.

## 1. Phạm vi

### 1.1 Mô hình dữ liệu cần nắm trước khi test

- **Khách hàng và bệnh nhân là cùng một dòng `customer`.** "Bệnh nhân" là trạng thái `status = PATIENT`, không phải bảng riêng.
- **`status`:**
  - `NEUTRAL` (Chưa kích hoạt) → `PATIENT` (Bệnh nhân), một chiều, không quay lại.
  - Lên `PATIENT` khi check-in (nguồn `CHECK_IN`) hoặc khi nhân viên kích hoạt (nguồn `MANUAL`).
  - Kích hoạt thì role tài khoản đổi GUEST → PATIENT.
- **`activity_status`:** trục riêng, gồm `active` / `paused` / `inactive`, đổi qua lại tự do. Trạng thái khác `active` thì bắt buộc có lý do.
- **Ba loại hồ sơ:**
  - Chủ tài khoản: có `user_id`; họ tên và SĐT lấy từ tài khoản.
  - Người thân: có `guardian_id`.
  - Walk-in chưa có chủ: không có cả hai.
- **`my_profiles`:** cách tài khoản bệnh nhân nhìn hồ sơ của chính mình và người thân.
- **`my_patients`:** cách bác sĩ/điều dưỡng nhìn các bệnh nhân mình đang được phân công theo dõi.

### 1.2 Màn hình và UC trong phạm vi

| Mã | Màn hình | Route | UC trong SRS | Ai dùng |
|---|---|---|---|---|
| S1 | Danh sách khách hàng | `/customers` | UC-27 Search Patients | Lễ tân (MANAGER), Quản trị phòng khám (CLINIC_ADMIN); ADMIN chỉ xem |
| S2 | Chi tiết khách hàng | `/customers/show/:id` | UC-28 View Patient Details | như S1 |
| S3 | Kích hoạt bệnh nhân (thẻ trong S2) | — | UC-29 Activate Patient Profile | MANAGER, CLINIC_ADMIN |
| S4 | Sửa khách hàng | `/customers/edit/:id` | UC-30 Update Patient Information | MANAGER, CLINIC_ADMIN |
| S5 | Đổi trạng thái hoạt động (dialog trong S2) | — | UC-31 Manage Patient Status | MANAGER, CLINIC_ADMIN |
| S6 | Nhóm chăm sóc, Thiết bị (panel trong S2) | — | FE-09 (UC 38–41) | Nhóm chăm sóc: CLINIC_ADMIN. Thiết bị: MANAGER, CLINIC_ADMIN |
| S7 | Bệnh nhân của tôi | `/my-patients`, `/my-patients/show/:id` | View My Monitored Patients | Bác sĩ, Điều dưỡng |
| S8 | Hồ sơ và người thân (portal) | `/my-profiles`, `/create`, `/edit/:id` | UC-5 Update User Profile + quản lý người thân | GUEST, PATIENT |

**Ngoài phạm vi** (đã có tài liệu khác hoặc để đợt sau):
- Đăng ký tài khoản (UC-04 trong báo cáo 07/11).
- Check-in kích hoạt bệnh nhân (UC-02 trong báo cáo 07/11; ở đây chỉ kiểm tra lại kết quả trên S2).
- Hồ sơ y tế, ghi chú theo dõi, chỉ số sinh tồn trong S2/S7.
- Chia sẻ cho người chăm sóc (UC 67–74).

### 1.3 Mâu thuẫn tài liệu cần chốt trước khi đánh Pass/Fail

| # | Nội dung | Code hiện tại | Đề xuất |
|---|---|---|---|
| D1 | Wireframe image121 "Đăng ký bệnh nhân" tạo hồ sơ **và tài khoản**, gửi thông tin đăng nhập. Văn bản §3.8.3 nói chỉ kích hoạt từ "existing Neutral user". | Không có màn tạo; chỉ có nút kích hoạt cho khách đã đăng ký. | Theo văn bản §3.8.3. Đánh dấu image121 là **Not Applicable** kèm lý do này. |
| D2 | Wireframe image42 có cột Tuổi/Giới tính, Nhân viên phụ trách, Thiết bị, Theo dõi, Dữ liệu gần nhất và lọc theo nhân viên. | Danh sách chỉ có: Mã, Khách hàng, Trạng thái, Thành bệnh nhân, Đăng ký. | Hỏi nhóm: theo wireframe hay giữ như hiện tại. Trong lúc chờ, RULE-34 so sánh với code, ghi lệch vào mục Nghi vấn. |
| D3 | BR-02 ghi "first eligible appointment"; FE-10 chỉ ghi "eligible". | Mọi lần check-in hợp lệ của khách NEUTRAL đều kích hoạt. | Không ảnh hưởng kết quả, vì lần đầu cũng là lần kích hoạt. |
| D4 | Wireframe image61 có Họ tên, SĐT, Email trong form cập nhật. | Họ tên và SĐT thuộc tài khoản, sửa ở màn Người dùng; form sửa không có các ô này. | Theo code; ghi lý do ở RULE-21. |
| D5 | Không có bản Report 1 ngày 08/10 trên máy. | — | Không ảnh hưởng phạm vi này. |

## 2. Môi trường và dữ liệu

- **Môi trường:** giống báo cáo 07/11.
  - BE chạy trên DB `vitalcare_spec`, tắt SMS (`--app.sms.esms.api-key=`); OTP đọc từ log.
  - FE dev ở `http://localhost:5176`.
  - Trước mỗi lần chạy trọn bộ thì dựng lại DB bằng `docs/testing/booking-spec-e2e/resetdb.js`. Kích hoạt là thao tác một chiều nên không dọn ngược được.
- **Tài khoản** (mật khẩu lấy từ seed migration 002, 017, 019, 034, 050):

| Vai trò | SĐT | Cơ sở | Dùng cho |
|---|---|---|---|
| Lễ tân (MANAGER) | 0900000002 | 1 | S1–S5, thiết bị |
| Lễ tân (MANAGER) | 0900000021 | 2 | RULE-31 khác cơ sở |
| Quản trị phòng khám | 0900000031 | 1 | S1–S6, nhóm chăm sóc |
| System Admin | 0900000001 | — | ADMIN chỉ xem (RULE-30) |
| Bác sĩ | 0900000011 / 0900000022 | 1 / 2 | S7, RULE-30, RULE-31 |
| Điều dưỡng | 0900000012 | 1 | S7 |
| Bệnh nhân có người thân | 0900000501 | — | S8 (con "Nguyễn Minh Khang") |
| Khách GUEST | 0389001001 | — | S8, gọi API S1–S5 phải bị chặn |

- **Dữ liệu dựng thêm trong script:**
  - 2 khách NEUTRAL mới, đăng ký qua API với OTP đọc từ log: KH-A (cơ sở 1) và KH-B (chưa có lịch ở đâu).
  - 1 khách đã có lịch ở cơ sở 2: KH-C.
  - 1 thiết bị trạng thái `available` ở cơ sở 1.
- **Script dự kiến:** `docs/testing/customer-patient-e2e/` dùng lại `harness.js` của booking-spec. Mỗi `check()` ghi mã RULE và mã test case, ví dụ `check("CP-12 RULE-26 kích hoạt lần 2 → 409", ...)`. Mọi kết quả ghi DB đều kiểm tra bằng SQL.

## 3. Thứ tự ưu tiên

1. **P1 — phạm vi và quyền (RULE-29..32):** dữ liệu y tế lộ sang sai người là lỗi nặng nhất.
2. **P1 — chuyển trạng thái (RULE-26, 27):** kích hoạt là một chiều và kéo theo đổi role tài khoản.
3. **P2 — dữ liệu vào và lưu DB (RULE-07..22).**
4. **P2 — đồng thời và lỗi hệ thống (RULE-23, 37, 39).**
5. **P3 — giao diện và thông báo (RULE-34..36, 38).**

---

## UC-27 — Danh sách và tìm khách hàng (S1)

**UC Analysis:**
- Nhân viên tìm theo tên, đuôi SĐT, mã khách hàng hoặc CCCD (ô tìm chạy khi nhấn Enter); lọc theo trạng thái, mã khách hàng, cơ sở; sắp xếp theo Mã, Trạng thái, Đăng ký.
- **Phạm vi (BR-04):** nhân viên cơ sở X thấy:
  - khách có lịch, lượt khám, phân công hoặc thiết bị ở X;
  - khách chưa gắn với cơ sở nào.
- Tìm **khớp chính xác** SĐT, mã KH hoặc CCCD thì thấy cả khách cơ sở khác (để tiếp nhận).
- ADMIN thấy tất cả, chỉ xem.

| RULE | Đánh dấu | Test case / lý do |
|---|---|---|
| 01 Main | Applicable | CP-01 |
| 02 Alternative | Applicable | CP-02 lọc trạng thái + sắp xếp, CP-03 tìm theo CCCD/mã/đuôi SĐT |
| 03 Exception | Applicable | CP-04 không có kết quả |
| 04 Preconditions | Applicable | Gộp RULE-29/30 |
| 05 Postconditions | Not Applicable | Chỉ đọc |
| 06 Interruption | Applicable | CP-05 nút X và xóa trắng ô tìm hiện lại toàn bộ |
| 07 Required | Not Applicable | Không có trường bắt buộc |
| 08–12 | Not Applicable | Ô tìm tự do, BE chỉ lấy chuỗi |
| 13 Special chars | Applicable | CP-06 tiếng Việt có dấu, `%`, `_`, `'` không gây lỗi và không khớp tất cả |
| 14 Whitespace | Applicable | CP-07 khoảng trắng đầu/cuối bị cắt |
| 15 Null/empty | Applicable | Gộp CP-05 |
| 16–22 | Not Applicable | Chỉ đọc |
| 23 Concurrent | Not Applicable | Chỉ đọc |
| 24 Constraints | Applicable | CP-08 BR-04 phạm vi cơ sở |
| 25 Calculation | Applicable | CP-09 footer "Hiển thị a–b trên N" khớp `X-Total-Count` và `COUNT(*)` SQL |
| 26–28 | Not Applicable | |
| 29 Authentication | Applicable | CP-10 |
| 30 Authorization | Applicable | CP-11 |
| 31 Access scope | Applicable | CP-08, CP-12 |
| 32 Direct API | Applicable | CP-11 |
| 33 Session | Applicable | CP-13 |
| 34 UI | Applicable | CP-14 |
| 35 Error msg | Applicable | Gộp CP-11 (trang Forbidden tiếng Việt) |
| 36 Success msg | Not Applicable | Không có thao tác ghi |
| 37 System error | Applicable | CP-15 |
| 38 Performance | Applicable | CP-16 |
| 39 Recovery | Applicable | Gộp CP-15 |

| ID | RULE | Bước | Dữ liệu | Kết quả mong đợi |
|---|---|---|---|---|
| CP-01 | 01 | Lễ tân cơ sở 1 mở `/customers`, gõ tên, nhấn Enter | "Trang" | Chỉ hiện khách khớp; URL có filter `q`; reload vẫn giữ ô tìm |
| CP-02 | 02 | Lọc "Bệnh nhân", rồi sắp xếp cột Đăng ký | — | Chỉ có dòng `patient`, thứ tự đúng; SQL đối chiếu |
| CP-03 | 02 | Tìm lần lượt theo CCCD, mã KH, 4 số cuối SĐT | `001191004521`, `KH0000xx`, `0501` | Đều ra đúng khách |
| CP-04 | 03 | Tìm chuỗi không tồn tại | "zzzz" | Hiện trạng thái rỗng, không lỗi |
| CP-05 | 06, 15 | Gõ chưa Enter; rồi bấm X; rồi xóa trắng | — | Gõ chưa Enter không gửi request; X hoặc xóa trắng hiện lại toàn bộ ngay |
| CP-06 | 13 | Tìm `Nguyễn`, `%`, `_`, `'` | | Ký tự có dấu khớp đúng; `%`/`_` không trả về tất cả; không 500 |
| CP-07 | 14 | Tìm `"  Trang  "` | | Giống tìm "Trang" |
| CP-08 | 24, 31 | Lễ tân cơ sở 2 mở danh sách | KH-A (có lịch cơ sở 1), KH-B (chưa gắn), KH-C | Thấy KH-B, KH-C; không thấy KH-A |
| CP-09 | 25 | So footer với SQL | | Khớp |
| CP-10 | 29 | Chưa đăng nhập mở `/customers`; gọi `GET /api/customers` không token | | Về trang đăng nhập; API 401 |
| CP-11 | 30, 32, 35 | Bác sĩ và khách GUEST mở `/customers`; gọi API bằng token của họ | | Trang "Bạn không có quyền truy cập trang này"; API 403, không lộ dữ liệu |
| CP-12 | 31 | Lễ tân cơ sở 2 tìm **chính xác** SĐT/mã của KH-A, rồi mở chi tiết | | Danh sách hiện KH-A (theo thiết kế). Ghi nhận việc mở chi tiết trả 200 hay 404, xem nghi vấn N5 |
| CP-13 | 33 | Làm hỏng access token rồi bấm trang 2 | | Tự gia hạn nếu refresh token còn; hỏng cả hai thì về trang đăng nhập |
| CP-14 | 34 | So với wireframe image42; khung 390px | | Đủ cột theo code; không tràn ngang; placeholder ô tìm đúng nội dung (xem N1) |
| CP-15 | 37, 39 | Tắt BE, bấm tìm; bật lại, tìm lại | | Báo lỗi tiếng Việt, không trắng trang; bật lại thì tìm được |
| CP-16 | 38 | Đo thời gian trả danh sách 10 dòng và tìm theo `q` | | Dưới 2 giây |

## UC-28 — Chi tiết khách hàng (S2)

**UC Analysis:** Hiện hồ sơ (ngày sinh, giới tính, giấy tờ, địa chỉ, liên hệ khẩn cấp), trạng thái bệnh nhân và nguồn kích hoạt, trạng thái hoạt động, nhóm chăm sóc, thiết bị, lịch đăng ký khám. Các panel y tế chỉ hiện khi đã là bệnh nhân.

| RULE | Đánh dấu | Test case / lý do |
|---|---|---|
| 01 Main | Applicable | CP-20 |
| 02 Alternative | Applicable | CP-21 khách NEUTRAL: ẩn panel y tế, nhóm chăm sóc và thiết bị báo "chưa là bệnh nhân" |
| 03 Exception | Applicable | CP-22 id không tồn tại |
| 04–06 | Not Applicable | Chỉ đọc |
| 07–17 | Not Applicable | Không nhập liệu |
| 18 Ref. integrity | Applicable | CP-23 người thân hiện "Người thân của {chủ}"; lịch khám trỏ đúng khách |
| 19 Consistency | Applicable | CP-24 họ tên/SĐT của chủ tài khoản lấy từ `users`, khớp màn Người dùng |
| 20–23 | Not Applicable | |
| 24–28 | Not Applicable | Gộp các UC bên dưới |
| 29–33 | Applicable | CP-25 |
| 34 UI | Applicable | CP-26 |
| 35–36 | Not Applicable | |
| 37 System error | Applicable | Gộp CP-15 |
| 38 Performance | Not Tested | Đo chung CP-16 |
| 39 Recovery | Not Applicable | |

| ID | RULE | Bước | Kết quả mong đợi |
|---|---|---|---|
| CP-20 | 01 | Lễ tân mở chi tiết khách 0900000501 | Đủ các mục; "Kích hoạt qua: Tiếp nhận khi đến khám"; có panel y tế |
| CP-21 | 02 | Mở KH-A (NEUTRAL) | Có thẻ "Kích hoạt bệnh nhân"; không có panel y tế; nhóm chăm sóc/thiết bị hiện câu "chưa là bệnh nhân" |
| CP-22 | 03 | Mở `/customers/show/999999` | Thông báo không tìm thấy bằng tiếng Việt, không trắng trang |
| CP-23 | 18 | Mở hồ sơ con "Nguyễn Minh Khang" | Có dòng "Người thân của Trần Thu Trang" |
| CP-24 | 19 | Đổi tên tài khoản ở màn Người dùng, mở lại chi tiết | Tên mới hiện ngay |
| CP-25 | 29–32 | Lễ tân cơ sở 2 gọi `GET /api/customers/{KH-A}`; bác sĩ gọi; ADMIN mở | 404 / 403 / ADMIN xem được nhưng không có nút sửa, kích hoạt hay đổi trạng thái |
| CP-26 | 34 | Khung 390px; khách thiếu nhiều trường | Ô trống hiện `EmptyValue`, không "undefined" hay "null" |

## UC-29 — Kích hoạt hồ sơ bệnh nhân (S3)

**UC Analysis:**
- Áp dụng cho khách NEUTRAL; người kích hoạt có quyền `customers:activate`.
- Kết quả:
  - `status = PATIENT`, nguồn `MANUAL`, ghi người và thời điểm kích hoạt;
  - role tài khoản GUEST → PATIENT;
  - từ đó gán được nhóm chăm sóc và thiết bị.
- Kích hoạt chỉ một chiều. Đặt lịch thôi không được kích hoạt (§3.8.3).

| RULE | Đánh dấu | Test case / lý do |
|---|---|---|
| 01 Main | Applicable | CP-30 |
| 02 Alternative | Applicable | CP-31 kích hoạt qua check-in thì nguồn là `CHECK_IN` (dùng lại UC-02, chỉ kiểm tra S2) |
| 03 Exception | Applicable | CP-32 kích hoạt lần 2 |
| 04 Preconditions | Applicable | CP-33 khách chỉ đặt lịch, chưa check-in thì vẫn NEUTRAL |
| 05 Postconditions | Applicable | CP-34 role tài khoản; đăng nhập lại thấy menu bệnh nhân |
| 06 Interruption | Applicable | CP-35 không có hộp xác nhận cho thao tác không đảo ngược được (nghi vấn N6) |
| 07–15 | Not Applicable | Không có ô nhập |
| 16 Duplicate | Applicable | CP-36 bấm đúp nút |
| 17 Unique | Not Applicable | |
| 18 Ref. integrity | Applicable | Gộp CP-34: `patient_activated_by_id` trỏ đúng nhân viên |
| 19 Consistency | Applicable | Gộp CP-30: hồ sơ người thân được kích hoạt nhưng role của chủ tài khoản không đổi (CP-37) |
| 20 Persistence | Applicable | CP-30 bằng SQL |
| 21–22 | Not Applicable | |
| 23 Concurrent | Applicable | CP-38 hai lễ tân kích hoạt cùng lúc |
| 24 Constraints | Applicable | Gộp CP-33 |
| 25 | Not Applicable | |
| 26 State | Applicable | CP-32, CP-39 không có đường quay lại NEUTRAL |
| 27 Invalid op | Applicable | CP-39 |
| 28 Dependencies | Applicable | CP-40 nhóm chăm sóc và thiết bị mở khóa sau kích hoạt |
| 29 Authentication | Not Tested | Đã có ở UC-27 |
| 30 Authorization | Applicable | CP-41 ADMIN, bác sĩ |
| 31 Access scope | Applicable | CP-42 khác cơ sở |
| 32 Direct API | Applicable | Gộp CP-41, CP-42 |
| 33 Session | Not Tested | Đã có ở UC-27 |
| 34 UI | Applicable | Gộp CP-30: nút "Đang kích hoạt..." bị khóa khi đang gửi |
| 35 Error msg | Applicable | CP-32: lỗi 409 phải là tiếng Việt (nghi vấn N2) |
| 36 Success msg | Applicable | CP-30 "Đã kích hoạt hồ sơ bệnh nhân" |
| 37 System error | Applicable | CP-43 |
| 38 Performance | Not Tested | |
| 39 Recovery | Applicable | Gộp CP-43 |

| ID | RULE | Bước | Kết quả mong đợi |
|---|---|---|---|
| CP-30 | 01, 20, 36 | Lễ tân cơ sở 1 mở KH-A, bấm "Kích hoạt hồ sơ bệnh nhân" | Toast thành công; badge "Bệnh nhân"; "Nhân viên kích hoạt". SQL: `status='PATIENT'`, `patient_activation_source='MANUAL'`, `patient_activated_at` có giá trị, `patient_activated_by_id` = lễ tân |
| CP-31 | 02 | Khách NEUTRAL check-in (UC-02) | S2 hiện "Tiếp nhận khi đến khám" |
| CP-32 | 03, 26, 35 | Gọi lại `POST /customers/{KH-A}/activate` | 409; giao diện không còn thẻ kích hoạt |
| CP-33 | 04, 24 | KH-B đặt lịch online, chưa check-in | Vẫn NEUTRAL |
| CP-34 | 05, 18 | SQL `users.role` của KH-A; KH-A đăng nhập lại | Role PATIENT; portal hiện mục dành cho bệnh nhân |
| CP-35 | 06 | Bấm nút kích hoạt | Ghi nhận: chưa có hộp xác nhận (N6) |
| CP-36 | 16 | Bấm đúp nhanh nút kích hoạt | Chỉ 1 request thành công, không có toast lỗi thừa |
| CP-37 | 19 | Kích hoạt hồ sơ con của 0900000501 khi hồ sơ chủ chưa là bệnh nhân (dựng dữ liệu) | Hồ sơ con PATIENT; role tài khoản chủ đổi theo đúng `synchronizeCustomerRole` (ghi lại hành vi thực tế) |
| CP-38 | 23 | 2 request kích hoạt song song | 1 lần 200, 1 lần 409 (hoặc 409 "vừa bị người khác thay đổi"); không lỗi 500 |
| CP-39 | 26, 27 | Tìm mọi đường đưa về NEUTRAL: `PATCH` có `status`, đổi trạng thái hoạt động | `status` không đổi |
| CP-40 | 28 | Sau CP-30, panel nhóm chăm sóc và thiết bị | Hiện ô chọn, không còn câu "chưa là bệnh nhân" |
| CP-41 | 30, 32 | ADMIN và bác sĩ gọi `POST /activate` | 403; ADMIN không thấy thẻ kích hoạt |
| CP-42 | 31 | Lễ tân cơ sở 2 gọi `POST /activate` cho KH-A (khi KH-A còn NEUTRAL) | 404, DB không đổi |
| CP-43 | 37, 39 | Tắt BE giữa chừng rồi bấm kích hoạt | Báo lỗi, nút mở lại; bật BE bấm lại được; DB chỉ ghi 1 lần |

## UC-30 — Cập nhật thông tin khách hàng (S4)

**UC Analysis:**
- Nhân viên sửa ngày sinh, giới tính, địa chỉ và liên hệ khẩn cấp.
- Họ tên và SĐT thuộc tài khoản, không sửa ở đây (D4).
- Gửi `""` nghĩa là xóa giá trị.
- **Giới hạn ở BE:** `dateOfBirth` phải là ngày trong quá khứ; `gender` ∈ male/female/other; địa chỉ ≤ 500; tên liên hệ ≤ 255; SĐT liên hệ ≤ 50, không kiểm tra định dạng.

| RULE | Đánh dấu | Test case / lý do |
|---|---|---|
| 01 Main | Applicable | CP-50 |
| 02 Alternative | Applicable | CP-51 xóa giá trị (để trống) |
| 03 Exception | Applicable | CP-52 BE trả 422 |
| 04 Preconditions | Applicable | Gộp RULE-30 |
| 05 Postconditions | Applicable | CP-53 audit (nghi vấn N3) |
| 06 Interruption | Applicable | CP-54 bấm Hủy thì không lưu |
| 07 Required | Not Applicable | Form không có trường bắt buộc (khác image61, xem D4) |
| 08 Data type | Applicable | CP-55 gửi `gender` lạ, ngày sai kiểu qua API |
| 09 Format | Applicable | CP-56 SĐT liên hệ khẩn cấp "abc" (nghi vấn N4) |
| 10 Min length | Not Applicable | Không có độ dài tối thiểu |
| 11 Max length | Applicable | CP-57 |
| 12 Boundary | Applicable | CP-58 ngày sinh hôm nay / hôm qua / ngày mai |
| 13 Special chars | Applicable | CP-59 địa chỉ tiếng Việt có dấu, emoji, `<script>` |
| 14 Whitespace | Applicable | CP-60 |
| 15 Null/empty | Applicable | Gộp CP-51 |
| 16–17 | Not Applicable | Không có trường duy nhất |
| 18 Ref. integrity | Not Applicable | |
| 19 Consistency | Applicable | CP-61 sửa ở S4 thì S2 và portal S8 của chính khách thấy giống nhau |
| 20 Persistence | Applicable | Gộp CP-50 bằng SQL |
| 21 Update | Applicable | CP-50 |
| 22 Deletion | Not Applicable | Không có xóa khách |
| 23 Concurrent | Applicable | CP-62 |
| 24–28 | Not Applicable | |
| 29 Authentication | Not Tested | Đã có ở UC-27 |
| 30 Authorization | Applicable | CP-63 |
| 31 Access scope | Applicable | CP-64 |
| 32 Direct API | Applicable | Gộp CP-63, CP-64 |
| 33 Session | Applicable | CP-65 |
| 34 UI | Applicable | CP-66 |
| 35 Error msg | Applicable | Gộp CP-52, CP-57 |
| 36 Success msg | Applicable | CP-50 |
| 37 System error | Applicable | Gộp CP-43 cho form này |
| 38 Performance | Not Tested | |
| 39 Recovery | Applicable | Gộp CP-62 |

| ID | RULE | Bước | Dữ liệu | Kết quả mong đợi |
|---|---|---|---|---|
| CP-50 | 01, 20, 21, 36 | Sửa đủ 5 trường, bấm Lưu | 1990-05-01, Nữ, "12 Lê Lợi, Huế", "Trần Văn B", "0234 3822 111" | Toast "Đã cập nhật khách hàng thành công"; SQL khớp; `updated_by_id` = người sửa |
| CP-51 | 02, 15 | Xóa trắng địa chỉ và liên hệ khẩn cấp | | DB là `''` hoặc NULL, S2 hiện ô trống |
| CP-52 | 03, 35 | Gọi API với ngày sinh trong tương lai | | 422; trên giao diện lỗi phải là tiếng Việt và hiện một chỗ (N2) |
| CP-53 | 05 | Kiểm tra `audit_log` sau CP-50 | | FE-20/BR-24 yêu cầu ghi log việc sửa hồ sơ. Code hiện chưa ghi (N3) |
| CP-54 | 06 | Sửa rồi bấm Hủy | | Quay lại, DB không đổi |
| CP-55 | 08 | API: `gender:"x"`, `dateOfBirth:"abc"` | | 422 / 400, không lỗi 500 |
| CP-56 | 09 | SĐT liên hệ "abc" | | Ghi nhận hành vi: hiện được lưu. BR-19 dùng số này để gọi khẩn cấp (N4) |
| CP-57 | 11, 35 | Địa chỉ 500 và 501 ký tự; tên liên hệ 255/256; SĐT 50/51 | | 500/255/50 lưu được; vượt thì báo "Tối đa N ký tự" dưới ô |
| CP-58 | 12 | Ngày sinh hôm nay, hôm qua, ngày mai | | Hôm qua lưu được; hôm nay và ngày mai bị từ chối (`@Past`). Ô ngày ở FE chưa đặt `max` |
| CP-59 | 13 | Địa chỉ "Phường Đông Ba, Huế 🏥", `<script>alert(1)</script>` | | Lưu đúng; S2 hiện dạng chữ, không chạy script |
| CP-60 | 14 | Tên liên hệ "  Trần Văn B  " | | Ghi nhận có cắt khoảng trắng hay không |
| CP-61 | 19 | Sau CP-50, khách KH-A mở `/my-profiles` | | Ngày sinh, giới tính khớp |
| CP-62 | 23, 39 | 2 lễ tân cùng mở form, lần lượt Lưu | | Cả hai lưu được (DTO không gửi `version`), bản sau đè bản trước. Ghi nhận là hành vi chấp nhận được hay cần cảnh báo |
| CP-63 | 30, 32 | ADMIN mở thẳng `/customers/edit/{id}` rồi bấm Lưu; bác sĩ gọi `PATCH` | | Route chỉ chặn quyền xem nên ADMIN vào được form; Lưu nhận 403 với thông báo tiếng Việt; bác sĩ 403 (N7) |
| CP-64 | 31 | Lễ tân cơ sở 2 `PATCH` KH-A | | 404, DB không đổi |
| CP-65 | 33 | Hết hạn phiên rồi bấm Lưu | | Tự gia hạn và lưu được; hỏng cả hai token thì về đăng nhập, không mất dữ liệu ngầm |
| CP-66 | 34 | So với image61; khung 390px | | Có ghi chú vì sao không sửa được họ tên/SĐT; không tràn ngang |

## UC-31 — Đổi trạng thái hoạt động (S5)

**UC Analysis:**
- Trạng thái: `active` (Đang hoạt động), `paused` (Tạm dừng theo dõi), `inactive` (Ngừng hoạt động).
- Đổi sang trạng thái khác `active` thì bắt buộc có lý do, tối đa 500 ký tự.
- Đổi sang chính trạng thái hiện tại thì nhận 409.
- Lưu lý do, người đổi và thời điểm.
- Lịch sử đo và hồ sơ vẫn được giữ.

| RULE | Đánh dấu | Test case / lý do |
|---|---|---|
| 01 Main | Applicable | CP-70 |
| 02 Alternative | Applicable | CP-71 về lại `active` không cần lý do |
| 03 Exception | Applicable | CP-72 cùng trạng thái |
| 04 Preconditions | Applicable | CP-73 khách NEUTRAL vẫn có nút đổi; ghi nhận có đúng ý SRS không |
| 05 Postconditions | Applicable | CP-74 dữ liệu đo và hồ sơ còn nguyên; audit (N3) |
| 06 Interruption | Applicable | CP-75 bấm Hủy |
| 07 Required | Applicable | CP-76 thiếu lý do |
| 08–10 | Not Applicable | |
| 11 Max length | Applicable | CP-77 500/501 ký tự |
| 12 Boundary | Applicable | Gộp CP-77 |
| 13 Special chars | Applicable | CP-78 |
| 14 Whitespace | Applicable | CP-76: lý do chỉ có khoảng trắng |
| 15 Null/empty | Applicable | Gộp CP-76 |
| 16–19 | Not Applicable | |
| 20 Persistence | Applicable | CP-70 SQL |
| 21 Update | Applicable | Gộp CP-70 |
| 22 | Not Applicable | |
| 23 Concurrent | Applicable | CP-79 |
| 24 Constraints | Applicable | Gộp CP-76 |
| 25 | Not Applicable | |
| 26 State | Applicable | CP-80 đủ 6 cặp chuyển |
| 27 Invalid op | Applicable | Gộp CP-72; giá trị lạ qua API |
| 28 Dependencies | Not Tested | SRS không nói `paused`/`inactive` có chặn thiết bị hoặc cảnh báo không; cần chốt với nhóm |
| 29 | Not Tested | Đã có ở UC-27 |
| 30–32 | Applicable | CP-81 |
| 33 | Not Tested | Đã có ở UC-30 |
| 34 UI | Applicable | CP-82 so với image10 |
| 35 Error msg | Applicable | CP-76: nút bị khóa, không có câu giải thích |
| 36 Success msg | Applicable | CP-70 "Đã chuyển sang: …" |
| 37–39 | Not Tested | Đã có ở UC-29 |

| ID | RULE | Bước | Kết quả mong đợi |
|---|---|---|---|
| CP-70 | 01, 20, 36 | Đổi KH-A sang "Tạm dừng theo dõi", lý do "Đi công tác 2 tuần" | Toast; panel hiện lý do và "thời điểm · người đổi". SQL: `activity_status='paused'`, `activity_reason`, `activity_changed_at`, `activity_changed_by_id` |
| CP-71 | 02 | Đổi về "Đang hoạt động", lý do để trống | Lưu được |
| CP-72 | 03, 27 | API gửi cùng trạng thái; gửi `status:"deleted"` | 409; 422 |
| CP-73 | 04 | Mở KH-B (NEUTRAL) | Ghi nhận nút "Đổi trạng thái" vẫn hiện |
| CP-74 | 05 | Sau CP-70 mở các panel đo, hồ sơ y tế | Dữ liệu còn đủ |
| CP-75 | 06 | Mở dialog, chọn, bấm Hủy | DB không đổi |
| CP-76 | 07, 14, 15, 35 | Chọn "Ngừng hoạt động", lý do trống hoặc chỉ có khoảng trắng; API gửi `reason:""` | Nút "Xác nhận trạng thái" bị khóa; API 422 |
| CP-77 | 11, 12 | Lý do 500 / 501 ký tự (API) | 500 lưu được; 501 nhận 422; ô nhập chặn ở 500 |
| CP-78 | 13 | Lý do tiếng Việt có dấu, xuống dòng | Lưu và hiện đúng |
| CP-79 | 23 | 2 lễ tân cùng đổi sang 2 trạng thái khác nhau | Không lỗi 500; trạng thái cuối khớp lần ghi sau; hoặc 409 "vừa bị người khác thay đổi" |
| CP-80 | 26 | Lần lượt active→paused→inactive→active→inactive→paused→active | Mọi bước 200 |
| CP-81 | 30–32 | Bác sĩ, ADMIN, lễ tân cơ sở 2 gọi API | 403 / 403 / 404 |
| CP-82 | 34 | So với image10 | Có trạng thái hiện tại, người đổi gần nhất, câu "Lịch sử đo và hồ sơ chăm sóc vẫn được lưu giữ" |

## FE-09 — Nhóm chăm sóc và Thiết bị trên chi tiết khách (S6)

**Phân tích:**
- Chỉ khách đã là bệnh nhân mới gán được.
- **Nhóm chăm sóc:** chỉ CLINIC_ADMIN gán được; chỉ chọn nhân viên lâm sàng còn hoạt động; "Kết thúc" chuyển sang lịch sử.
- **Thiết bị:** MANAGER hoặc CLINIC_ADMIN gán; mỗi lúc tối đa 1 thiết bị; chỉ chọn thiết bị `available`; "Thu hồi" trả thiết bị về. Có ghi audit.

| ID | RULE | Bước | Kết quả mong đợi |
|---|---|---|---|
| CP-90 | 01, 20 | CLINIC_ADMIN thêm bác sĩ 0900000011 vào nhóm KH-A | Toast; SQL `monitoring_assignment` active |
| CP-91 | 05, 19 | Bác sĩ đó mở `/my-patients` | Thấy KH-A, "Theo dõi từ" đúng |
| CP-92 | 26 | Bấm "Kết thúc" | Dòng chuyển sang "Đã từng theo dõi"; bác sĩ không còn thấy KH-A ở S7 |
| CP-93 | 30 | Lễ tân (MANAGER) mở nhóm chăm sóc; gọi `POST …/care-team` | Không có ô thêm; API 403 |
| CP-94 | 01, 20 | Lễ tân gán thiết bị available | Thiết bị chuyển sang đang dùng; có `audit_log` |
| CP-95 | 24, 23 | Gán thiết bị thứ 2; 2 lễ tân gán cùng 1 thiết bị cho 2 khách | 409; chỉ 1 lần thành công |
| CP-96 | 26 | Thu hồi | Thiết bị về available, dòng vào lịch sử |
| CP-97 | 35 | Gây lỗi 409 ở CP-95 | Lỗi tiếng Việt, **chỉ 1 toast** (N8) |
| CP-98 | 31 | CLINIC_ADMIN cơ sở 1 gán nhân viên cơ sở 2 qua API | Bị từ chối |

## Bệnh nhân của tôi (S7)

| RULE | Đánh dấu | Test case / lý do |
|---|---|---|
| 01 Main | Applicable | CP-100 |
| 03 Exception | Applicable | CP-101 chưa có bệnh nhân |
| 24, 31 | Applicable | CP-102 chỉ thấy người mình đang theo dõi |
| 30, 32 | Applicable | CP-103 |
| 34 | Applicable | CP-104 |
| 02, 04–23, 25–29, 33, 35–39 | Not Applicable / Not Tested | Màn chỉ đọc, không tìm, không phân trang. RULE-29/33 đã có ở UC-27 |

| ID | Bước | Kết quả mong đợi |
|---|---|---|
| CP-100 | Bác sĩ 0900000011 mở `/my-patients` rồi mở một bệnh nhân | Thấy danh sách phân công đang hiệu lực, thiết bị, "Theo dõi từ"; chi tiết có nhóm chăm sóc và các panel y tế |
| CP-101 | Bác sĩ 0900000022 chưa có phân công | Trạng thái rỗng tiếng Việt |
| CP-102 | Bác sĩ 0900000011 gọi `GET /api/my_patients/{id}` của bệnh nhân không theo dõi; của KH-A sau CP-92 | 404 cả hai |
| CP-103 | Lễ tân và khách GUEST mở `/my-patients` | Trang Forbidden; API 403 |
| CP-104 | Bệnh nhân có nhóm chăm sóc rỗng | Có câu báo rỗng, không phải khung trống (N9) |

## Hồ sơ và người thân trên portal (S8)

**UC Analysis:**
- Chủ tài khoản xem và sửa hồ sơ của mình (trừ họ tên và SĐT), thêm hoặc sửa hồ sơ người thân.
- **Bắt buộc:** ngày sinh (trong quá khứ), giới tính, số giấy tờ (≤ 32).
- **Người thân bắt buộc thêm:** họ tên (≤ 255), SĐT `^[0-9+ ]{8,20}$`, quan hệ.
- **Giới hạn số lượng:** tối đa 10 người thân. Trùng tên (không phân biệt hoa thường) và ngày sinh trong cùng tài khoản thì nhận 409.
- Hồ sơ thiếu ngày sinh, giới tính hoặc CCCD thì bị đánh dấu "cần bổ sung" trước khi đặt lịch.

| RULE | Đánh dấu | Test case / lý do |
|---|---|---|
| 01 Main | Applicable | CP-110 thêm người thân, CP-111 sửa hồ sơ bản thân |
| 02 Alternative | Applicable | CP-112 đổi loại giấy tờ (CCCD / Mã định danh / Hộ chiếu) |
| 03 Exception | Applicable | CP-113 người thân trùng, CP-114 quá 10 người |
| 04 Preconditions | Applicable | CP-115 hồ sơ thiếu thông tin hiện cảnh báo, bổ sung xong thì hết |
| 05 Postconditions | Applicable | CP-116 người thân mới có mã KH, xuất hiện khi đặt lịch và ở S1 của nhân viên |
| 06 Interruption | Applicable | CP-117 Hủy giữa form |
| 07 Required | Applicable | CP-118 |
| 08 Data type | Applicable | CP-119 họ tên toàn số; ngày sai qua API |
| 09 Format | Applicable | CP-120 SĐT người thân |
| 10 Min length | Applicable | Gộp CP-120 (SĐT 7 ký tự) |
| 11 Max length | Applicable | CP-121 |
| 12 Boundary | Applicable | CP-122 ngày sinh, ngày cấp; người thân thứ 10 và thứ 11 |
| 13 Special chars | Applicable | CP-123 |
| 14 Whitespace | Applicable | CP-124 |
| 15 Null/empty | Applicable | Gộp CP-118 |
| 16 Duplicate | Applicable | CP-113 |
| 17 Unique | Not Applicable | DB không ràng buộc duy nhất cho CCCD hay SĐT người thân. Ghi nhận: 2 tài khoản khai cùng CCCD vẫn lưu được (N10) |
| 18 Ref. integrity | Applicable | CP-116 `guardian_id` đúng chủ |
| 19 Consistency | Applicable | CP-111 hồ sơ bản thân không sửa được họ tên/SĐT kể cả gửi qua API |
| 20 Persistence | Applicable | SQL trong CP-110, CP-111 |
| 21 Update | Applicable | CP-125 sửa người thân |
| 22 Deletion | Not Applicable | Không có chức năng xóa hồ sơ |
| 23 Concurrent | Applicable | CP-126 2 request thêm cùng một người thân |
| 24 Constraints | Applicable | Gộp CP-114 |
| 25 Calculation | Applicable | CP-127 tuổi hiển thị đúng; số người ở trang chủ portal |
| 26 State | Not Applicable | |
| 27 Invalid op | Applicable | CP-128 sửa hồ sơ của tài khoản khác |
| 28 Dependencies | Applicable | Gộp CP-115: chưa bổ sung đủ thì không đặt lịch được |
| 29 Authentication | Applicable | CP-129 |
| 30 Authorization | Applicable | CP-130 nhân viên gọi `/my_profiles` |
| 31 Access scope | Applicable | CP-128 |
| 32 Direct API | Applicable | CP-128 |
| 33 Session | Not Tested | Đã có ở UC-27 |
| 34 UI | Applicable | CP-131 khung điện thoại |
| 35 Error msg | Applicable | CP-113, CP-114: lỗi 409/422 của BE phải hiện bằng tiếng Việt, đúng chỗ (N2) |
| 36 Success msg | Applicable | CP-110 "Đã tạo hồ sơ người bệnh thành công" |
| 37 System error | Applicable | CP-132 |
| 38 Performance | Not Tested | |
| 39 Recovery | Applicable | Gộp CP-132: lỗi thì dữ liệu đã nhập vẫn còn trên form |

| ID | RULE | Bước | Dữ liệu | Kết quả mong đợi |
|---|---|---|---|---|
| CP-110 | 01, 20, 36 | 0900000501 bấm "Thêm người thân", nhập đủ, Lưu | "Nguyễn Thị Lan", 0912345678, Bố/Mẹ, 1960-02-03, Nữ, CCCD 001160000111 | Về danh sách, thẻ mới có badge "Bố / Mẹ". SQL: `guardian_id` = chủ, `customer_code` dạng KH000xxx, `status='NEUTRAL'` |
| CP-111 | 01, 19 | Sửa hồ sơ "Bản thân"; gọi API kèm `fullName` khác | | Không có ô họ tên/SĐT; API bỏ qua `fullName` |
| CP-112 | 02 | Đổi loại giấy tờ sang Hộ chiếu | "C1234567" | Nhãn và câu lỗi đổi theo loại; lưu `national_id_type='passport'` |
| CP-113 | 03, 16, 35 | Thêm lại "nguyễn thị lan" cùng ngày sinh | | 409; thông báo tiếng Việt nói rõ người thân đã có |
| CP-114 | 03, 24 | Thêm tới người thân thứ 11 | | Thứ 10 thành công; thứ 11 nhận 409 kèm thông báo rõ |
| CP-115 | 04, 28 | Hồ sơ người thân thiếu CCCD (dựng bằng SQL) | | Thẻ có cảnh báo "Cần bổ sung…"; trang chủ hiện banner; không đặt lịch cho người này được |
| CP-116 | 05, 18 | Lễ tân tìm người thân mới ở S1 | | Có dòng "Người thân của Trần Thu Trang" |
| CP-117 | 06 | Nhập dở rồi bấm Hủy | | Không có bản ghi mới |
| CP-118 | 07, 15 | Để trống từng ô bắt buộc | | Lỗi dưới đúng ô: "Vui lòng nhập họ và tên", "Số điện thoại không hợp lệ", "Vui lòng chọn quan hệ", "Vui lòng nhập ngày sinh", "Vui lòng chọn giới tính", "Vui lòng nhập số CCCD." |
| CP-119 | 08 | Họ tên "12345"; API `dateOfBirth:"abc"` | | Ghi nhận FE có chặn họ tên toàn số không (form đăng ký có chặn); API 400/422 |
| CP-120 | 09, 10 | SĐT "abc", "0912", "0912 345 678", "+84912345678" | | 2 số đầu bị từ chối; 2 số sau được nhận và lưu dạng +84 |
| CP-121 | 11 | Họ tên 255/256; số giấy tờ 32/33; nghề nghiệp 128/129; địa chỉ 500/501 | | Ở biên lưu được; vượt biên báo "Tối đa N ký tự" |
| CP-122 | 12 | Ngày sinh hôm qua / hôm nay / ngày mai; ngày cấp hôm nay / ngày mai | | Ngày sinh: hôm qua lưu được, hôm nay và ngày mai bị từ chối. Ngày cấp: hôm nay lưu được, ngày mai bị từ chối |
| CP-123 | 13 | Họ tên "Nguyễn Thị Ánh Tuyết", "O'Neil"; địa chỉ có `<b>` | | Lưu và hiện đúng, không chạy HTML |
| CP-124 | 14 | Họ tên "  Lan  ", CCCD " 001160000111 " | | Được cắt khoảng trắng; kiểm tra trùng (CP-113) vẫn bắt được |
| CP-125 | 21 | Sửa quan hệ và CCCD của người thân; API `PATCH` chỉ gửi 1 trường | | Giao diện lưu đúng. API gửi thiếu trường nhận 422 vì PATCH ở đây thực chất là thay toàn bộ, ghi nhận hành vi |
| CP-126 | 23 | 2 request `POST /my_profiles` cùng người thân, song song | | Mong đợi chỉ 1 bản ghi. Code không khóa nên có thể ra 2 bản (N11) |
| CP-127 | 25 | Người sinh 2018-09-21 | | Tuổi đúng theo ngày hiện tại; trang chủ "{n} người" khớp SQL |
| CP-128 | 27, 31, 32 | 0389001001 gọi `GET/PATCH /api/my_profiles/{id con của 0900000501}` | | 404, DB không đổi |
| CP-129 | 29 | Chưa đăng nhập mở `/my-profiles` | | Về trang đăng nhập |
| CP-130 | 30 | Lễ tân gọi `/api/my_profiles` | | 403, hoặc 409 "account has no customer profile". Ghi nhận mã thực tế và thông báo phải là tiếng Việt |
| CP-131 | 34 | Khung 390px: danh sách thẻ, form 3 card | | Không tràn ngang; nhóm nút chọn giới tính và loại giấy tờ bấm được |
| CP-132 | 37, 39 | Tắt BE rồi bấm Lưu | | Báo lỗi; form giữ nguyên dữ liệu; bật BE Lưu lại được, chỉ 1 bản ghi |

## 4. Nghi vấn cần xác nhận khi chạy (Defect Report dự kiến)

Các điểm dưới đây rút ra khi đọc code. Lúc chạy test sẽ xác nhận Pass/Fail, rồi chuyển các điểm Fail thành DEF-xx.

| ID | Mức độ dự kiến | Nội dung | Test case |
|---|---|---|---|
| N1 | Thấp | Ô tìm ở `/customers` để placeholder mặc định "Tìm theo ID hoặc tiêu đề...", trong khi thực tế tìm theo tên, SĐT, mã KH, CCCD | CP-14 |
| N2 | Trung bình | Thông báo lỗi của BE là tiếng Anh. Form dùng toast mặc định của Refine chỉ hiện "(mã trạng thái: 409)", người dùng không biết lý do (người thân trùng, quá 10 người). Panel nhóm chăm sóc và thiết bị in thẳng câu tiếng Anh | CP-32, CP-52, CP-113, CP-114, CP-97 |
| N3 | Trung bình | FE-20/BR-24 yêu cầu ghi audit việc sửa hồ sơ và đổi role. Cập nhật khách, kích hoạt, đổi trạng thái và sửa `my_profiles` hiện không ghi `audit_log` | CP-53, CP-74 |
| N4 | Trung bình | SĐT liên hệ khẩn cấp không kiểm tra định dạng ở cả FE và BE, trong khi BR-19 dùng số này để gọi tự động | CP-56 |
| N5 | Thấp | Tìm chính xác thấy được khách cơ sở khác trong danh sách, nhưng mở chi tiết thì có thể bị 404 | CP-12 |
| N6 | Thấp | Kích hoạt bệnh nhân không đảo ngược được nhưng không có hộp xác nhận | CP-35 |
| N7 | Thấp | Route `/customers/edit/:id` chỉ chặn quyền xem: ADMIN vào được form, đến lúc Lưu mới nhận 403 | CP-63 |
| N8 | Thấp | Panel nhóm chăm sóc có thể hiện 2 toast lỗi (toast riêng và toast mặc định của Refine) | CP-97 |
| N9 | Thấp | Chi tiết ở S7 không có câu báo khi nhóm chăm sóc rỗng | CP-104 |
| N10 | Cần chốt | Không có ràng buộc duy nhất cho CCCD giữa các tài khoản | RULE-17 ở S8 |
| N11 | Trung bình | Thêm người thân không khóa: 2 request đồng thời có thể vượt giới hạn 10 hoặc tạo trùng | CP-126 |

## 5. Tiêu chí hoàn thành

- Mọi RULE của từng UC đã được đánh Applicable, Not Applicable (có lý do) hoặc Not Tested.
- Mọi test case P1 (RULE-26, 27, 29–32) đều Pass, hoặc có DEF-xx được nhóm chấp nhận.
- Kết quả ghi DB đã đối chiếu bằng SQL.
- DB test được dựng lại sau khi chạy.
- Viết báo cáo kết quả theo mẫu `2026-11-07-booking-spec-uc01-04.md`: tổng số check, Pass/Fail, bảng Defect.

## 6. Ước lượng

| Phần | Test case | Ghi chú |
|---|---|---|
| UC-27 | 16 | Phần lớn tự động hóa được bằng Playwright + SQL |
| UC-28 | 7 | |
| UC-29 | 14 | Cần đọc OTP từ log để dựng khách NEUTRAL |
| UC-30 | 17 | |
| UC-31 | 13 | |
| S6 | 9 | |
| S7 | 5 | |
| S8 | 23 | |
| **Tổng** | **104** | |
