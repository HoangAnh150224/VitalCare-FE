import { linePath } from "./chart-math";

/**
 * A small trend line. `className` lands on the path so the film can draw it
 * (`pathLength` is 1, so a dash offset of 1 hides it and 0 shows it all).
 */
export function Sparkline({
  values,
  min,
  max,
  width = 200,
  height = 48,
  className,
  stroke = "currentColor",
}: {
  values: number[];
  min: number;
  max: number;
  width?: number;
  height?: number;
  className?: string;
  stroke?: string;
}) {
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" aria-hidden="true">
      <path
        className={className}
        d={linePath(values, width, height, min, max)}
        pathLength={1}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}
