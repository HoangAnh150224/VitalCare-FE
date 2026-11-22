/** FE-02 Device data sync: DeviceSyncList, SyncFailureList, SyncFailureShow and FailureActions. Report-5.1, sheet FE_ClinicScreens2. */
import { screen as view, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DeviceSyncList, SyncFailureList, SyncFailureShow } from "@/features/clinic/device-syncs";
import { access, api, notify, screen, sent } from "./harness";

const batch = {
  id: 70, deviceId: 3, deviceCode: "VC-BAND-01", clinicId: "a", customerId: 1, customerName: "Trần Thị Bích", clientBatchId: "b-1",
  source: "MQTT", receivedAt: "2026-11-22T01:00:00Z", recordCount: 10, acceptedCount: 7, duplicateCount: 1, rejectedCount: 2,
  pendingOnDevice: 0, status: "PARTIAL", error: null,
};
const failure = {
  id: 8, batchId: 70, deviceId: 3, deviceCode: "VC-BAND-01", clientRecordId: "r-9", payload: { spo2: 140 },
  reason: "SpO2 out of range", status: "OPEN", attempts: 1, lastAttemptAt: "2026-11-22T01:00:00Z", resolvedAt: null,
  receivedAt: "2026-11-22T01:00:00Z",
};

beforeEach(() => notify.open.mockClear());
afterEach(() => {
  access.can = true;
});

describe("DeviceSyncList (/device-syncs) — Device Sync History", () => {
  it("DY1 each batch: device, patient, source, counts and result", async () => {
    api({ "GET /device_syncs*": { status: 200, body: [batch] } });
    screen("/device-syncs", "/device-syncs", <DeviceSyncList />);
    expect(await view.findByText("Trần Thị Bích")).toBeInTheDocument();
    expect(view.getByText("MQTT (thiết bị)")).toBeInTheDocument();
    expect(view.getByText("Một phần")).toBeInTheDocument();
    expect(view.getByText(/10 · lưu 7 · trùng 1/)).toBeInTheDocument();
  });
});

describe("SyncFailureList (/sync-failures) — Sync Failures", () => {
  it("SF1 opens on the records still waiting (status=OPEN), each with its reason linked to its detail", async () => {
    api({ "GET /sync_failures*": { status: 200, body: [failure] } });
    screen("/sync-failures", "/sync-failures", <SyncFailureList />);
    expect(await view.findByRole("link", { name: "SpO2 out of range" })).toHaveAttribute("href", "/sync-failures/show/8");
    expect(view.getByText("Chờ xử lý")).toBeInTheDocument();
    await waitFor(() => expect(sent("GET", "/sync_failures")[0].path).toMatch(/status=OPEN/));
  });

  it("SF2 retry that still fails says the record is still not received, with the reason", async () => {
    api({
      "GET /sync_failures*": { status: 200, body: [failure] },
      "POST /sync_failures/8/retry": { status: 200, body: { ...failure, attempts: 2 } },
    });
    const user = userEvent.setup();
    screen("/sync-failures", "/sync-failures", <SyncFailureList />);
    await user.click(await view.findByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(sent("POST", "/sync_failures/8/retry")).toHaveLength(1));
    await waitFor(() => expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({
      type: "error", message: "Vẫn chưa nhận được bản ghi", description: "SpO2 out of range",
    })));
  });

  it("SF3 discard marks it skipped", async () => {
    api({
      "GET /sync_failures*": { status: 200, body: [failure] },
      "POST /sync_failures/8/discard": { status: 200, body: { ...failure, status: "DISCARDED" } },
    });
    const user = userEvent.setup();
    screen("/sync-failures", "/sync-failures", <SyncFailureList />);
    await user.click(await view.findByRole("button", { name: "Bỏ qua" }));
    await waitFor(() => expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({ type: "success", message: "Bản ghi: đã bỏ qua" })));
  });

  it("SF4 a resolved record, or a user without the right, gets no retry or discard", async () => {
    api({ "GET /sync_failures*": { status: 200, body: [{ ...failure, status: "RESOLVED" }] } });
    const { unmount } = screen("/sync-failures", "/sync-failures", <SyncFailureList />);
    expect(await view.findByText("Đã nhận lại")).toBeInTheDocument();
    expect(view.queryByRole("button", { name: "Thử lại" })).toBeNull();
    unmount();
    access.can = false;
    api({ "GET /sync_failures*": { status: 200, body: [failure] } });
    screen("/sync-failures", "/sync-failures", <SyncFailureList />);
    expect(await view.findByText("Chờ xử lý")).toBeInTheDocument();
    expect(view.queryByRole("button", { name: "Thử lại" })).toBeNull();
  });
});

describe("SyncFailureShow (/sync-failures/show/:id) — Sync Failure Detail", () => {
  it("SD1 the reason, attempts and the batch it came in, linked; a retry that succeeds says received", async () => {
    api({
      "GET /sync_failures/8": { status: 200, body: failure },
      "POST /sync_failures/8/retry": { status: 200, body: { ...failure, status: "RESOLVED" } },
    });
    const user = userEvent.setup();
    screen("/sync-failures/show/8", "/sync-failures/show/:id", <SyncFailureShow />);
    expect(await view.findByText("SpO2 out of range")).toBeInTheDocument();
    expect(view.getByRole("link", { name: /#70/ })).toHaveAttribute("href", "/device-syncs/show/70");
    await user.click(await view.findByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({ type: "success", message: "Bản ghi: đã nhận lại" })));
  });
});
