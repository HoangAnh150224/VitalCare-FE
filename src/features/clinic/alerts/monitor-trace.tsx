import { useEffect, useRef } from "react";

export type TraceKind = "ecg" | "pleth" | "ripple";

const bump = (x: number, center: number, width: number) =>
  Math.exp(-(((x - center) / width) ** 2));

/** Height (0..1) of the trace at `phase` (0..1) of one beat. */
const height = (kind: TraceKind, phase: number) =>
  kind === "ecg"
    ? 0.12 * bump(phase, 0.18, 0.04) +
      bump(phase, 0.34, 0.03) +
      0.28 * bump(phase, 0.58, 0.06)
    : kind === "pleth"
    ? 0.9 * bump(phase, 0.25, 0.1) + 0.35 * bump(phase, 0.52, 0.11)
    : 0.35 * bump(phase, 0.5, 0.22);

const SPEED = 90; // pixels a second
const PER_PIXEL = 2; // samples drawn per pixel

/**
 * A bedside-monitor trace sweeping right to left, as the patient app draws it
 * while measuring: the baseline is zero and every beat rises above it, `bpm`
 * times a minute. With `bpm` 0 (no fresh reading) it lies flat.
 *
 * What has been drawn is kept and only shifted: a new pulse rate changes the
 * beats still to come, never the ones already on screen, so the trace does not
 * jump when the reading changes.
 * ponytail: drawn from the pulse rate, not the sensor's raw waveform (the band does not send it).
 */
export function MonitorTrace({
  kind,
  bpm,
  color,
}: {
  kind: TraceKind;
  bpm: number;
  color: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const rate = useRef(bpm);
  useEffect(() => {
    rate.current = bpm;
  }, [bpm]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const samples: number[] = [];
    let phase = 0;
    let last: number | null = null;
    let owed = 0;
    let frame = 0;
    const draw = (ms: number) => {
      const ratio = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * ratio || canvas.height !== h * ratio) {
        canvas.width = w * ratio;
        canvas.height = h * ratio;
      }
      // New samples for the time since the last frame (capped: a hidden tab does not owe minutes of trace).
      const seconds = last == null ? 0 : Math.min((ms - last) / 1000, 0.25);
      last = ms;
      owed += seconds * SPEED * PER_PIXEL;
      const beating = rate.current > 0;
      // The temperature swells slowly whatever the pulse.
      const beats = kind === "ripple" ? 0.25 : rate.current / 60;
      for (; owed >= 1; owed--) {
        phase = (phase + beats / (SPEED * PER_PIXEL)) % 1;
        samples.push(beating ? height(kind, phase) : 0);
      }
      const keep = w * PER_PIXEL;
      if (samples.length > keep) samples.splice(0, samples.length - keep);

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const base = h - 5;
      const top = 4;
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.15;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, base);
      ctx.lineTo(w, base);
      ctx.stroke();
      ctx.globalAlpha = beating ? 1 : 0.35;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.beginPath();
      const start = w - samples.length / PER_PIXEL;
      ctx.moveTo(0, base);
      ctx.lineTo(Math.max(start, 0), base);
      samples.forEach((s, i) =>
        ctx.lineTo(start + i / PER_PIXEL, base - (base - top) * s)
      );
      ctx.stroke();
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [kind, color]);

  return <canvas ref={ref} className="h-16 w-full" aria-hidden />;
}
