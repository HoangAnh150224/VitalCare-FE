import { useEffect, useRef } from "react";

export type TracePoint = { at: number; value: number };

const WINDOW_MS = 60_000;
/** After this long without a reading the line stops: the band is no longer sending. */
export const GAP_MS = 20_000;

/**
 * The last minute of one measure, drawn as the readings came: the line runs
 * level while the value holds, steps up when it rises and down when it falls,
 * and slides left as time passes. With no reading in the minute it lies flat
 * and faint along the bottom.
 *
 * `skew` is the browser's clock minus the band's: the points carry the band's
 * time, so without it a band a little behind would have every reading slide
 * off as if the signal had gone. Not `live` (alert closed), it is drawn once
 * and left still.
 */
export function MonitorTrace({
  points,
  color,
  skew = 0,
  live = true,
}: {
  points: TracePoint[];
  color: string;
  skew?: number;
  live?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let frame = 0;
    const draw = () => {
      const ratio = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      // Rounded as the canvas rounds them, or a fractional ratio reallocates the buffer every frame.
      const pw = Math.round(w * ratio);
      const ph = Math.round(h * ratio);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const now = Date.now() - skew;
      const shown = points
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
      if (live) frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [color, points, skew, live]);

  return <canvas ref={ref} className="h-16 w-full" aria-hidden />;
}
