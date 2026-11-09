# Báo cáo kiểm thử — Đặc tả Đặt lịch / Check-in / Walk-in / Đăng ký (UC-01..04)

- **Ngày chạy:** 07/11/2026
- **Nhánh:** `spec-booking-flow` (BE, FE)
- **Người chạy:** Claude (Playwright tự động, kiểm tra DB bằng SQL)
- **Môi trường:**
  - BE chạy từ worktree với DB riêng `vitalcare_spec` (copy từ `vitalcare`).
  - OTP ghi ra log, không gửi SMS.
  - Dùng terminal VNPay giả (`TESTTMN1`); callback VNPay được ký trong script, không gọi VNPay thật.
  - FE dev ở `http://localhost:5176`.
- **Dữ liệu dựng thêm:** thêm ca thứ Bảy 07:00–21:00 cho bác sĩ 1 (cơ sở 1) và bác sĩ 6 (cơ sở 2), vì hôm chạy là thứ Bảy.
- **Script:** `docs/testing/booking-spec-e2e/*.js`. Cần BE, FE và DB như trên. Cách chạy:
  - `node resetdb.js` (dựng lại DB test), khởi động lại BE, rồi `node run-all.js`.
  - Mobile: `node umob.js`, chạy trên bản Flutter web build bằng `--dart-define=API_URL=http://localhost:8080/api`, phục vụ ở cổng 5190.
  - BE test cần thêm biến môi trường `APP_NO_SHOW_SWEEP=20s` và `APP_OTP_MAX_PER_IP_PER_HOUR=200`.

## Lần chạy 2 — trọn bộ end-to-end trên DB sạch (07/11/2026)

| Phần | Check | Pass | Ghi chú |
|---|---|---|---|
| UC-04 Đăng ký (web) | 34 | 34 | Tự dựng dữ liệu walk-in ngay trong script |
| UC-01 Đặt lịch (web) | 29 | 29 | |
| UC-02 Check-in (web) | 27 | 27 | J-01 có thể chạy trước khi quầy tra cứu; script chấp nhận cả lịch đã thành NO_SHOW |
| UC-03 Walk-in (web), gồm C1 | 20 | 20 | |
| Bổ sung: J-01, đồng thời, phạm vi cơ sở, phiên hết hạn, mất kết nối | 18 | 18 | Bắt được DEF-03, đã sửa |
| Mobile (Flutter web, khung điện thoại 412px) | 14 | 14 | Đăng ký có chọn hồ sơ, D2, đăng nhập, phí khám, trả online / trả tại quầy, BR-11 |
| **Tổng** | **142** | **142** | |

Các phần bổ sung đã phủ:
- **J-01:** lịch BOOKED đã qua ngày tự thành NO_SHOW và hóa đơn chưa trả bị hủy; lịch hôm nay còn ca và lịch đã check-in không bị đụng.
- **RULE-23 (đồng thời):**
  - 2 lễ tân check-in cùng lúc: đúng 1 thành công.
  - 2 lần đặt lịch cùng người cùng ngày: chỉ ra 1 lịch, không cấp trùng số thứ tự.
  - 2 lần chuyển walk-in cùng lúc: chỉ ra 1 lượt.
- **RULE-31 (phạm vi cơ sở):** lễ tân cơ sở 2 tra mã hoặc thao tác trên lịch cơ sở 1 đều nhận 404.
- **RULE-33 (phiên đăng nhập):** access token hết hạn nhưng refresh token còn thì tự gia hạn; cả hai hỏng thì về trang đăng nhập; token giả nhận 401.
- **RULE-37:** mất kết nối máy chủ thì báo lỗi tiếng Việt.
- **RULE-24:** giới hạn OTP theo IP (10 lần/giờ) chặn đúng khi chạy nhiều test liên tiếp; môi trường test đã nới giới hạn này.

## Lần chạy 1 — tổng kết

| UC | Check | Pass | Fail | Ghi chú |
|---|---|---|---|---|
| UC-04 Đăng ký và liên kết hồ sơ | 33 | 33 | 0 | |
| UC-01 Đặt lịch online | 29 | 29 | 0 | |
| UC-02 Check-in tại quầy | 30 | 30 | 0 | Bắt được DEF-02, đã sửa rồi chạy lại |
| UC-03 Walk-in | 21 | 21 | 0 | Bắt được DEF-01, đã sửa. 2 check sai do script dựng dữ liệu, đã chạy lại bằng `uc03c.js` |
| **Tổng** | **113** | **113** | **0** | Có 2 defect được tìm ra và đã sửa |

## Defect Report

| ID | Mức độ | Mô tả | Bước tái hiện | Actual | Expected | Trạng thái |
|---|---|---|---|---|---|---|
| DEF-01 | Cao | Tạo walk-in khách mới không có CCCD thì lỗi 500. Lỗi có sẵn từ nhánh gốc. | Quầy, Walk-in, chọn Khách mới, bỏ trống CCCD, bấm Đăng ký | 500, log báo `function btrim(bytea) does not exist` | Tạo được hồ sơ và lượt khám | **Đã sửa:** ép kiểu tham số trong `CustomerRepository.findWalkInDuplicates` |
| DEF-02 | Cao | Chuyển lịch trễ đã trả online sang walk-in thì lỗi 500 | Quầy, tra mã lịch đã qua ngày (đã trả), bấm "Chuyển sang khám trực tiếp" | 500, log báo `uq_invoice_exam_appointment` | Lượt mới READY và tiền được chuyển sang | **Đã sửa:** ghi lệnh hủy hóa đơn mới xuống DB trước khi chuyển hóa đơn đã trả (`Invoices.carryExamPaid`). Đã xác nhận lần lỗi trước rollback sạch. |
| DEF-03 | Cao | 2 lần "Chuyển sang khám trực tiếp" đồng thời tạo ra 2 lượt walk-in | Gửi 2 request `POST /appointments/{id}/walk-in` song song | Cả 2 nhận 201 | 1 nhận 201, 1 nhận 409 | **Đã sửa:** kiểm tra "mỗi hồ sơ một lượt mở mỗi ngày" (chạy dưới khóa theo ngày của phòng khám) tính cả lượt đã check-in. Chạy lại Pass |
| OBS-03 | Thấp | J-01 ghi log "refund needed" cho phí đã trả của lịch NO_SHOW, trong khi khoản phí này giữ lại để chuyển sang walk-in (UC-02 B1) | | Log báo cần hoàn tiền | Log báo giữ phí | **Đã sửa** |
| OBS-01 | Thấp | Ô SĐT ở form walk-in không nhận khoảng trắng ("0389 001 003"), dù BE chuẩn hóa được (BR-08) | Nhập SĐT có khoảng trắng | Báo sai định dạng | Nhận và tự chuẩn hóa | Chưa sửa (hành vi có sẵn) |
| OBS-02 | Trung bình (quy trình) | `mvn test` có test khởi động Spring context bằng datasource mặc định, tức DB dev `vitalcare`. Lần chạy đầu đã áp migration 056 lên DB dev. | `mvn test` không có cấu hình test riêng | Migration chạy lên DB dev | Test dùng DB riêng | Đã rollback 056 trên DB dev, xác nhận không có dòng dữ liệu lạ. Nên thêm `src/test/resources/application.properties` trỏ DB test. |

---

## UC-04 — Đăng ký tài khoản và liên kết hồ sơ

**UC Analysis:** Khách nhập SĐT và thông tin rồi nhận OTP. OTP đúng thì hệ thống hiện các hồ sơ chưa có chủ cùng SĐT, tên đã che. Người dùng chọn hồ sơ của mình (các hồ sơ còn lại thành người thân), hoặc chọn "Không phải tôi". Quy tắc áp dụng: BR-06, BR-08, BR-09, BR-13, BR-14.

**Dữ liệu:** 2 hồ sơ walk-in cùng số 0389001001: "Nguyễn Văn Thử" (1985) và "Trần Thị Mẹ" (1960). Số 0900000002 đã có tài khoản.

| RULE | Đánh dấu | Test case / lý do |
|---|---|---|
| 01 Main | Applicable | OTP, danh sách che tên, chọn hồ sơ, về trang đăng nhập, đăng nhập thấy hồ sơ và người thân — Pass |
| 02 Alternative | Applicable | Số chưa có hồ sơ: danh sách rỗng, tạo hồ sơ mới — Pass |
| 03 Exception | Applicable | D3 OTP sai: báo lỗi tiếng Việt, đếm số lần sai — Pass |
| 04 Preconditions | Applicable | D2 số đã có tài khoản thì không cấp OTP — Pass |
| 05 Postconditions | Applicable | Liên kết hồ sơ 57, hồ sơ 58 thành người thân, xem được lịch sử walk-in — Pass |
| 06 Interruption | Not Tested | Chưa test bấm "Sửa thông tin" hoặc thoát giữa chừng |
| 07 Required | Applicable | Bỏ trống trường, chưa chọn hồ sơ — Pass |
| 08 Data type | Applicable | Họ tên chứa số — Pass |
| 09 Format | Applicable | SĐT sai định dạng — Pass |
| 10 Min length | Applicable | Mật khẩu dưới 8 ký tự — Pass |
| 11 Max length | Not Tested | Chưa test tên dài 255 ký tự hoặc mật khẩu dài 72 byte trên giao diện (đã có unit test BE) |
| 12 Boundary | Not Tested | Chưa test mật khẩu đúng 8 ký tự |
| 13 Special chars | Applicable | Họ tên tiếng Việt có dấu được chấp nhận, ký tự số bị chặn — Pass |
| 14 Whitespace | Applicable | Họ tên có khoảng trắng đầu và cuối được cắt bỏ — Pass |
| 15 Null/empty | Applicable | Gộp chung với RULE-07 — Pass |
| 16 Duplicate | Applicable | Dùng lại OTP, đăng ký trùng số — Pass |
| 17 Unique | Applicable | SĐT duy nhất (D2) — Pass |
| 18 Ref. integrity | Applicable | `guardian_id` của hồ sơ 58 trỏ về 57 — Pass |
| 19 Consistency | Applicable | Hồ sơ chính chủ lấy tên và SĐT từ tài khoản; mật khẩu nhập lại không khớp bị chặn — Pass |
| 20 Persistence | Applicable | Kiểm tra bằng SQL: `users`, `customer`, `phone_verification` (hạn 300 giây, số lần sai, đã dùng) — Pass |
| 21 Update | Not Applicable | UC không có bước sửa |
| 22 Deletion | Not Applicable | UC không có bước xóa |
| 23 Concurrent | Not Tested | Chưa test 2 người cùng đăng ký một số |
| 24 Constraints | Applicable | BR-13 gửi lại mã trước 60 giây bị từ chối — Pass |
| 25 Calculation | Not Applicable | Không có phép tính |
| 26 State | Not Applicable | Không có máy trạng thái |
| 27 Invalid op | Applicable | Nhận hồ sơ không thuộc danh sách khớp — Pass (xem RULE-32) |
| 28 Dependencies | Applicable | Role theo SRS (hồ sơ đã là bệnh nhân thì tài khoản là Patient) — Pass |
| 29 Authentication | Not Applicable | Màn dành cho người chưa đăng nhập |
| 30 Authorization | Not Applicable | Như RULE-29 |
| 31 Access scope | Applicable | BR-14 che tên, không lộ tên đầy đủ và ngày sinh — Pass |
| 32 Direct API | Applicable | Gọi thẳng API với `claimProfileId` của số khác thì nhận 422, hồ sơ không bị gắn — Pass |
| 33 Session | Not Applicable | Chưa có phiên đăng nhập |
| 34 UI | Applicable | Không còn ô ngày sinh, có đếm ngược gửi lại mã, có lựa chọn "Không phải tôi" — Pass |
| 35 Error msg | Applicable | Lỗi bằng tiếng Việt, hiện một chỗ, không kèm toast — Pass |
| 36 Success msg | Applicable | Đăng ký xong về trang đăng nhập — Pass |
| 37 System error | Not Tested | Chưa test lúc server lỗi |
| 38 Performance | Not Tested | Chưa đo riêng cho UC này |
| 39 Recovery | Not Tested | Chưa test |

## UC-01 — Đặt lịch khám online

**UC Analysis:** Bệnh nhân chọn người khám và ngày. Hết suất thì hệ thống gợi ý ngày khác (A1). Tạo lịch BOOKED kèm số thứ tự, rồi bệnh nhân chọn trả online hoặc trả tại quầy. Thanh toán online lỗi thì cho thử lại hoặc đổi sang trả tại quầy (A2). Có xác nhận qua SMS và trong app. Quy tắc áp dụng: BR-01..04, BR-10..12.

| RULE | Đánh dấu | Test case / lý do |
|---|---|---|
| 01 Main | Applicable | Đặt lịch cho người thân, ra phiếu khám, chọn trả online, thanh toán thành công — Pass |
| 02 Alternative | Applicable | A1 gợi ý ngày còn lượt rồi bấm chọn; chọn trả tại quầy — Pass |
| 03 Exception | Applicable | A2 VNPay trả lỗi (mã 24): báo lỗi, cho thử lại — Pass |
| 04 Preconditions | Applicable | Gộp với RULE-29 |
| 05 Postconditions | Applicable | Có thông báo trong app; SMS ghi ra log vì chưa có mẫu tin (BR-12) — Pass |
| 06 Interruption | Not Tested | |
| 07 Required | Applicable | Bỏ trống lý do khám — Pass |
| 08–11, 13–15 | Not Applicable | Form chỉ có ô chọn người, chọn ngày và ô lý do; độ dài lý do đã có unit test BE |
| 12 Boundary | Applicable | Ngày trong quá khứ bị từ chối — Pass |
| 16 Duplicate | Applicable | Đặt trùng người trùng ngày bị từ chối; callback VNPay gửi lại không ghi nhận 2 lần — Pass |
| 17 Unique | Not Applicable | |
| 18 Ref. integrity | Applicable | Lịch gắn với hồ sơ người thân 58 — Pass |
| 19 Consistency | Not Applicable | |
| 20 Persistence | Applicable | SQL: lịch BOOKED, hóa đơn UNPAID rồi PAID, có `paid_at` — Pass |
| 21 Update | Not Applicable | |
| 22 Deletion | Not Applicable | |
| 23 Concurrent | Not Tested | |
| 24 Constraints | Applicable | BR-01 không gợi ý ngày nghỉ — Pass |
| 25 Calculation | Applicable | Có số thứ tự; BR-11 đếm đủ 3 lần NO_SHOW — Pass |
| 26 State | Applicable | BR-04 đã trả nhưng chưa check-in thì vẫn BOOKED — Pass |
| 27 Invalid op | Applicable | BR-11: ẩn "Trả tại quầy" và hiện cảnh báo — Pass |
| 28 Dependencies | Not Applicable | |
| 29 Authentication | Applicable | Chưa đăng nhập thì chuyển về trang đăng nhập — Pass |
| 30 Authorization | Applicable | Bệnh nhân gọi API của quầy nhận 403 — Pass |
| 31 Access scope | Applicable | Đặt cho hồ sơ không thuộc tài khoản bị từ chối — Pass |
| 32 Direct API | Applicable | Gộp với RULE-30 và RULE-31 |
| 33 Session | Not Tested | |
| 34 UI | Applicable | Phiếu có số và mã; giao diện điện thoại không tràn ngang — Pass |
| 35 Error msg | Applicable | Gộp với RULE-07 và RULE-03 |
| 36 Success msg | Applicable | Báo "Thanh toán thành công" — Pass |
| 37 System error | Applicable | BR-12 không có mẫu SMS thì ghi log, đặt lịch vẫn thành công — Pass |
| 38 Performance | Applicable | Đặt lịch dưới 3 giây — Pass |
| 39 Recovery | Applicable | Thanh toán lỗi xong thì lịch và phí không đổi, thử lại vẫn được — Pass |

**Not Tested:** J-01 (tự đánh NO_SHOW sau giờ check-in cuối) chạy theo lịch 15 phút một lần nên chưa chạy E2E; đã có unit test, gồm cả trường hợp tranh chấp với check-in và ngày không có ca.

## UC-02 — Check-in tại quầy

**UC Analysis:** Quầy tìm lịch theo mã, SĐT hoặc CCCD rồi check-in (CHECKED_IN), thu phí, lịch vào hàng chờ (READY) và in phiếu. B1 xử lý các trường hợp: đến sớm, đến trễ hoặc NO_SHOW, đã hủy, sai người khám, không tìm thấy, quét trùng. B2: thu phí thất bại.

| RULE | Đánh dấu | Test case / lý do |
|---|---|---|
| 01 Main | Applicable | Tìm theo SĐT, check-in, thu phí, READY, có nút in phiếu; tìm theo CCCD — Pass |
| 02 Alternative | Applicable | Lịch trễ đã trả chuyển sang walk-in, tiền được chuyển theo — Pass |
| 03 Exception | Applicable | Không tìm thấy thì gợi ý khám trực tiếp — Pass |
| 04 Preconditions | Applicable | Dựng đủ dữ liệu cho các trường hợp — Pass |
| 05 Postconditions | Applicable | Lịch cũ thành NO_SHOW — Pass |
| 06 Interruption | Not Tested | |
| 07 Required | Applicable | Từ chối (hủy lịch) mà không có lý do — Pass |
| 08–15 | Not Applicable | Chỉ có ô tra cứu tự do |
| 16 Duplicate | Applicable | Quét trùng; chuyển walk-in lần 2 bị từ chối — Pass |
| 17 Unique | Not Applicable | |
| 18 Ref. integrity | Applicable | Hóa đơn đã trả gắn sang lượt mới — Pass |
| 19 Consistency | Applicable | Thu tiền đúng 1 lần, hóa đơn mới bị hủy — Pass |
| 20 Persistence | Applicable | SQL: trạng thái, `checked_in_at`, `paid_at`, hóa đơn — Pass |
| 21 Update | Applicable | Đổi người khám và hóa đơn đổi theo; đổi lịch đến sớm sang hôm nay — Pass |
| 22 Deletion | Not Applicable | |
| 23 Concurrent | Applicable (một phần) | Chặn bấm chuyển walk-in 2 lần; chưa test 2 người dùng thao tác thật cùng lúc |
| 24 Constraints | Applicable | BR-04 chỉ vào hàng chờ khi đã check-in và đã trả phí — Pass |
| 25 Calculation | Applicable | BR-05 lịch có trong hàng chờ hôm nay — Pass |
| 26 State | Applicable | BOOKED → CHECKED_IN → READY; check-in lại nhận 409; lịch đã hủy không check-in được — Pass |
| 27 Invalid op | Applicable | Đổi người khám sang hồ sơ của tài khoản khác bị từ chối — Pass |
| 28 Dependencies | Applicable | Lịch đã hủy chuyển walk-in thì thu phí như bình thường, không chuyển tiền — Pass |
| 29 Authentication | Not Tested | Đã có ở RULE-29 của UC-01 |
| 30 Authorization | Applicable | Bệnh nhân không vào được màn quầy — Pass |
| 31 Access scope | Not Tested | Chưa test lễ tân cơ sở 2 xem lịch của cơ sở 1 |
| 32 Direct API | Applicable | Gộp với RULE-26 và RULE-27 |
| 33 Session | Not Tested | |
| 34 UI | Applicable | Hiện đúng thông báo cho từng trường hợp B1 — Pass |
| 35 Error msg | Applicable | Gộp với RULE-03 |
| 36 Success msg | Applicable | Thông báo "Đã tiếp nhận" — Pass |
| 37 System error | Applicable | DEF-02 (trước khi sửa) — Fail, đã sửa và chạy lại Pass |
| 38 Performance | Not Tested | |
| 39 Recovery | Applicable | Lần lỗi 500 rollback sạch, không để lại lượt mồ côi — Pass |

## UC-03 — Tiếp nhận bệnh nhân walk-in

| RULE | Đánh dấu | Test case / lý do |
|---|---|---|
| 01 Main | Applicable | Khách mới, lượt hôm nay CHECKED_IN, thu phí, READY, có nút in phiếu; tìm được hồ sơ có sẵn theo SĐT — Pass |
| 02 Alternative | Applicable | Dùng hồ sơ có sẵn — Pass |
| 03 Exception | Applicable | C2 khách đưa thiếu tiền thì không cho xác nhận — Pass |
| 04 Preconditions | Not Applicable | UC không cần tài khoản |
| 05 Postconditions | Applicable | Hồ sơ không có tài khoản, SĐT dạng +84 — Pass |
| 06 Interruption | Not Tested | |
| 07 Required | Applicable | BR-07 bắt buộc họ tên, SĐT, ngày sinh, giới tính, lý do khám — Pass |
| 08 Data type | Not Applicable | |
| 09 Format | Applicable | SĐT sai định dạng — Pass |
| 10–13 | Not Tested | |
| 14 Whitespace | Applicable | SĐT có khoảng trắng bị từ chối, ghi nhận OBS-01 |
| 15 Null | Applicable | CCCD trống (DEF-01, đã sửa) — Pass |
| 16 Duplicate | Applicable | BR-06 hồ sơ trùng; 2 lượt cùng ngày — Pass |
| 17 Unique | Not Applicable | |
| 18 Ref. integrity | Not Applicable | |
| 19 Consistency | Not Applicable | |
| 20 Persistence | Applicable | SQL: hồ sơ, lượt khám, hóa đơn — Pass |
| 21, 22 | Not Applicable | |
| 23 Concurrent | Not Tested | |
| 24 Constraints | Applicable | C1 hết suất thì báo kèm ngày khác — Pass |
| 25 Calculation | Applicable | Có số thứ tự — Pass |
| 26 State | Applicable | CHECKED_IN → READY sau khi thu phí — Pass |
| 27 Invalid op | Applicable | C1 walk-in không chọn được ngày khác — Pass |
| 28 Dependencies | Not Applicable | |
| 29–31, 33 | Not Tested | Đã có ở UC-01 và UC-02 |
| 32 Direct API | Applicable | Gọi API khi hết suất nhận 422, không để lại hồ sơ mồ côi — Pass |
| 34 UI | Applicable | Có nút in phiếu; giao diện điện thoại không tràn ngang — Pass |
| 35 Error msg | Applicable | Lỗi hết suất bằng tiếng Việt — Pass |
| 36 Success msg | Not Tested | |
| 37 System error | Applicable | DEF-01 (trước khi sửa) — Fail, đã sửa và chạy lại Pass |
| 38 Performance | Not Tested | |
| 39 Recovery | Applicable | Thao tác all-or-nothing; khôi phục ca làm việc sau test — Pass |

## Chưa phủ (cần làm tiếp)

Sau lần chạy 2, các mục đồng thời, phiên hết hạn, mất kết nối, phạm vi cơ sở, J-01 và mobile đã được phủ. Còn lại:

- **Mobile trên thiết bị Android thật hoặc emulator:** máy chưa có AVD; mới test bản Flutter web ở khung điện thoại.
- **Form đặt lịch trên mobile** (date picker và gợi ý ngày còn lượt): lịch được tạo qua API. Gợi ý ngày đã test trên web.
- **Thanh toán VNPay trên mobile:** mở trình duyệt ngoài nên không test được trên bản web; luồng VNPay đã test trên web.
- **RULE-37 khi DB sập giữa chừng:** mới test mất kết nối tới API.
