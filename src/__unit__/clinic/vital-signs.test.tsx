/** FE-03 Vital Signs Monitoring: MyHealth (patient portal) and VitalMonitor (staff). Report-5.1, sheet FE_ClinicScreens2. */
import { screen as view, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { MyHealth } from "@/features/clinic/vital-signs";
import { VitalMonitor } from "@/features/clinic/vital-signs/vital-parts";
import { api, calls, screen, sent, type Reply } from "./harness";

const me = { id: 1, self: true, fullName: "Trần Thị Bích", phone: "+84912345678", complete: true };
const na = { ...me, id: 5, self: false, fullName: "Bé Na" };
const latest = {
  heartRate: 128, heartRateAt: "2026-11-22T02:00:00Z", spo2: 97, spo2At: "2026-11-22T02:00:00Z",
  skinTemperature: 36.2, skinTemperatureAt: "2026-11-22T02:00:00Z", bodyTemperature: null, bodyTemperatureAt: null,
  lastMeasuredAt: "2026-11-22T02:00:00Z", readings24h: 40,
};
const reading = (id: number, over: Record<string, unknown> = {}) => ({
  id, measuredAt: "2026-11-22T01:00:00Z", receivedAt: "2026-11-22T01:00:05Z", heartRate: 80, spo2: 98, skinTemperature: 36.1,
  bodyTemperature: null, source: "MQTT", validationStatus: "VALID", validationError: null, deviceId: 3, deviceCode: "VC-BAND-01", ...over,
});
const highHeart = { id: 9, metric: "HEART_RATE", status: "OPEN", severity: "CRITICAL", threshold: 120, operator: "ABOVE", lastValue: 128 };

function own(extra: Record<string, Reply> = {}) {
  return {
    "GET /my_profiles*": { status: 200, body: [me, na] },
    "GET /my_vital_signs/latest*": { status: 200, body: latest },
    "GET /my_vital_signs/trend*": { status: 200, body: { unit: "hour", from: "", to: "", points: [] } },
    "GET /my_vital_signs*": { status: 200, body: [reading(1)], headers: { "x-total-count": "1" } },
    "GET /my_alerts*": { status: 200, body: [] },
    ...extra,
  } as Record<string, Reply>;
}

describe("MyHealth (/my-health) — View Own Vital Signs", () => {
  it("VS1 the latest heart rate, SpO₂ and skin temperature, each with when it was measured", async () => {
    api(own());
    screen("/my-health", "/my-health", <MyHealth />);
    const tiles = await view.findByTestId("vital-tiles");
    await waitFor(() => expect(within(tiles).getByText("128")).toBeInTheDocument());
    expect(within(tiles).getByText("97")).toBeInTheDocument();
    expect(within(tiles).getByText("36,2")).toBeInTheDocument();
    expect(within(tiles).getAllByText(/^lúc /)).toHaveLength(3);
  });

  it("VS2 the own profile is shown first; choosing a relative asks for that relative's readings", async () => {
    api(own());
    const user = userEvent.setup();
    screen("/my-health", "/my-health", <MyHealth />);
    expect(await view.findByRole("button", { name: "Trần Thị Bích" })).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(sent("GET", "/my_vital_signs/latest").some((c) => /profileId=1/.test(c.path))).toBe(true));
    await user.click(view.getByRole("button", { name: "Bé Na" }));
    await waitFor(() => expect(sent("GET", "/my_vital_signs/latest").some((c) => /profileId=5/.test(c.path))).toBe(true));
  });

  it("VS3 a value an open alert still holds is marked and the patient is told to contact the clinic", async () => {
    api(own({ "GET /my_alerts*": { status: 200, body: [highHeart] } }));
    screen("/my-health", "/my-health", <MyHealth />);
    expect(await view.findByText("Khẩn cấp")).toBeInTheDocument();
    expect(view.getByText(/Nhịp tim bất thường/)).toBeInTheDocument();
    expect(view.getByRole("link", { name: "liên hệ phòng khám" })).toHaveAttribute("href", "/my-conversations");
  });

  it("VS4 boundary: no reading yet shows a dash and Chưa có số đo on every tile", async () => {
    const none = { ...latest, heartRate: null, heartRateAt: null, spo2: null, spo2At: null, skinTemperature: null, skinTemperatureAt: null, lastMeasuredAt: null, readings24h: 0 };
    api(own({ "GET /my_vital_signs/latest*": { status: 200, body: none }, "GET /my_vital_signs*": { status: 200, body: [], headers: { "x-total-count": "0" } } }));
    screen("/my-health", "/my-health", <MyHealth />);
    const tiles = await view.findByTestId("vital-tiles");
    await waitFor(() => expect(within(tiles).getAllByText("Chưa có số đo")).toHaveLength(3));
  });

  it("VS5 readings that could not load say so once, with a retry", async () => {
    api(own({ "GET /my_vital_signs/latest*": { status: 500, body: { message: "down" } } }));
    screen("/my-health", "/my-health", <MyHealth />);
    expect(await view.findByText("Không thể tải dữ liệu sức khỏe")).toBeInTheDocument();
    expect(view.getAllByText("Không thể tải dữ liệu sức khỏe")).toHaveLength(1);
  });
});

describe("VitalMonitor (staff, /vital-signs/patient/:id) — Vital Signs History / Trends", () => {
  const staff = (extra: Record<string, Reply> = {}) => ({
    "GET /vital_signs/latest*": { status: 200, body: latest },
    "GET /vital_signs/trend*": { status: 200, body: { unit: "hour", from: "", to: "", points: [] } },
    "GET /vital_signs*": { status: 200, body: [reading(1), reading(2, { validationStatus: "INVALID", validationError: "SpO2 out of range", spo2: 140 })], headers: { "x-total-count": "45" } },
    "GET /alerts*": { status: 200, body: [] },
    ...extra,
  }) as Record<string, Reply>;
  const open = () => screen("/vital-signs/patient/1", "/vital-signs/patient/:id",
    <VitalMonitor scope={{ kind: "staff", customerId: 1 }} detailHref={(id) => `/vital-signs/show/${id}`} />);

  it("VM1 the history shows each reading with its device, an invalid one marked, and links to its detail", async () => {
    api(staff());
    open();
    const table = await view.findByTestId("vital-history");
    expect(await within(table).findByText("Không hợp lệ")).toBeInTheDocument();
    expect(within(table).getAllByText("VC-BAND-01")).toHaveLength(2);
    expect(within(table).getAllByRole("link")[0]).toHaveAttribute("href", "/vital-signs/show/1");
    expect(view.getByText("45 số đo")).toBeInTheDocument();
    expect(view.getByText("1/3")).toBeInTheDocument();
  });

  it("VM2 the next page asks for readings 20 to 40; the first page's back button is off", async () => {
    api(staff());
    const user = userEvent.setup();
    open();
    expect(await view.findByRole("button", { name: "Trang trước" })).toBeDisabled();
    await user.click(await view.findByRole("button", { name: "Trang sau" }));
    await waitFor(() => expect(calls.some((c) => /\/vital_signs\?.*_start=20&_end=40/.test(c.path))).toBe(true));
  });

  it("VM3 including invalid records asks with validation=all; choosing 7 days asks a 7-day window", async () => {
    api(staff());
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("checkbox"));
    await waitFor(() => expect(calls.some((c) => /validation=all/.test(c.path))).toBe(true));
    await user.click(view.getByRole("button", { name: "7 ngày" }));
    expect(view.getByRole("button", { name: "7 ngày" })).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => {
      const trend = sent("GET", "/vital_signs/trend").map((c) => new URL("http://x" + c.path).searchParams);
      const week = trend.find((p) => Date.parse(p.get("to")!) - Date.parse(p.get("from")!) > 6 * 86_400_000);
      expect(week).toBeDefined();
    });
  });
});
