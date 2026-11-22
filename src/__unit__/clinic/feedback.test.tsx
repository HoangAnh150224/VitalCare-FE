/** FE-07 Submit Feedback (MyFeedbackCard) and Clinic Feedback Management (FeedbackShow). Report-5.1, sheet FE_ClinicScreens. */
import { screen as view, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { FeedbackShow, MyFeedbackCard } from "@/features/clinic/results/feedback";
import { access, api, notify, screen, sent } from "./harness";

const fb = {
  id: 5, appointmentId: 10, appointmentDate: "2026-11-20", customerId: 1, customerName: "Trần Thị Bích", doctorName: "BS. An",
  rating: 4, comment: "Bác sĩ tận tình", createdAt: "2026-11-20T08:00:00Z",
  deleted: false, deletedAt: null, removalReason: null, reply: null, repliedAt: null,
};

beforeEach(() => notify.open.mockClear());
afterEach(() => {
  access.can = true;
});

describe("MyFeedbackCard — Submit Feedback", () => {
  const open = () => screen("/my-results/10", "/my-results/:id", <MyFeedbackCard appointmentId={10} />);

  it("FB1 no star chosen: Gửi góp ý is off", async () => {
    api({ "GET /my_feedback": { status: 200, body: [] } });
    open();
    expect(await view.findByRole("button", { name: "Gửi góp ý" })).toBeDisabled();
  });

  it("FB2 stars and a comment are sent for this visit", async () => {
    api({ "GET /my_feedback": { status: 200, body: [] }, "POST /my_feedback": { status: 200, body: fb } });
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("radio", { name: "4 sao" }));
    await user.type(view.getByLabelText("Nhận xét"), "Bác sĩ tận tình");
    await user.click(view.getByRole("button", { name: "Gửi góp ý" }));
    await waitFor(() => expect(sent("POST", "/my_feedback")).toHaveLength(1));
    expect(sent("POST", "/my_feedback")[0].body).toEqual({ appointmentId: 10, rating: 4, comment: "Bác sĩ tận tình" });
    expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({ type: "success", message: "Cảm ơn bạn đã góp ý" }));
  });

  it("FB3 a visit not completed yet: the refusal is said in Vietnamese", async () => {
    api({
      "GET /my_feedback": { status: 200, body: [] },
      "POST /my_feedback": { status: 409, body: { status: 409, message: "Feedback is given on a completed visit" } },
    });
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("radio", { name: "5 sao" }));
    await user.click(view.getByRole("button", { name: "Gửi góp ý" }));
    expect((await view.findByRole("alert")).textContent).toBe("Chỉ góp ý được cho lượt khám đã hoàn tất.");
  });

  it("FB4 feedback already given is shown, with the clinic's reply; editing sends a PUT", async () => {
    api({
      "GET /my_feedback": { status: 200, body: [{ ...fb, reply: "Cảm ơn chị", repliedAt: "2026-11-21T08:00:00Z" }] },
      "PUT /my_feedback/5": { status: 200, body: fb },
    });
    const user = userEvent.setup();
    open();
    expect(await view.findByText("Cảm ơn chị")).toBeInTheDocument();
    await user.click(view.getByRole("button", { name: "Sửa góp ý" }));
    await user.click(view.getByRole("radio", { name: "5 sao" }));
    await user.click(view.getByRole("button", { name: "Lưu góp ý" }));
    await waitFor(() => expect(sent("PUT", "/my_feedback/5")).toHaveLength(1));
    expect(sent("PUT", "/my_feedback/5")[0].body).toEqual({ rating: 5, comment: "Bác sĩ tận tình" });
  });
});

describe("FeedbackShow (/feedback/show/:id) — Clinic Feedback Management", () => {
  const open = () => screen("/feedback/show/5", "/feedback/show/:id", <FeedbackShow />);

  it("FM1 the feedback, who gave it and for which visit", async () => {
    api({ "GET /feedback/5": { status: 200, body: fb } });
    open();
    expect(await view.findByText("Trần Thị Bích")).toBeInTheDocument();
    expect(view.getByText("Bác sĩ tận tình")).toBeInTheDocument();
    expect(view.getByText(/Bác sĩ: BS\. An/)).toBeInTheDocument();
  });

  it("FM2 a reply is sent trimmed; an empty one cannot be sent", async () => {
    api({ "GET /feedback/5": { status: 200, body: fb }, "PUT /feedback/5/reply": { status: 200, body: fb } });
    const user = userEvent.setup();
    open();
    const button = await view.findByRole("button", { name: "Lưu phản hồi" });
    expect(button).toBeDisabled();
    await user.type(view.getByPlaceholderText("Nhập phản hồi cho bệnh nhân..."), "  Cảm ơn chị  ");
    await user.click(button);
    await waitFor(() => expect(sent("PUT", "/feedback/5/reply")).toHaveLength(1));
    expect(sent("PUT", "/feedback/5/reply")[0].body).toEqual({ reply: "Cảm ơn chị" });
  });

  it("FM3 removing asks for a reason, sends it, and goes back to the list", async () => {
    api({ "GET /feedback/5": { status: 200, body: fb }, "DELETE /feedback/5": { status: 200, body: {} } });
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("button", { name: "Xóa góp ý không phù hợp" }));
    const confirm = view.getByRole("button", { name: "Xác nhận xóa" });
    expect(confirm).toBeDisabled();
    await user.type(view.getByPlaceholderText("Nhập lý do góp ý không phù hợp..."), " Spam ");
    await user.click(confirm);
    await waitFor(() => expect(sent("DELETE", "/feedback/5")).toHaveLength(1));
    expect(sent("DELETE", "/feedback/5")[0].body).toEqual({ reason: "Spam" });
    await waitFor(() => expect(view.getByTestId("location").textContent).toBe("/feedback"));
  });

  it("FM4 removed feedback can only be read: no reply box, no remove button, the reason shown", async () => {
    api({ "GET /feedback/5": { status: 200, body: { ...fb, deleted: true, removalReason: "Spam" } } });
    open();
    expect(await view.findByText("Lý do: Spam")).toBeInTheDocument();
    expect(view.queryByPlaceholderText("Nhập phản hồi cho bệnh nhân...")).toBeNull();
    expect(view.queryByRole("button", { name: "Xóa góp ý không phù hợp" })).toBeNull();
  });

  it("FM5 [DEF-FB-01] the service's own Vietnamese refusal (409) is said under the reply button", async () => {
    api({
      "GET /feedback/5": { status: 200, body: fb },
      "PUT /feedback/5/reply": { status: 409, body: { status: 409, message: "Góp ý đã xóa, chỉ có thể xem chi tiết." } },
    });
    const user = userEvent.setup();
    open();
    await user.type(await view.findByPlaceholderText("Nhập phản hồi cho bệnh nhân..."), "Cảm ơn");
    await user.click(view.getByRole("button", { name: "Lưu phản hồi" }));
    expect((await view.findByRole("alert")).textContent).toBe("Góp ý đã xóa, chỉ có thể xem chi tiết.");
  });

  it("FM6 without the right to reply the reply is only read", async () => {
    access.can = false;
    api({ "GET /feedback/5": { status: 200, body: fb } });
    open();
    expect(await view.findByText("Chưa có phản hồi.")).toBeInTheDocument();
  });
});
