import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { calls, clinicA, clinicB, mockApi, refine, refineMock, renderAt } from "./helpers";

vi.mock("@refinedev/core", () => refineMock());
const { PublicClinics, PublicClinicShow } = await import("@/features/public/clinics");
const { PublicServices } = await import("@/features/public/services");
const { PublicFirstAid, PublicFirstAidShow } = await import("@/features/public/first-aid");
const { EmergencyContacts } = await import("@/features/public/emergency");

beforeEach(() => {
  refine.authenticated = false;
});

describe("PublicClinics (/locations)", () => {
  it("CL1 a card per clinic: address, tel/mailto links, folded opening hours", async () => {
    mockApi({ "/public/clinics": { status: 200, body: [clinicA, clinicB] } });
    renderAt("/locations", "/locations", <PublicClinics />);
    const phone = await screen.findByRole("link", { name: "0900 000 000" });
    expect(phone).toHaveAttribute("href", "tel:+84900000000");
    expect(screen.getByRole("link", { name: "a@vitalcare.vn" })).toHaveAttribute("href", "mailto:a@vitalcare.vn");
    expect(screen.getByText("Thứ 2 – Thứ 7")).toBeInTheDocument();
    expect(screen.getByText("07:30–11:30, 13:30–16:30")).toBeInTheDocument();
  });

  it("CL2 a clinic without hours or contacts says to get in touch", async () => {
    mockApi({ "/public/clinics": { status: 200, body: [clinicB] } });
    renderAt("/locations", "/locations", <PublicClinics />);
    expect(await screen.findByText("Liên hệ cơ sở để biết giờ làm việc.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^0/ })).toBeNull();
  });

  it("CL3 no clinics", async () => {
    mockApi({ "/public/clinics": { status: 200, body: [] } });
    renderAt("/locations", "/locations", <PublicClinics />);
    expect(await screen.findByText("Hiện chưa có cơ sở nào nhận khám.")).toBeInTheDocument();
  });

  it("CL4 server error shows the message in red", async () => {
    mockApi({ "/public/clinics": { status: 500, body: {} } });
    renderAt("/locations", "/locations", <PublicClinics />);
    const error = await screen.findByText("Không tải được dữ liệu. Vui lòng thử lại sau.");
    expect(error).toHaveClass("text-destructive");
  });

  it("CL5 'Đăng ký khám' goes to /register for a guest, to the portal when signed in", async () => {
    mockApi({ "/public/clinics": { status: 200, body: [clinicA] } });
    const first = renderAt("/locations", "/locations", <PublicClinics />);
    expect(await screen.findByRole("link", { name: "Đăng ký khám" })).toHaveAttribute("href", "/register");
    first.unmount();
    refine.authenticated = true;
    renderAt("/locations", "/locations", <PublicClinics />);
    expect(await screen.findByRole("link", { name: "Đăng ký khám" })).toHaveAttribute("href", "/my-appointments/create");
  });
});

describe("PublicClinicShow (/locations/:id)", () => {
  const ID = "5b1f8c2e-6a3d-4f7e-9c41-2d8e0a7b3c19";
  it("CL6 doctors with title · specialty and their weekdays", async () => {
    mockApi({
      [`/public/clinics/${ID}`]: {
        status: 200,
        body: { ...clinicA, id: ID, doctors: [{ id: 1, fullName: "Trần Thị Lan", specialty: "Nội khoa", professionalTitle: "BSCKI", workingDays: [1, 3] }] },
      },
    });
    renderAt(`/locations/${ID}`, "/locations/:id", <PublicClinicShow />);
    expect(await screen.findByRole("heading", { name: "VitalCare Test A" })).toBeInTheDocument();
    expect(screen.getByText("Bác sĩ (1)")).toBeInTheDocument();
    expect(screen.getByText("BSCKI · Nội khoa")).toBeInTheDocument();
    expect(screen.getByText("Thứ 2")).toBeInTheDocument();
    expect(screen.getByText("Thứ 4")).toBeInTheDocument();
  });

  it("CL7 no doctors / a doctor with no schedule", async () => {
    mockApi({
      [`/public/clinics/${ID}`]: {
        status: 200,
        body: { ...clinicA, id: ID, doctors: [{ id: 2, fullName: "Lê Văn Minh", specialty: null, professionalTitle: null, workingDays: [] }] },
      },
    });
    renderAt(`/locations/${ID}`, "/locations/:id", <PublicClinicShow />);
    expect(await screen.findByText("Chưa có lịch khám")).toBeInTheDocument();
    expect(screen.getByText("Bác sĩ")).toBeInTheDocument();
  });

  it("CL8 unknown or closed clinic: not-found message, asked once; a malformed id is not asked at all", async () => {
    mockApi({});
    const { unmount } = renderAt(`/locations/${ID}`, "/locations/:id", <PublicClinicShow />);
    expect(await screen.findByText("Không tìm thấy cơ sở. Vui lòng thử lại sau.")).toBeInTheDocument();
    expect(calls.filter((c) => c.url.endsWith(`/public/clinics/${ID}`))).toHaveLength(1);
    unmount();
    mockApi({});
    renderAt("/locations/zzz", "/locations/:id", <PublicClinicShow />);
    expect(await screen.findByText("Không tìm thấy cơ sở. Vui lòng thử lại sau.")).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it("CL9 'Chat với phòng khám' opens the chat on this clinic", async () => {
    mockApi({ [`/public/clinics/${ID}`]: { status: 200, body: { ...clinicA, id: ID, doctors: [] } } });
    const opened = vi.fn();
    window.addEventListener("vitalcare:open-chat", (e) => opened((e as CustomEvent).detail));
    renderAt(`/locations/${ID}`, "/locations/:id", <PublicClinicShow />);
    await userEvent.click(await screen.findByRole("button", { name: "Chat với phòng khám" }));
    expect(opened).toHaveBeenCalledWith({ clinicId: ID });
  });
});

describe("PublicServices (/services)", () => {
  const svc = (id: number, name: string, category: string, price: number, turnaroundMinutes: number | null, description: string | null = null) =>
    ({ id, name, category, price, turnaroundMinutes, description });

  it("SV1 grouped by kind in fixed order, prices formatted", async () => {
    mockApi({
      "/public/services": {
        status: 200,
        body: [svc(1, "Xét nghiệm máu", "lab", 90000, 90), svc(2, "Khám nội", "consultation", 150000, 15, "Khám tổng quát")],
      },
    });
    renderAt("/services", "/services", <PublicServices />);
    await screen.findByText("Khám nội");
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings.indexOf("Khám bệnh")).toBeLessThan(headings.indexOf("Xét nghiệm"));
    expect(screen.getByText("150.000 ₫")).toBeInTheDocument();
    expect(screen.getByText("90.000 ₫")).toBeInTheDocument();
    expect(screen.getByText("Khám tổng quát")).toBeInTheDocument();
  });

  it("SV2 turnaround shown for tests, not for consultations", async () => {
    mockApi({
      "/public/services": { status: 200, body: [svc(1, "Xét nghiệm máu", "lab", 90000, 90), svc(2, "Khám nội", "consultation", 150000, 15)] },
    });
    renderAt("/services", "/services", <PublicServices />);
    expect(await screen.findByText(/Có kết quả sau khoảng\s+1 giờ 30 phút/)).toBeInTheDocument();
    expect(screen.queryByText(/15 phút/)).toBeNull();
  });

  it("SV3 a kind with no services is not shown", async () => {
    mockApi({ "/public/services": { status: 200, body: [svc(2, "Khám nội", "consultation", 150000, null)] } });
    renderAt("/services", "/services", <PublicServices />);
    await screen.findByText("Khám nội");
    expect(screen.queryByRole("heading", { name: "Chẩn đoán hình ảnh" })).toBeNull();
  });

  it("SV4 empty list", async () => {
    mockApi({ "/public/services": { status: 200, body: [] } });
    renderAt("/services", "/services", <PublicServices />);
    expect(await screen.findByText("Danh mục dịch vụ đang được cập nhật.")).toBeInTheDocument();
  });

  it("SV5 offline", async () => {
    mockApi({ "/public/services": { status: 0, body: null } });
    renderAt("/services", "/services", <PublicServices />);
    expect(await screen.findByText("Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.")).toBeInTheDocument();
  });
});

describe("PublicFirstAid (/first-aid)", () => {
  const article = (id: number, title: string, category: string) =>
    ({ id, title, category, summary: `Tóm tắt ${title}`, body: "", emergencyWarning: null, publishedAt: "2026-10-30T01:00:00Z" });
  const list = [article(1, "Sốt cao ở trẻ", "fever"), article(2, "Bỏng nhẹ", "wound")];

  it("FA1 lists articles linking to their page, with category labels", async () => {
    mockApi({ "/public/first_aid?": { status: 200, body: list } });
    renderAt("/first-aid", "/first-aid", <PublicFirstAid />);
    const link = await screen.findByRole("link", { name: /Sốt cao ở trẻ/ });
    expect(link).toHaveAttribute("href", "/first-aid/1");
    expect(within(link).getByText("Sốt")).toBeInTheDocument();
  });

  it("FA2 picking a category puts it in the URL and asks the API for it", async () => {
    mockApi({ "/public/first_aid?": { status: 200, body: list }, "/public/first_aid?category=wound": { status: 200, body: [list[1]] } });
    renderAt("/first-aid", "/first-aid", <PublicFirstAid />);
    await screen.findByText("Sốt cao ở trẻ");
    await userEvent.click(screen.getByRole("button", { name: "Vết thương" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/first-aid?category=wound");
    expect(screen.getByRole("button", { name: "Vết thương" })).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(screen.queryByText("Sốt cao ở trẻ")).toBeNull());
  });

  it("FA3 'Tất cả' removes the category", async () => {
    mockApi({ "/public/first_aid?": { status: 200, body: list }, "/public/first_aid?category=wound": { status: 200, body: [list[1]] } });
    renderAt("/first-aid?category=wound", "/first-aid", <PublicFirstAid />);
    await screen.findByText("Bỏng nhẹ");
    await userEvent.click(screen.getByRole("button", { name: "Tất cả" }));
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/first-aid$/);
  });

  it("FA4 typing then Enter searches by q", async () => {
    mockApi({ "/public/first_aid?": { status: 200, body: list }, "/public/first_aid?q=b%E1%BB%8Fng": { status: 200, body: [list[1]] } });
    renderAt("/first-aid", "/first-aid", <PublicFirstAid />);
    await screen.findByText("Sốt cao ở trẻ");
    await userEvent.type(screen.getByLabelText("Tìm hướng dẫn sơ cứu"), "bỏng{Enter}");
    await waitFor(() => expect(screen.queryByText("Sốt cao ở trẻ")).toBeNull());
    expect(calls.some((c) => c.url.endsWith("first_aid?q=b%E1%BB%8Fng"))).toBe(true);
  });

  it("FA5 nothing matches", async () => {
    mockApi({ "/public/first_aid?": { status: 200, body: [] } });
    renderAt("/first-aid", "/first-aid", <PublicFirstAid />);
    expect(await screen.findByText("Không có hướng dẫn nào khớp. Thử từ khoá khác.")).toBeInTheDocument();
  });

  it("FA6 the emergency button is always there", async () => {
    mockApi({ "/public/first_aid?": { status: 500, body: {} } });
    renderAt("/first-aid", "/first-aid", <PublicFirstAid />);
    expect(await screen.findByText("Không tải được dữ liệu. Vui lòng thử lại sau.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Liên hệ khẩn cấp/ })).toBeInTheDocument();
  });
});

describe("PublicFirstAidShow (/first-aid/:id)", () => {
  it("FD1 title, category, disclaimer, warning and the guidance body", async () => {
    mockApi({
      "/public/first_aid/5": {
        status: 200,
        body: { id: 5, title: "Bỏng nhẹ", category: "wound", summary: "", body: "## Làm ngay\n1. Xả nước mát\n2. Che vết bỏng\n- Không bôi kem đánh răng", emergencyWarning: "Gọi 115 nếu bỏng rộng", publishedAt: "2026-10-30T01:00:00Z" },
      },
    });
    renderAt("/first-aid/5", "/first-aid/:id", <PublicFirstAidShow />);
    expect(await screen.findByRole("heading", { level: 1, name: "Bỏng nhẹ" })).toBeInTheDocument();
    expect(screen.getByText("Vết thương")).toBeInTheDocument();
    expect(screen.getByText("Hướng dẫn tham khảo, không dùng để chẩn đoán hoặc thay thế chăm sóc y tế.")).toBeInTheDocument();
    expect(screen.getByText("Gọi 115 nếu bỏng rộng")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Làm ngay" })).toBeInTheDocument();
    const steps = screen.getByText("Xả nước mát").closest("ol")!;
    expect(within(steps).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Không bôi kem đánh răng")).toBeInTheDocument();
  });

  it("FD2 no warning, no warning box", async () => {
    mockApi({ "/public/first_aid/6": { status: 200, body: { id: 6, title: "Ngất", category: "fainting", summary: "", body: "Đặt nằm", emergencyWarning: null, publishedAt: null } } });
    renderAt("/first-aid/6", "/first-aid/:id", <PublicFirstAidShow />);
    await screen.findByRole("heading", { level: 1, name: "Ngất" });
    expect(screen.queryByText(/Gọi 115 nếu/)).toBeNull();
  });

  it("FD3 HTML in the body is shown as text, not run", async () => {
    mockApi({ "/public/first_aid/7": { status: 200, body: { id: 7, title: "X", category: "general", summary: "", body: "<img src=x onerror=alert(1)>", emergencyWarning: null, publishedAt: null } } });
    const { container } = renderAt("/first-aid/7", "/first-aid/:id", <PublicFirstAidShow />);
    expect(await screen.findByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("FD4 unpublished or unknown article: not-found message, back link kept", async () => {
    mockApi({});
    renderAt("/first-aid/99", "/first-aid/:id", <PublicFirstAidShow />);
    expect(await screen.findByText("Không tìm thấy hướng dẫn. Vui lòng thử lại sau.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Tất cả hướng dẫn/ })).toHaveAttribute("href", "/first-aid");
  });
});

describe("EmergencyContacts", () => {
  it("EM1 115, 114, 113 as tel: links", async () => {
    mockApi({ "/public/clinics": { status: 200, body: [] } });
    renderAt("/", "/", <EmergencyContacts />);
    for (const n of ["115", "114", "113"]) {
      const link = screen.getAllByRole("link").find((a) => a.getAttribute("href") === `tel:${n}`);
      expect(link).toBeDefined();
    }
  });

  it("EM2 each clinic with a phone as a tel: link; those without are left out", async () => {
    mockApi({ "/public/clinics": { status: 200, body: [clinicA, clinicB] } });
    renderAt("/", "/", <EmergencyContacts />);
    const line = await screen.findByRole("link", { name: /VitalCare Test A/ });
    expect(line).toHaveAttribute("href", "tel:+84900000000");
    expect(within(line).getByText("0900 000 000")).toBeInTheDocument();
    expect(screen.queryByText("VitalCare Test B")).toBeNull();
  });

  it("EM3 no clinic phones: no clinic section, national numbers still shown", async () => {
    mockApi({ "/public/clinics": { status: 200, body: [clinicB] } });
    renderAt("/", "/", <EmergencyContacts />);
    await waitFor(() => expect(calls.length).toBe(1));
    expect(screen.queryByText("Đường dây của phòng khám (giờ làm việc)")).toBeNull();
    expect(screen.getByText(/VitalCare không phải dịch vụ cấp cứu/)).toBeInTheDocument();
  });

  it("EM4 clinics cannot be loaded: national numbers still shown", async () => {
    mockApi({ "/public/clinics": { status: 0, body: null } });
    renderAt("/", "/", <EmergencyContacts />);
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(screen.getAllByRole("link").filter((a) => /^tel:11[345]$/.test(a.getAttribute("href") ?? ""))).toHaveLength(3);
  });
});
