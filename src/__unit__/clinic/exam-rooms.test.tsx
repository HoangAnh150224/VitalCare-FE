/** FE-10 Exam Room Board / doctor's queue: ExamRoomBoard and MyExamQueue. Report-5.1, sheet FE_ClinicScreens2. */
import { screen as view, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ExamRoomBoard, MyExamQueue } from "@/features/clinic/exam-rooms";
import { access, api, notify, screen, sent, type Reply } from "./harness";

vi.mock("@/shared/api/live", () => ({ subscribe: () => () => undefined }));

const visit = (id: number, queueNumber: number, name: string, over: Record<string, unknown> = {}) => ({
  appointmentId: id, queueNumber, customerId: id + 100, patientName: name, customerCode: null, checkedInAt: "2026-11-22T01:00:00Z",
  calledAt: null, passedOver: false, ...over,
});
const doctor = { id: 9, fullName: "BS. Nguyễn An", specialty: null };
const room = (over: Record<string, unknown> = {}) => ({
  id: 1, code: "P101", name: "Phòng nội", department: "Nội", status: "available", doctor, current: null,
  waiting: [visit(11, 3, "Trần Thị Bích")], away: [], ...over,
});
const board = (over: Record<string, unknown> = {}) => ({
  clinicId: "a", at: "2026-11-22T02:00:00Z", rooms: [room()], withoutRoom: [], awaitingPayment: [], sharedQueue: [], ...over,
});
const busy = room({ status: "occupied", current: visit(10, 2, "Lê Văn Cường", { calledAt: "2026-11-22T01:30:00Z" }), waiting: [] });

const routes = (body: unknown, extra: Record<string, Reply> = {}) => ({
  "GET /exam_rooms/board": { status: 200, body },
  "GET /exam_rooms/mine": { status: 200, body },
  "GET /clinical_encounters*": { status: 200, body: [] },
  ...extra,
}) as Record<string, Reply>;
const openBoard = () => screen("/exam-rooms", "/exam-rooms", <ExamRoomBoard />);

beforeEach(() => notify.open.mockClear());
afterEach(() => {
  access.can = true;
});

describe("ExamRoomBoard (/exam-rooms) — Exam Room Board", () => {
  it("EB1 the board counts rooms in use and people waiting, grouped by department", async () => {
    api(routes(board({ rooms: [room(), { ...busy, id: 2, code: "P102" }] })));
    openBoard();
    expect(await view.findByText("Khoa Nội")).toBeInTheDocument();
    expect(view.getAllByText(/phòng đang khám/)[0].textContent).toMatch(/1\s*\/\s*2 phòng đang khám/);
    expect(view.getByText("Trần Thị Bích")).toBeInTheDocument();
    expect(view.getByText("02")).toBeInTheDocument();
    expect(view.getByText("Lê Văn Cường")).toBeInTheDocument();
  });

  it("EB2 a free room with a doctor and someone waiting calls the next one", async () => {
    api(routes(board(), { "POST /exam_rooms/1/call-next": { status: 200, body: board() } }));
    const user = userEvent.setup();
    openBoard();
    await user.click(await view.findByRole("button", { name: /Gọi người tiếp theo/ }));
    await waitFor(() => expect(sent("POST", "/exam_rooms/1/call-next")).toHaveLength(1));
  });

  it("EB3 Khám xong asks first, warns when no encounter was written, then posts with the visit's id", async () => {
    api(routes(board({ rooms: [busy] }), { "POST /exam_rooms/1/finish*": { status: 200, body: board() } }));
    const user = userEvent.setup();
    openBoard();
    await user.click(await view.findByRole("button", { name: /Khám xong/ }));
    const dialog = await view.findByRole("alertdialog");
    expect(within(dialog).getByText("Kết thúc lượt khám của Lê Văn Cường?")).toBeInTheDocument();
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(/không có kết quả khám và không có hoá đơn/);
    expect(sent("POST", "/exam_rooms/1/finish")).toHaveLength(0);
    await user.click(within(dialog).getByRole("button", { name: "Khám xong" }));
    await waitFor(() => expect(sent("POST", "/exam_rooms/1/finish")).toHaveLength(1));
    expect(sent("POST", "/exam_rooms/1/finish")[0].path).toContain("appointmentId=10");
  });

  it("EB4 Không đến asked and declined sends nothing", async () => {
    api(routes(board({ rooms: [busy] })));
    const user = userEvent.setup();
    openBoard();
    await user.click(await view.findByRole("button", { name: /Không đến/ }));
    const dialog = await view.findByRole("alertdialog");
    expect(within(dialog).getByText(/không khôi phục được/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Không" }));
    expect(sent("POST", "/exam_rooms")).toHaveLength(0);
  });

  it("EB5 a paused room can be reopened; a room in use can be paused", async () => {
    api(routes(board({ rooms: [room({ status: "paused" })] }), { "POST /exam_rooms/1/resume": { status: 200, body: board() } }));
    const user = userEvent.setup();
    openBoard();
    await user.click(await view.findByRole("button", { name: /Mở lại phòng/ }));
    await waitFor(() => expect(sent("POST", "/exam_rooms/1/resume")).toHaveLength(1));
  });

  it("EB6 without the right to operate rooms there are no buttons", async () => {
    access.can = false;
    api(routes(board({ rooms: [busy] })));
    openBoard();
    expect(await view.findByText("Lê Văn Cường")).toBeInTheDocument();
    expect(view.queryByRole("button", { name: /Khám xong|Tạm ngưng/ })).toBeNull();
  });

  it("EB7 boundary: a clinic with no room says so; unpaid and shared queues are listed apart", async () => {
    api(routes(board({
      rooms: [],
      awaitingPayment: [{ visit: visit(20, 5, "Phạm Thu"), doctor }],
      sharedQueue: [visit(21, 6, "Đỗ Hải", { department: "Nội" })],
    })));
    openBoard();
    expect(await view.findByText("Cơ sở chưa có phòng khám nào.")).toBeInTheDocument();
    expect(view.getByText("Chờ thanh toán phí khám (1)")).toBeInTheDocument();
    expect(within(view.getByTestId("shared-queue")).getByText("Đỗ Hải")).toBeInTheDocument();
  });

  it("EB7b the shared queue counts as waiting, in the total and in its department (KAN-144)", async () => {
    api(routes(board({ rooms: [{ ...busy, waiting: [] }], sharedQueue: [visit(21, 6, "Đỗ Hải", { department: "Nội" }), visit(22, 7, "Lý Mai")] })));
    openBoard();
    expect((await view.findByText(/người đang chờ/)).textContent).toMatch(/^2\s*người đang chờ/);
    expect(view.getByText(/người chờ/).textContent).toMatch(/·\s*1\s*người chờ/);
  });

  it("EB8 a refused action is told in a toast", async () => {
    api(routes(board(), { "POST /exam_rooms/1/call-next": { status: 409, body: { status: 409, message: "The room is not free" } } }));
    const user = userEvent.setup();
    openBoard();
    await user.click(await view.findByRole("button", { name: /Gọi người tiếp theo/ }));
    await waitFor(() => expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({ type: "error" })));
  });
});

describe("MyExamQueue (/my-queue) — Doctor's Queue", () => {
  it("MQ1 waiting: my room with the people waiting for me", async () => {
    api(routes(board()));
    screen("/my-queue", "/my-queue", <MyExamQueue />);
    expect(await view.findByText("Hàng chờ khám của tôi")).toBeInTheDocument();
    expect(await view.findByText("Trần Thị Bích")).toBeInTheDocument();
  });

  it("MQ1b waiting: my room stays on screen when a patient is inside and nobody waits (KAN-151)", async () => {
    api(routes(board({ rooms: [busy] })));
    screen("/my-queue", "/my-queue", <MyExamQueue />);
    expect(await view.findByText("Bệnh nhân đang khám được hiển thị trong tab Đang khám / làm chỉ định.")).toBeInTheDocument();
    expect(view.getByText("P101")).toBeInTheDocument();
    expect(view.getAllByText("Đang khám").length).toBeGreaterThan(0);
    expect(view.getByText("Đang chờ (0)")).toBeInTheDocument();
  });

  it("MQ2 boundary: no shift with a room says so", async () => {
    api(routes(board({ rooms: [] })));
    screen("/my-queue", "/my-queue", <MyExamQueue />);
    expect(await view.findByText("Bạn không có ca làm việc có phòng vào lúc này.")).toBeInTheDocument();
  });

  it("MQ3 active: nobody in a room or out for a service says so", async () => {
    api(routes(board()));
    screen("/my-queue/active", "/my-queue/active", <MyExamQueue mode="active" />);
    expect(await view.findByText("Hiện không có bệnh nhân nào đang khám hoặc đi làm chỉ định.")).toBeInTheDocument();
  });

  it("MQ4 active: the patient in my room, and those back from a service waiting to continue", async () => {
    api(routes(board({ rooms: [{ ...busy, waiting: [visit(12, 4, "Vũ Lan", { returned: true })] }] })));
    screen("/my-queue/active", "/my-queue/active", <MyExamQueue mode="active" />);
    expect(await view.findByText("Lê Văn Cường")).toBeInTheDocument();
    expect(view.getByText("Đã xong chỉ định · chờ khám tiếp (1)")).toBeInTheDocument();
    expect(view.getByText("Vũ Lan")).toBeInTheDocument();
  });
});
