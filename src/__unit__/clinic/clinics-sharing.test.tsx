/** FE-17 Create Clinic and FE-11 / FE-21 sharing screens. Report-5.1, sheet FE_ClinicScreens. */
import { screen as view, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { ClinicCreate } from "@/features/clinic/clinics";
import { MySharing } from "@/features/clinic/sharing";
import { api, notify, screen, sent } from "./harness";

beforeEach(() => notify.open.mockClear());

describe("ClinicCreate (/clinics/create) — Create Clinic", () => {
  const open = () => screen("/clinics/create", "/clinics/create", <ClinicCreate />);
  const fill = async (user: ReturnType<typeof userEvent.setup>, phone: string) => {
    await user.type(await view.findByPlaceholderText("VitalCare Clinic – Cơ sở 3"), "VitalCare Cơ sở 3");
    await user.type(view.getByPlaceholderText("contact@vitalcare.vn"), "cs3@vitalcare.vn");
    await user.type(view.getByPlaceholderText("+84 28 …"), phone);
    await user.type(view.getByPlaceholderText("Văn phòng phòng khám"), "Lễ tân");
    await user.type(view.getByPlaceholderText("Đường, phường/xã, tỉnh/thành phố"), "1 Lê Lợi, Hà Nội");
  };

  it("CL1 every field is required; nothing is sent", async () => {
    api({});
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("button", { name: "Lưu phòng khám" }));
    for (const message of ["Vui lòng nhập tên phòng khám", "Vui lòng nhập email liên hệ", "Vui lòng nhập điện thoại liên hệ", "Vui lòng nhập người liên hệ", "Vui lòng nhập địa chỉ"]) {
      expect(await view.findByText(message)).toBeInTheDocument();
    }
    expect(sent("POST", "/clinics")).toHaveLength(0);
  });

  it("CL2 a phone that is not a Vietnamese number is refused", async () => {
    api({});
    const user = userEvent.setup();
    open();
    await fill(user, "12345");
    await user.click(view.getByRole("button", { name: "Lưu phòng khám" }));
    expect(await view.findByText("Số điện thoại không hợp lệ. Vui lòng nhập một số khác")).toBeInTheDocument();
    expect(sent("POST", "/clinics")).toHaveLength(0);
  });

  it("CL3 a landline with spaces is taken; the clinic is created operating and opened", async () => {
    api({ "POST /clinics": { status: 200, body: { id: "c-3" } } });
    const user = userEvent.setup();
    open();
    await fill(user, "+84 28 3822 1234");
    await user.click(view.getByRole("button", { name: "Lưu phòng khám" }));
    await waitFor(() => expect(sent("POST", "/clinics")).toHaveLength(1));
    expect(sent("POST", "/clinics")[0].body).toEqual({
      name: "VitalCare Cơ sở 3", contactEmail: "cs3@vitalcare.vn", contactPhone: "+84 28 3822 1234",
      contactPerson: "Lễ tân", address: "1 Lê Lợi, Hà Nội", operatingStatus: "OPERATING",
    });
    await waitFor(() => expect(view.getByTestId("location").textContent).toBe("/clinics/show/c-3"));
  });

  it("CL4 a duplicate name is said under the name, not in a toast", async () => {
    api({
      "POST /clinics": { status: 422, body: { status: 422, message: "Validation failed", errors: { name: "Tên phòng khám đã tồn tại." } } },
    });
    const user = userEvent.setup();
    open();
    await fill(user, "0901234567");
    await user.click(view.getByRole("button", { name: "Lưu phòng khám" }));
    expect(await view.findByText("Tên phòng khám đã tồn tại.")).toBeInTheDocument();
    expect(notify.open.mock.calls.filter(([n]) => n?.type === "error")).toHaveLength(0);
  });

  it("CL5 a refusal naming no field of the form is said in a toast", async () => {
    api({ "POST /clinics": { status: 500, body: { message: "boom" } } });
    const user = userEvent.setup();
    open();
    await fill(user, "0901234567");
    await user.click(view.getByRole("button", { name: "Lưu phòng khám" }));
    await waitFor(() =>
      expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({ type: "error", message: "Không lưu được phòng khám. Vui lòng thử lại." })),
    );
  });
});

const share = {
  id: 4, customerId: 1, customerName: "Trần Thị Bích", caregiverUserId: 9, caregiverName: "Nguyễn Văn An", caregiverPhone: "0900000101",
  shareVitals: true, shareAlerts: true, shareAppointments: false, emergencyPhone: "+84912345678", expiresAt: null, note: null,
  status: "ACTIVE", createdAt: "2026-11-01T00:00:00Z", revokedAt: null,
};

describe("MySharing (/my-sharing) — Caregiver Access List / Grant / Update / Revoke", () => {
  const open = () => screen("/my-sharing", "/my-sharing", <MySharing />);

  it("SG1 the shares in force are listed with what they cover; history apart", async () => {
    api({
      "GET /my_profiles*": { status: 200, body: [] },
      "GET /my_sharing": { status: 200, body: [share, { ...share, id: 5, caregiverName: "Lê Cũ", status: "REVOKED" }] },
    });
    open();
    const active = await view.findByTestId("sharing-active");
    expect(await within(active).findByText("Đang chia sẻ (1/2)")).toBeInTheDocument();
    expect(within(active).getByText(/Nguyễn Văn An · 0900000101/)).toBeInTheDocument();
    expect(within(active).getByText(/Sinh hiệu, Cảnh báo/)).toBeInTheDocument();
    expect(within(active).queryByText(/Lê Cũ/)).toBeNull();
  });

  it("SG2 Chia sẻ stays disabled until both phone numbers are typed", async () => {
    api({ "GET /my_profiles*": { status: 200, body: [] }, "GET /my_sharing": { status: 200, body: [] } });
    const user = userEvent.setup();
    open();
    const button = await view.findByRole("button", { name: "Chia sẻ" });
    expect(button).toBeDisabled();
    await user.type(view.getByLabelText("Số điện thoại tài khoản người chăm sóc"), "0900000101");
    expect(button).toBeDisabled();
    await user.type(view.getByLabelText("Số gọi khi khẩn cấp"), "   ");
    expect(button).toBeDisabled();
  });

  it("SG3 a grant sends both numbers, the parts ticked (vitals and alerts by default) and no end date", async () => {
    api({
      "GET /my_profiles*": { status: 200, body: [] },
      "GET /my_sharing": { status: 200, body: [] },
      "POST /my_sharing": { status: 200, body: share },
    });
    const user = userEvent.setup();
    open();
    await user.type(await view.findByLabelText("Số điện thoại tài khoản người chăm sóc"), "0900000101");
    await user.type(view.getByLabelText("Số gọi khi khẩn cấp"), "0912345678");
    await user.click(view.getByRole("button", { name: "Chia sẻ" }));
    await waitFor(() => expect(sent("POST", "/my_sharing")).toHaveLength(1));
    expect(sent("POST", "/my_sharing")[0].body).toEqual({
      profileId: null, caregiverPhone: "0900000101", emergencyPhone: "0912345678",
      shareVitals: true, shareAlerts: true, shareAppointments: false, expiresAt: null,
    });
    await waitFor(() => expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({ type: "success", message: "Đã chia sẻ" })));
  });

  it("SG4 an end date is sent as the end of that day in Vietnam", async () => {
    api({ "GET /my_profiles*": { status: 200, body: [] }, "GET /my_sharing": { status: 200, body: [] }, "POST /my_sharing": { status: 200, body: share } });
    const user = userEvent.setup();
    open();
    await user.type(await view.findByLabelText("Số điện thoại tài khoản người chăm sóc"), "0900000101");
    await user.type(view.getByLabelText("Số gọi khi khẩn cấp"), "0912345678");
    await user.type(view.getByLabelText(/Chia sẻ đến ngày/), "2026-12-31");
    await user.click(view.getByRole("button", { name: "Chia sẻ" }));
    await waitFor(() => expect(sent("POST", "/my_sharing")).toHaveLength(1));
    expect((sent("POST", "/my_sharing")[0].body as { expiresAt: string }).expiresAt).toBe("2026-12-31T16:59:59.000Z");
  });

  it("SG5 the API's refusals are said in Vietnamese under the form", async () => {
    const refuse = (message: string) => ({ status: 409, body: { status: 409, message } });
    for (const [message, vi] of [
      ["At most two caregivers may have access at a time; revoke one first", "Chỉ được chia sẻ cho tối đa 2 người cùng lúc. Hãy thu hồi một người trước."],
      ["That caregiver already has access; change their access instead", "Người này đang được chia sẻ rồi; hãy sửa quyền thay vì cấp mới."],
    ]) {
      api({ "GET /my_profiles*": { status: 200, body: [] }, "GET /my_sharing": { status: 200, body: [] }, "POST /my_sharing": refuse(message) });
      const user = userEvent.setup();
      const { unmount } = open();
      await user.type(await view.findByLabelText("Số điện thoại tài khoản người chăm sóc"), "0900000101");
      await user.type(view.getByLabelText("Số gọi khi khẩn cấp"), "0912345678");
      await user.click(view.getByRole("button", { name: "Chia sẻ" }));
      expect((await view.findByTestId("sharing-error")).textContent).toBe(vi);
      unmount();
    }
  });

  it("SG6 revoking asks first, then posts the revoke", async () => {
    api({
      "GET /my_profiles*": { status: 200, body: [] },
      "GET /my_sharing": { status: 200, body: [share] },
      "POST /my_sharing/4/revoke": { status: 200, body: { ...share, status: "REVOKED" } },
    });
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("button", { name: "Thu hồi" }));
    expect(sent("POST", "/my_sharing/4/revoke")).toHaveLength(0);
    const dialog = await view.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Thu hồi" }));
    await waitFor(() => expect(sent("POST", "/my_sharing/4/revoke")).toHaveLength(1));
  });
});
