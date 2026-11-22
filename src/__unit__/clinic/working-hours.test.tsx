/** FE-10 Manage Doctor Availability: WorkingHoursEditor. Report-5.1, sheet FE_ClinicScreens. */
import { fireEvent, screen as view, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WorkingHoursEditor } from "@/features/clinic/schedules/working-hours-editor";
import { api, notify, screen, sent } from "./harness";

const doctor = (workingHours: unknown[] = []) => ({
  id: 5, fullName: "BS. Nguyễn An", specialty: "Hô hấp", professionalTitle: null, workingHours, day: null, manageable: true,
});
const onSaved = vi.fn();
const open = (editable = true, hours: unknown[] = []) =>
  screen("/doctor-schedules", "/doctor-schedules", <WorkingHoursEditor doctor={doctor(hours) as never} editable={editable} onSaved={onSaved} />);

beforeEach(() => {
  notify.open.mockClear();
  onSaved.mockClear();
});

describe("WorkingHoursEditor — Manage Doctor Availability", () => {
  it("WH1 a doctor with no sessions: says no visits are taken, nothing to save", async () => {
    api({ "GET /exam_rooms*": { status: 200, body: [] } });
    open();
    expect(await view.findByText(/Chưa có buổi làm việc nào/)).toBeInTheDocument();
    expect(view.getByRole("button", { name: "Lưu giờ làm việc" })).toBeDisabled();
  });

  it("WH2 the usual week: Monday to Friday, morning and afternoon, 8 visits each; saved as a whole", async () => {
    api({ "GET /exam_rooms*": { status: 200, body: [] }, "PUT /doctors/5/working-hours": { status: 200, body: [] } });
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("button", { name: "Thứ Hai – Thứ Sáu" }));
    expect(view.getAllByText("8 lượt")).toHaveLength(10);
    await user.click(view.getByRole("button", { name: "Lưu giờ làm việc" }));
    await waitFor(() => expect(sent("PUT", "/doctors/5/working-hours")).toHaveLength(1));
    const body = sent("PUT", "/doctors/5/working-hours")[0].body as { sessions: unknown[] };
    expect(body.sessions).toHaveLength(10);
    expect(body.sessions[0]).toEqual({ dayOfWeek: 1, startTime: "08:00", endTime: "12:00", visitMinutes: 30, examRoomId: null });
    await waitFor(() => expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({ type: "success", message: "Đã lưu giờ làm việc" })));
    expect(onSaved).toHaveBeenCalled();
  });

  it("WH3 visits per session are whole visits only", async () => {
    api({ "GET /exam_rooms*": { status: 200, body: [] } });
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("button", { name: "Thêm buổi" }));
    expect(view.getByText("8 lượt")).toBeInTheDocument();
    fireEvent.change(view.getByLabelText("Phút mỗi lượt khám"), { target: { value: "25" } });
    expect(view.getByText("9 lượt")).toBeInTheDocument();
  });

  it("WH4 the API's refusals in Vietnamese: overlap, end before start, room taken", async () => {
    for (const [message, vi] of [
      ["Two sessions on the same day overlap", "Hai buổi trong cùng một ngày đang chồng giờ nhau."],
      ["A session must end after it starts", "Giờ kết thúc phải sau giờ bắt đầu."],
      ["Room P101 is taken by BS. Bình from 07:00:00 to 09:00:00 on that day", "Phòng P101 đã có BS. Bình từ 07:00 đến 09:00 trong ngày đó."],
    ]) {
      api({
        "GET /exam_rooms*": { status: 200, body: [] },
        "PUT /doctors/5/working-hours": { status: 422, body: { status: 422, message: "Validation failed", errors: { sessions: message } } },
      });
      const user = userEvent.setup();
      const { unmount } = open();
      await user.click(await view.findByRole("button", { name: "Thêm buổi" }));
      await user.click(view.getByRole("button", { name: "Lưu giờ làm việc" }));
      expect(await view.findByText(vi)).toBeInTheDocument();
      unmount();
    }
  });

  it("WH5 removing a session makes the week changed; read-only for someone who cannot manage the doctor", async () => {
    api({ "GET /exam_rooms*": { status: 200, body: [] } });
    const user = userEvent.setup();
    const session = { dayOfWeek: 1, startTime: "08:00:00", endTime: "12:00:00", visitMinutes: 30, examRoomId: null };
    const { unmount } = open(true, [session]);
    const save = await view.findByRole("button", { name: "Lưu giờ làm việc" });
    expect(save).toBeDisabled();
    await user.click(view.getByRole("button", { name: "Xoá buổi" }));
    expect(save).toBeEnabled();
    unmount();
    api({ "GET /exam_rooms*": { status: 200, body: [] } });
    open(false, [session]);
    await new Promise((r) => setTimeout(r, 100));
    expect(view.queryByRole("button", { name: "Lưu giờ làm việc" })).toBeNull();
  });
});
