/** FE-04 / FE-10 patient portal: MyProfileList and the profile form (own profile and relatives). Report-5.1, sheet FE_ClinicScreens2. */
import { fireEvent, screen as view, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { MyProfileCreate, MyProfileEdit, MyProfileList } from "@/features/clinic/my-profiles";
import { api, notify, screen, sent } from "./harness";

const me = {
  id: 1, customerCode: "KH001", self: true, fullName: "Trần Thị Bích", phone: "+84912345678", dateOfBirth: "1990-05-01",
  gender: "female", relationship: null, nationalId: "001190000001", nationalIdType: "cccd", nationalIdIssuedOn: "2021-01-01",
  ethnicity: "Kinh", nationality: "Việt Nam", occupation: "Kế toán", province: "Hà Nội", ward: "Phường Láng",
  address: "12 Lê Lợi", status: "patient", complete: true,
};
const na = { ...me, id: 5, self: false, fullName: "Bé Na", relationship: "child", dateOfBirth: null, gender: null, complete: false,
  nationalId: null, nationalIdIssuedOn: null };
const an = { ...na, id: 6, fullName: "Trần Văn An", relationship: "parent" };

beforeEach(() => notify.open.mockClear());

describe("MyProfileList (/my-profiles) — My Profiles", () => {
  it("MP1 own profile and relatives: kind, phone as written locally, and a reminder on an incomplete one", async () => {
    api({ "GET /my_profiles*": { status: 200, body: [me, na] } });
    screen("/my-profiles", "/my-profiles", <MyProfileList />);
    expect(await view.findByText("Trần Thị Bích")).toBeInTheDocument();
    expect(view.getByText("Bản thân")).toBeInTheDocument();
    expect(view.getByText("Con")).toBeInTheDocument();
    expect(view.getByText(/Chưa có ngày sinh, giới tính/)).toBeInTheDocument();
    expect(view.getByText(/Cần bổ sung ngày sinh, giới tính và số CCCD/)).toBeInTheDocument();
    expect(view.getByRole("link", { name: /Thêm người thân/ })).toHaveAttribute("href", "/my-profiles/create");
    expect(view.getByRole("link", { name: /Bé Na/ })).toHaveAttribute("href", "/my-profiles/edit/5");
  });

  it("MP2 boundary: with two relatives already, adding is off and says why", async () => {
    api({ "GET /my_profiles*": { status: 200, body: [me, na, an] } });
    const user = userEvent.setup();
    screen("/my-profiles", "/my-profiles", <MyProfileList />);
    const add = await view.findByRole("button", { name: /Thêm người thân/ });
    expect(add).toHaveAttribute("aria-disabled");
    expect(view.queryByRole("link", { name: /Thêm người thân/ })).toBeNull();
    await user.click(add);
    expect((await view.findAllByText("Chỉ được tối đa 2 hồ sơ của người thân.")).length).toBeGreaterThan(0);
  });

  it("MP3 a list that could not load says so with a retry", async () => {
    api({ "GET /my_profiles*": { status: 500, body: { message: "down" } } });
    screen("/my-profiles", "/my-profiles", <MyProfileList />);
    expect(await view.findByText("Không thể tải danh sách hồ sơ")).toBeInTheDocument();
    expect(view.getByRole("button", { name: "Thử lại" })).toBeInTheDocument();
  });
});

describe("Profile form (/my-profiles/edit/:id, /my-profiles/create) — Update Own Profile / Add Relative", () => {
  const edit = (id: number) => screen(`/my-profiles/edit/${id}`, "/my-profiles/edit/:id", <MyProfileEdit />);
  const save = () => [...sent("PATCH", "/my_profiles"), ...sent("PUT", "/my_profiles"), ...sent("POST", "/my_profiles")];

  it("PF1 own profile: name and phone are the account's and are not sent; the rest is sent trimmed", async () => {
    api({ "GET /my_profiles/1": { status: 200, body: me }, "PATCH /my_profiles/1": { status: 200, body: me }, "PUT /my_profiles/1": { status: 200, body: me } });
    const user = userEvent.setup();
    edit(1);
    const address = await view.findByPlaceholderText("Số nhà, đường, thôn / xóm");
    await waitFor(() => expect(address).toHaveValue("12 Lê Lợi"));
    await user.clear(address);
    await user.type(address, "  34 Trần Phú  ");
    await user.click(view.getByRole("button", { name: "Lưu hồ sơ" }));
    await waitFor(() => expect(save()).toHaveLength(1));
    const body = save()[0].body as Record<string, unknown>;
    expect(body).not.toHaveProperty("fullName");
    expect(body).not.toHaveProperty("phone");
    expect(body).toMatchObject({ address: "34 Trần Phú", nationalId: "001190000001", nationalIdType: "cccd", gender: "female" });
    await waitFor(() => expect(view.getByTestId("location").textContent).toBe("/my-profiles"));
  });

  it("PF2 the CCCD must be 12 digits: empty and 11 digits are refused under the field; nothing is sent", async () => {
    api({ "GET /my_profiles/1": { status: 200, body: me } });
    const user = userEvent.setup();
    edit(1);
    const id = await view.findByPlaceholderText("12 chữ số");
    await waitFor(() => expect(id).toHaveValue("001190000001"));
    await user.clear(id);
    await user.click(view.getByRole("button", { name: "Lưu hồ sơ" }));
    expect(await view.findByText("Vui lòng nhập số CCCD.")).toBeInTheDocument();
    await user.type(id, "00119000000");
    await user.click(view.getByRole("button", { name: "Lưu hồ sơ" }));
    expect(await view.findByText("Vui lòng nhập thông tin phù hợp với loại giấy tờ đã chọn.")).toBeInTheDocument();
    expect(save()).toHaveLength(0);
  });

  it("PF3 an issue date before the date of birth is refused", async () => {
    api({ "GET /my_profiles/1": { status: 200, body: me } });
    const user = userEvent.setup();
    edit(1);
    const issued = await view.findByLabelText("Ngày cấp");
    await waitFor(() => expect(issued).toHaveValue("2021-01-01"));
    fireEvent.change(issued, { target: { value: "1989-01-01" } });
    await user.click(view.getByRole("button", { name: "Lưu hồ sơ" }));
    expect(await view.findByText("Ngày cấp phải sau hoặc bằng ngày sinh.")).toBeInTheDocument();
    expect(save()).toHaveLength(0);
  });

  it("PF4 a 422 from the API is said under its field in Vietnamese, not in a toast", async () => {
    const refused = { status: 422, body: { status: 422, message: "Validation failed", errors: { nationalId: "This identity number is already on another profile" } } };
    api({ "GET /my_profiles/1": { status: 200, body: me }, "PATCH /my_profiles/1": refused, "PUT /my_profiles/1": refused });
    const user = userEvent.setup();
    edit(1);
    await waitFor(() => expect(view.getByPlaceholderText("12 chữ số")).toHaveValue("001190000001"));
    await user.click(view.getByRole("button", { name: "Lưu hồ sơ" }));
    expect(await view.findByText("Số giấy tờ này đã được đăng ký cho một hồ sơ khác trong hệ thống.")).toBeInTheDocument();
    expect(notify.open).not.toHaveBeenCalledWith(expect.objectContaining({ type: "error" }));
  });

  it("PF5 a relative's profile can be deleted after asking; the list opens again", async () => {
    api({ "GET /my_profiles/5": { status: 200, body: na }, "DELETE /my_profiles/5": { status: 200, body: {} } });
    const user = userEvent.setup();
    edit(5);
    await user.click(await view.findByRole("button", { name: /Xóa hồ sơ/ }));
    expect(await view.findByText("Xóa hồ sơ của Bé Na?")).toBeInTheDocument();
    const confirm = view.getAllByRole("button", { name: "Xóa hồ sơ" }).at(-1)!;
    await user.click(confirm);
    await waitFor(() => expect(sent("DELETE", "/my_profiles/5")).toHaveLength(1));
    await waitFor(() => expect(view.getByTestId("location").textContent).toBe("/my-profiles"));
  });

  it("PF6 a refused delete (relative wearing a device) says why in Vietnamese", async () => {
    api({
      "GET /my_profiles/5": { status: 200, body: na },
      "DELETE /my_profiles/5": { status: 409, body: { status: 409, message: "This relative is still wearing a clinic device" } },
    });
    const user = userEvent.setup();
    edit(5);
    await user.click(await view.findByRole("button", { name: /Xóa hồ sơ/ }));
    await user.click(view.getAllByRole("button", { name: "Xóa hồ sơ" }).at(-1)!);
    await waitFor(() => expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({
      type: "error", message: "Người thân đang đeo thiết bị của phòng khám, vui lòng trả thiết bị trước khi xóa hồ sơ.",
    })));
  });

  it("PF7 adding a relative: a name with digits and a wrong phone are refused; nothing is sent", async () => {
    api({});
    const user = userEvent.setup();
    screen("/my-profiles/create", "/my-profiles/create", <MyProfileCreate />);
    await user.type(await view.findByPlaceholderText("Như trên giấy tờ"), "Na123");
    await user.type(view.getByPlaceholderText("0901234567"), "12345");
    await user.click(view.getByRole("button", { name: "Lưu hồ sơ" }));
    expect(await view.findByText("Họ và tên chỉ được chứa chữ cái tiếng Việt và khoảng trắng.")).toBeInTheDocument();
    expect(view.getByText("Vui lòng nhập số điện thoại phù hợp.")).toBeInTheDocument();
    expect(view.getByText("Vui lòng chọn quan hệ")).toBeInTheDocument();
    expect(view.getByText("Vui lòng chọn giới tính")).toBeInTheDocument();
    expect(save()).toHaveLength(0);
  });
});
