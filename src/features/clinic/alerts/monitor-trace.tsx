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

const SPEED = 60; // pixels a second

/**
 * A bedside-monitor trace sweeping right to left, as the patient app draws it
 * while measuring: the baseline is zero and every beat rises above it, `bpm`
 * times a minute. With `bpm` 0 (no fresh reading) it lies flat.
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

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let frame = 0;
    const draw = (ms: number) => {
      const ratio = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * ratio || canvas.height !== h * ratio) {
        canvas.width = w * ratio;
        canvas.height = h * ratio;
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const base = h - 5;
      const top = 4;
      // The temperature swells slowly whatever the pulse.
      const beats = kind === "ripple" ? 0.25 : bpm / 60;
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, base);
      ctx.lineTo(w, base);
      ctx.stroke();
      ctx.globalAlpha = bpm > 0 ? 1 : 0.35;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (let x = 0; x <= w; x += 0.5) {
        const at = ms / 1000 - (w - x) / SPEED;
        const phase = (((at * beats) % 1) + 1) % 1;
        const y = bpm > 0 ? base - (base - top) * height(kind, phase) : base;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [kind, bpm, color]);

  return <canvas ref={ref} className="h-16 w-full" aria-hidden />;
}
