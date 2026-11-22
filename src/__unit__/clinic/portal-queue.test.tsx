/** FE-10 Live Queue / FE-06 My Results (patient portal): QueueBanner and PortalResults. Report-5.1, sheet FE_ClinicScreens2. */
import { screen as view, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { clinicToday } from "@/features/clinic/appointments/clinic-day";
import { PortalResults } from "@/features/clinic/portal";
import { QueueBanner } from "@/features/clinic/portal/live-queue";
import { api, screen, sent } from "./harness";

vi.mock("@/shared/api/live", () => ({ subscribe: () => () => undefined }));

const visit = (over: Record<string, unknown> = {}) => ({
  id: 10, appointmentDate: clinicToday(), status: "ready_for_examination", queueNumber: 3,
  customer: { id: 1, fullName: "Trần Thị Bích" }, clinic: { id: "a", name: "VitalCare Hà Nội" },
  doctor: { id: 9, fullName: "BS. Nguyễn An" }, examRoom: { id: 1, code: "P101", name: null }, ...over,
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const banner = (appointment: Record<string, unknown>) => screen("/my-appointments/10", "/my-appointments/:id", <QueueBanner appointment={appointment as any} />);

describe("QueueBanner — Live Queue on the patient's visit", () => {
  it("LQ1 waiting today: how many are ahead", async () => {
    api({ "GET /my_appointments/10/queue": { status: 200, body: { ahead: 2, skipped: false } } });
    banner(visit());
    expect(await view.findByText("Còn 2 người trước bạn")).toBeInTheDocument();
    expect(view.getByText("Tự cập nhật, không cần tải lại trang.")).toBeInTheDocument();
  });

  it("LQ2 boundary: nobody ahead says you are next; called and absent says you will be called again", async () => {
    api({ "GET /my_appointments/10/queue": { status: 200, body: { ahead: 0, skipped: false } } });
    const { unmount } = banner(visit());
    expect(await view.findByText("Bạn là người tiếp theo")).toBeInTheDocument();
    unmount();
    api({ "GET /my_appointments/10/queue": { status: 200, body: { ahead: 1, skipped: true } } });
    banner(visit());
    expect(await view.findByText("Bạn đã được gọi nhưng chưa có mặt")).toBeInTheDocument();
    expect(view.getByText(/được gọi lại sau ít phút/)).toBeInTheDocument();
  });

  it("LQ3 called in: your turn, into the room, without asking the queue", async () => {
    api({});
    banner(visit({ status: "in_exam" }));
    expect(await view.findByText("Đến lượt bạn")).toBeInTheDocument();
    expect(view.getByText("Mời vào phòng P101.")).toBeInTheDocument();
    expect(sent("GET", "/my_appointments/10/queue")).toHaveLength(0);
  });

  it("LQ4 checked in but not paid: told to pay before joining the line", async () => {
    api({ "GET /my_appointments/10/queue": { status: 200, body: { ahead: null, skipped: false, awaitingPayment: true } } });
    banner(visit({ status: "checked_in" }));
    expect(await view.findByText("Chưa thanh toán phí khám")).toBeInTheDocument();
  });

  it("LQ5 sent out for services: each task, done ones struck through, and a referral named", async () => {
    api({ "GET /my_appointments/10/queue": { status: 200, body: { ahead: null, skipped: false, tasks: [
      { kind: "service", name: "X-quang ngực", done: true }, { kind: "referral", name: "Tim mạch", done: false },
    ] } } });
    banner(visit({ status: "awaiting_results" }));
    expect(await view.findByText("Bác sĩ chỉ định bạn làm thêm")).toBeInTheDocument();
    expect(await view.findByText("X-quang ngực")).toHaveClass("line-through");
    expect(view.getByText("Khám thêm Tim mạch")).toBeInTheDocument();
  });

  it("LQ6 a visit on another day, or already done, shows nothing", async () => {
    api({});
    const { container } = banner(visit({ appointmentDate: "2020-01-01" }));
    await waitFor(() => expect(container.querySelector("[role=status]")).toBeNull());
  });
});

describe("PortalResults (/my-results) — My Visit Results", () => {
  const completed = [
    visit({ id: 10, status: "completed" }),
    visit({ id: 11, status: "completed", customer: { id: 5, fullName: "Bé Na" } }),
  ];

  it("PR1 asks only completed visits and lists each with a link to its result", async () => {
    api({ "GET /my_appointments*": { status: 200, body: completed } });
    screen("/my-results", "/my-results", <PortalResults />);
    expect(await view.findByText("Bé Na", { selector: "span" })).toBeInTheDocument();
    expect(sent("GET", "/my_appointments")[0].path).toMatch(/status=completed/);
    expect(view.getAllByRole("link")[0]).toHaveAttribute("href", "/my-results/10");
  });

  it("PR2 with several people the list can be narrowed to one", async () => {
    api({ "GET /my_appointments*": { status: 200, body: completed } });
    const user = userEvent.setup();
    screen("/my-results", "/my-results", <PortalResults />);
    await user.click(await view.findByRole("button", { name: "Bé Na" }));
    expect(view.getAllByRole("link")).toHaveLength(1);
    expect(view.getByRole("link")).toHaveAttribute("href", "/my-results/11");
  });

  it("PR3 boundary: none yet, and a list that could not load, each say so", async () => {
    api({ "GET /my_appointments*": { status: 200, body: [] } });
    const { unmount } = screen("/my-results", "/my-results", <PortalResults />);
    expect(await view.findByText("Chưa có kết quả khám nào")).toBeInTheDocument();
    unmount();
    api({ "GET /my_appointments*": { status: 500, body: { message: "down" } } });
    screen("/my-results", "/my-results", <PortalResults />);
    expect(await view.findByText("Không tải được danh sách kết quả")).toBeInTheDocument();
  });
});
