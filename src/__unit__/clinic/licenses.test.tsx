/** FE-17 Manage Own Professional License: MyLicenses, ClinicLicenses and ClinicLicenseShow. Report-5.1, sheet FE_ClinicScreens2. */
import { fireEvent, screen as view, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { ClinicLicenses, ClinicLicenseShow, MyLicenses } from "@/features/clinic/results/licenses";
import { api, notify, screen, sent, type Reply } from "./harness";

const cchn = {
  id: 5, employeeId: 9, holderName: "BS. Nguyễn An", kind: "LICENSE", title: "CCHN khám chữa bệnh", licenseNumber: "001/HN",
  issuer: "Sở Y tế Hà Nội", issuedOn: "2020-01-01", expiresOn: "2027-01-01", validity: "VALID", hasFile: false, fileName: null,
};
const cme = { ...cchn, id: 6, holderName: "BS. Trần Bình", kind: "CERTIFICATE", title: "Chứng nhận CME", licenseNumber: "CME-22",
  issuer: "Bộ Y tế", expiresOn: "2026-12-01", validity: "EXPIRING", hasFile: true, fileName: "cme.pdf" };

beforeEach(() => notify.open.mockClear());

describe("MyLicenses (/my-licenses) — Manage Own Professional License", () => {
  const mine = (extra: Record<string, Reply> = {}) => api({ "GET /my_licenses": { status: 200, body: [cchn] }, ...extra });
  const open = () => screen("/my-licenses", "/my-licenses", <MyLicenses />);

  it("LI1 each license: title, validity, kind, number, issuer and dates", async () => {
    mine();
    open();
    const card = await view.findByTestId("license-5");
    expect(within(card).getByText("CCHN khám chữa bệnh")).toBeInTheDocument();
    expect(within(card).getByText("Còn hiệu lực")).toBeInTheDocument();
    expect(within(card).getByText("Chứng chỉ hành nghề · Số 001/HN · Sở Y tế Hà Nội")).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Tải bản scan" })).toBeInTheDocument();
  });

  it("LI2 boundary: none yet says so", async () => {
    api({ "GET /my_licenses": { status: 200, body: [] } });
    open();
    expect(await view.findByText("Bạn chưa thêm chứng chỉ nào.")).toBeInTheDocument();
  });

  it("LI3 adding one with a required field empty says what is missing; nothing is sent", async () => {
    mine();
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("button", { name: "Thêm chứng chỉ" }));
    await user.type(view.getByLabelText(/Tên chứng chỉ/), "CCHN");
    await user.click(within(view.getByTestId("license-form")).getByRole("button", { name: "Lưu" }));
    expect(await view.findByRole("alert")).toHaveTextContent("Vui lòng nhập đầy đủ tên chứng chỉ, số hiệu, nơi cấp và ngày cấp.");
    expect(sent("POST", "/my_licenses")).toHaveLength(0);
  });

  it("LI4 a complete one is sent with no expiry as null, and the list is read again", async () => {
    mine({ "POST /my_licenses": { status: 200, body: { ...cchn, id: 7 } } });
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("button", { name: "Thêm chứng chỉ" }));
    await user.type(view.getByLabelText(/Tên chứng chỉ/), "CCHN");
    await user.type(view.getByLabelText(/Số hiệu/), "002/HN");
    await user.type(view.getByLabelText(/Nơi cấp/), "Sở Y tế");
    fireEvent.change(view.getByLabelText(/Ngày cấp/), { target: { value: "2021-02-03" } });
    await user.click(within(view.getByTestId("license-form")).getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(sent("POST", "/my_licenses")).toHaveLength(1));
    expect(sent("POST", "/my_licenses")[0].body).toEqual({
      kind: "LICENSE", title: "CCHN", licenseNumber: "002/HN", issuer: "Sở Y tế", issuedOn: "2021-02-03", expiresOn: null,
    });
    await waitFor(() => expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({ type: "success", message: "Đã lưu chứng chỉ" })));
  });

  it("LI5 an issue date in the future refused by the API is said in Vietnamese under the form", async () => {
    mine({ "PUT /my_licenses/5": { status: 422, body: { status: 422, message: "It cannot be issued in the future" } } });
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("button", { name: "Sửa" }));
    expect(view.getByLabelText(/Tên chứng chỉ/)).toHaveValue("CCHN khám chữa bệnh");
    await user.click(within(view.getByTestId("license-form")).getByRole("button", { name: "Lưu" }));
    expect(await view.findByRole("alert")).toHaveTextContent("Ngày cấp không được ở tương lai.");
  });

  it("LI6 deleting asks first, then removes it", async () => {
    mine({ "DELETE /my_licenses/5": { status: 200, body: {} } });
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("button", { name: "Xoá" }));
    expect(await view.findByText("Xoá CCHN khám chữa bệnh?")).toBeInTheDocument();
    await user.click(within(view.getByRole("alertdialog")).getByRole("button", { name: "Xoá" }));
    await waitFor(() => expect(sent("DELETE", "/my_licenses/5")).toHaveLength(1));
  });

  it("LI7 boundary: a scan over 10 MB is refused before upload; one within is posted", async () => {
    mine({ "POST /my_licenses/5/file": { status: 200, body: cchn } });
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("button", { name: "Tải bản scan" }));
    const input = view.getByTestId("license-file") as HTMLInputElement;
    const big = new File(["x"], "big.pdf", { type: "application/pdf" });
    Object.defineProperty(big, "size", { value: 10 * 1024 * 1024 + 1 });
    await user.upload(input, big);
    await waitFor(() => expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({ message: "File tối đa 10 MB." })));
    expect(sent("POST", "/my_licenses/5/file")).toHaveLength(0);
    await user.upload(input, new File(["%PDF"], "cchn.pdf", { type: "application/pdf" }));
    await waitFor(() => expect(sent("POST", "/my_licenses/5/file")).toHaveLength(1));
  });
});

describe("ClinicLicenses (/licenses) — the clinic's licenses", () => {
  const all = (body: unknown = [cchn, cme]) => api({ "GET /licenses": { status: 200, body } });

  it("CL1 each license with its holder, expiry, validity and whether there is a scan", async () => {
    all();
    screen("/licenses", "/licenses", <ClinicLicenses />);
    expect(await view.findByText("BS. Nguyễn An")).toBeInTheDocument();
    expect(view.getByText("Sắp hết hạn")).toBeInTheDocument();
    expect(view.getByText("Đã tải lên")).toBeInTheDocument();
    expect(view.getByText("Chưa có")).toBeInTheDocument();
  });

  it("CL2 the search ignores accents and matches holder, title, number or issuer", async () => {
    all();
    const user = userEvent.setup();
    screen("/licenses", "/licenses", <ClinicLicenses />);
    await view.findByText("BS. Nguyễn An");
    await user.type(view.getByLabelText("Tìm chứng chỉ"), "tran binh");
    expect(view.queryByText("BS. Nguyễn An")).toBeNull();
    expect(view.getByText("BS. Trần Bình")).toBeInTheDocument();
    await user.clear(view.getByLabelText("Tìm chứng chỉ"));
    await user.type(view.getByLabelText("Tìm chứng chỉ"), "không có");
    expect(view.getByText("Không có chứng chỉ phù hợp.")).toBeInTheDocument();
  });

  it("CL3 the eye opens a license's detail; a list that could not load says so", async () => {
    all();
    const user = userEvent.setup();
    const { unmount } = screen("/licenses", "/licenses", <ClinicLicenses />);
    await user.click(await view.findByRole("button", { name: "Xem chi tiết chứng chỉ 001/HN" }));
    await waitFor(() => expect(view.getByTestId("location").textContent).toBe("/licenses/show/5"));
    unmount();
    api({ "GET /licenses": { status: 500, body: { message: "down" } } });
    screen("/licenses", "/licenses", <ClinicLicenses />);
    expect(await view.findByText(/Không tải được danh sách chứng chỉ/)).toBeInTheDocument();
  });

  it("CL4 the detail: holder, kind, number, dates and scan; an unknown id says it is not found", async () => {
    all();
    const { unmount } = screen("/licenses/show/6", "/licenses/show/:id", <ClinicLicenseShow />);
    expect(await view.findByText("Chứng nhận CME")).toBeInTheDocument();
    expect(view.getByText("BS. Trần Bình")).toBeInTheDocument();
    expect(view.getByText("cme.pdf")).toBeInTheDocument();
    expect(view.getByRole("button", { name: "Tải bản scan" })).toBeInTheDocument();
    unmount();
    all();
    screen("/licenses/show/99", "/licenses/show/:id", <ClinicLicenseShow />);
    expect(await view.findByText("Không tìm thấy chứng chỉ hoặc bạn không có quyền xem chứng chỉ này.")).toBeInTheDocument();
  });
});
