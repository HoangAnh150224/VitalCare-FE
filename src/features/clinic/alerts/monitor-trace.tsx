import { useEffect, useRef } from "react";

export type TracePoint = { at: number; value: number };

const WINDOW_MS = 60_000;
/** After this long without a reading the line stops: the band is no longer sending. */
const GAP_MS = 20_000;

/**
 * The last minute of one measure, drawn as the readings came: the line runs
 * level while the value holds, steps up when it rises and down when it falls,
 * and slides left as time passes. With no reading in the minute it lies flat
 * and faint along the bottom.
 */
export function MonitorTrace({
  points,
  color,
}: {
  points: TracePoint[];
  color: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const data = useRef(points);
  useEffect(() => {
    data.current = points;
  }, [points]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let frame = 0;
    const draw = () => {
      const ratio = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * ratio || canvas.height !== h * ratio) {
        canvas.width = w * ratio;
        canvas.height = h * ratio;
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const now = Date.now();
      const shown = data.current
        .filter((p) => now - p.at < WINDOW_MS + GAP_MS)
        .sort((a, b) => a.at - b.at);
      const base = h - 5;
      const top = 6;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      if (!shown.length) {
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(0, base);
        ctx.lineTo(w, base);
        ctx.stroke();
      } else {
        // A few units of room either way, so one step up or down shows without filling the card.
        const values = shown.map((p) => p.value);
        const low = Math.min(...values) - 3;
        const high = Math.max(...values) + 3;
        const x = (at: number) => w - ((now - at) / WINDOW_MS) * w;
        const y = (v: number) =>
          base - ((v - low) / (high - low)) * (base - top);
        ctx.globalAlpha = 1;
        ctx.beginPath();
        shown.forEach((p, i) => {
          const prev = shown[i - 1];
          if (!prev || p.at - prev.at > GAP_MS) {
            ctx.moveTo(x(p.at), y(p.value));
          } else {
            // Level until the new reading, then a short ramp to it.
            const ramp = Math.min(p.at - prev.at, 1_500);
            ctx.lineTo(x(p.at - ramp), y(prev.value));
            ctx.lineTo(x(p.at), y(p.value));
          }
        });
        const last = shown[shown.length - 1];
        const until = Math.min(now, last.at + GAP_MS);
        ctx.lineTo(x(until), y(last.value));
        ctx.stroke();
        if (now - last.at < GAP_MS) {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x(until) - 3, y(last.value), 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [color]);

  return <canvas ref={ref} className="h-16 w-full" aria-hidden />;
}
