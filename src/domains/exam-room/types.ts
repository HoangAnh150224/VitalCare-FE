/** Free, with a patient inside, or paused (maintenance, a break): only a free room is given a patient. */
export type ExamRoomStatus = "available" | "occupied" | "paused";

export const EXAM_ROOM_STATUS_LABELS: Record<ExamRoomStatus, string> = {
  available: "Trống",
  occupied: "Đang khám",
  paused: "Tạm ngưng",
};

/** A room as `GET /exam_rooms` returns it. */
export type ExamRoom = {
  id: number;
  clinic: { id: string; name: string };
  /** What the sign on the door says, e.g. `P101`; unique within the clinic. */
  code: string;
  name: string | null;
  status: ExamRoomStatus;
};

/** A visit on the board: in a room, or waiting for one. */
export type BoardVisit = {
  appointmentId: number;
  queueNumber: number | null;
  customerId: number;
  patientName: string;
  customerCode: string | null;
  checkedInAt: string | null;
  calledAt: string | null;
  /** Called before and not there: waits behind everybody not yet called. */
  passedOver: boolean;
  /** Back from ordered services or sent by a colleague: called first. */
  returned?: boolean;
  /** The doctor who referred the patient here today. */
  referredBy?: string | null;
};

/** A patient out of the room for ordered services or another doctor: how far along. */
export type AwayVisit = { visit: BoardVisit; done: number; total: number; pending: string[] };

export type BoardDoctor = { id: number; fullName: string; specialty: string | null };

/**
 * `GET /exam_rooms/board`: one clinic's floor right now. Every action on a
 * room (`/call-next`, `/pass-over`, `/finish`, `/pause`, `/resume`) answers
 * with the same shape.
 */
export type RoomBoard = {
  clinicId: string;
  at: string;
  rooms: {
    id: number;
    code: string;
    name: string | null;
    status: ExamRoomStatus;
    /** The doctor whose session puts them in this room now; null outside any session. */
    doctor: BoardDoctor | null;
    current: BoardVisit | null;
    waiting: BoardVisit[];
    away?: AwayVisit[];
  }[];
  /** Doctors whose patients are waiting with no room to be called into. */
  withoutRoom: { doctor: BoardDoctor; waiting: BoardVisit[]; away?: AwayVisit[] }[];
};
