/** FE-05 Patient monitoring assignment: AssignmentList and MyPatientList. Report-5.1, sheet FE_ClinicScreens2. */
import { screen as view, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AssignmentList } from "@/features/clinic/assignments";
import { MyPatientList } from "@/features/clinic/my-patients";
import { api, screen, sent } from "./harness";

const assignment = {
  id: 4, patient: { id: 1, customerCode: "KH001", fullName: "Trần Thị Bích" },
  staff: { id: 9, fullName: "BS. Nguyễn An", staffType: "doctor" },
  assignedAt: "2026-11-02T02:00:00Z", endedAt: null, status: "active",
};
const ended = { ...assignment, id: 5, patient: { id: 2, customerCode: "KH002", fullName: "Lê Văn Cường" }, endedAt: "2026-11-20T02:00:00Z", status: "ended" };
const patient = (id: number, name: string, over: Record<string, unknown> = {}) => ({
  id, customerCode: `KH00${id}`, fullName: name, phone: `091234567${id}`, dateOfBirth: null, gender: "female",
  emergencyContactName: null, emergencyContactPhone: null, followingSince: "2026-11-02", device: null, careTeam: null, ...over,
});
const patients = [
  patient(1, "Trần Thị Bích", { device: { id: 3, deviceCode: "VC-BAND-01", model: null } }),
  patient(2, "Lê Văn Cường", { gender: "male" }),
  patient(3, "Đỗ Hải", { gender: "male", careTeam: [{ id: 9, fullName: "BS. Nguyễn An" }] }),
];

describe("AssignmentList (/monitoring-assignments) — Monitoring Assignments", () => {
  it("AS1 each assignment: patient and code, who follows them and as what, start, end and status", async () => {
    api({ "GET /monitoring_assignments*": { status: 200, body: [assignment, ended] } });
    screen("/monitoring-assignments", "/monitoring-assignments", <AssignmentList />);
    expect(await view.findByText("Trần Thị Bích")).toBeInTheDocument();
    expect(view.getAllByText("BS. Nguyễn An")).toHaveLength(2);
    expect(view.getAllByText("Bác sĩ")).toHaveLength(2);
    expect(view.getByText("Đang theo dõi")).toBeInTheDocument();
    expect(view.getByText("Đã kết thúc")).toBeInTheDocument();
    expect(view.getAllByText("—").length).toBeGreaterThan(0);
  });
});

describe("MyPatientList (/my-patients) — My Patients", () => {
  const open = (props: Parameters<typeof MyPatientList>[0] = {}) => {
    api({ "GET /my_patients*": { status: 200, body: patients } });
    return screen("/my-patients", "/my-patients", <MyPatientList resource="my_patients" {...props} />);
  };

  it("MY1 each patient with phone and code, the band they wear or Chưa đeo", async () => {
    open();
    expect(await view.findByText("Trần Thị Bích")).toBeInTheDocument();
    expect(view.getByText("VC-BAND-01")).toBeInTheDocument();
    expect(view.getAllByText("Chưa đeo")).toHaveLength(2);
  });

  it("MY2 the search ignores accents and counts what is shown of all", async () => {
    const user = userEvent.setup();
    open();
    await view.findByText("Trần Thị Bích");
    await user.type(view.getByLabelText("Tìm bệnh nhân"), "do hai");
    expect(view.queryByText("Trần Thị Bích")).toBeNull();
    expect(view.getByText("Đỗ Hải")).toBeInTheDocument();
    expect(view.getByText("1 / 3 bệnh nhân")).toBeInTheDocument();
  });

  it("MY3 only those wearing a band; then the filters are cleared", async () => {
    const user = userEvent.setup();
    open();
    await view.findByText("Trần Thị Bích");
    await user.click(view.getByRole("combobox", { name: "Lọc thiết bị" }));
    await user.click(await view.findByRole("option", { name: "Đang đeo thiết bị" }));
    expect(view.queryByText("Lê Văn Cường")).toBeNull();
    expect(view.getByText("1 / 3 bệnh nhân")).toBeInTheDocument();
    await user.click(view.getByRole("button", { name: "Xóa bộ lọc" }));
    expect(view.getByText("Lê Văn Cường")).toBeInTheDocument();
  });

  it("MY4 for one member of staff (view-as): the care team column and a permanent employee filter", async () => {
    open({ showCareTeam: true, employeeId: 9, readOnly: true, patientPath: (id) => `/view-as/patients/${id}` });
    expect(await view.findByText("Người phụ trách")).toBeInTheDocument();
    await waitFor(() => expect(sent("GET", "/my_patients")[0].path).toMatch(/employeeId=9/));
    expect(view.getAllByRole("link", { name: "Xem" })[0]).toHaveAttribute("href", "/view-as/patients/1");
  });

  it("MY5 boundary: a search that matches nobody shows 0 of all", async () => {
    const user = userEvent.setup();
    open();
    await view.findByText("Trần Thị Bích");
    await user.type(view.getByLabelText("Tìm bệnh nhân"), "zzz");
    expect(view.getByText("0 / 3 bệnh nhân")).toBeInTheDocument();
  });
});
