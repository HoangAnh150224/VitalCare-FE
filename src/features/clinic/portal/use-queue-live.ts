import { useInvalidate, useList, useNotification } from "@refinedev/core";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

import { subscribe } from "@/shared/api/live";
import type { Appointment } from "@/domains/appointment/types";
import { clinicToday } from "../appointments/clinic-day";
import { VISIT_SORTERS } from "./visit";

/** Where the API nudges an account when its clinic's queue moves; needs `my_appointments:read`. */
const MY_QUEUE = "/user/queue/my_appointments";
export const QUEUE_KEY = "my-queue";
/** The fallback while a visit is live, for a socket a proxy or a sleeping phone dropped. */
const POLL_MS = 30_000;

/** "Phòng 3", or the room's code when it has no name. */
export const roomLabel = (visit: Appointment) =>
  visit.examRoom ? (visit.examRoom.name ?? `phòng ${visit.examRoom.code}`) : "phòng khám";

/** Re-reads the account's visits and every queue position shown. */
function useRefreshQueue() {
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();
  return useCallback(() => {
    // "all": a "detail" without an id refreshes nothing, and the slip reads one.
    void invalidate({ resource: "my_appointments", invalidates: ["all"] });
    void queryClient.invalidateQueries({ queryKey: [QUEUE_KEY] });
  }, [invalidate, queryClient]);
}

/**
 * The portal's live queue, run once by the shell so it holds on every screen:
 * re-reads the visits when the API says the clinic's queue moved, polls on the
 * day of a visit still to happen in case the socket is down, and tells the patient — toast,
 * buzz, tab title — the moment one of their visits is called into a room.
 */
export function useMyQueueLive() {
  const refresh = useRefreshQueue();
  useEffect(() => subscribe(MY_QUEUE, refresh), [refresh]);

  // The same list the home screen reads, so this shares its cache rather than adding a request.
  const { result } = useList<Appointment>({
    resource: "my_appointments",
    pagination: { currentPage: 1, pageSize: 100 },
    sorters: [...VISIT_SORTERS],
  });
  const today = clinicToday();
  // From "registered" on, not only once checked in: without the socket, the
  // check-in itself is the change this page would otherwise never hear of.
  const anyLive = (result?.data ?? []).some(
    (visit) =>
      visit.appointmentDate === today &&
      (visit.status === "scheduled" || visit.status === "checked_in" || visit.status === "in_exam")
  );

  useEffect(() => {
    if (!anyLive) return;
    const timer = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(timer);
  }, [anyLive, refresh]);

  // Each visit's last seen status: a visit seen for the first time already in a room was not "just" called.
  const seen = useRef(new Map<string, string>());
  const { open } = useNotification();
  const visits = result?.data;

  useEffect(() => {
    if (!visits) return;
    const called = visits.filter(
      (visit) => visit.status === "in_exam" && seen.current.get(String(visit.id)) === "checked_in"
    );
    for (const visit of visits) seen.current.set(String(visit.id), visit.status);
    if (called.length === 0) return;
    for (const visit of called) {
      open?.({
        type: "success",
        message: `Đến lượt ${visit.customer.fullName}`,
        description: `Mời vào ${roomLabel(visit)}.`,
        key: `called-${visit.id}`,
      });
    }
    navigator.vibrate?.([200, 100, 200]);
    flagTitle();
  }, [visits, open]);
}

/** Marks the tab while it is in the background, until the patient looks at it again. */
function flagTitle() {
  if (!document.hidden || document.title.startsWith("🔔")) return;
  const title = document.title;
  document.title = `🔔 Đến lượt bạn`;
  const restore = () => {
    if (document.hidden) return;
    document.title = title;
    document.removeEventListener("visibilitychange", restore);
  };
  document.addEventListener("visibilitychange", restore);
}
