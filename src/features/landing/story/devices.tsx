import { LIVE } from "../data";

/**
 * Scene 2: the two devices a clinic lends out — a fingertip oximeter (SpO₂
 * and pulse) and a skin patch (temperature) — each tied by a leader line to
 * the reading it produces.
 *
 * Drawn in a 940 × 640 box. Rendered in its final state; the film sets the
 * starting state and scrubs towards this one. Class names are the film's
 * handles.
 */
export function Devices() {
  return (
    <div className="cine-devices absolute inset-0" aria-hidden="true">
      <div className="cine-devices-rig absolute inset-0">
        <svg viewBox="0 0 940 640" className="absolute inset-0 size-full">
          <defs>
            <linearGradient id="ox-shell" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#cfe3e2" />
            </linearGradient>
            <linearGradient id="ox-clip" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f4fbfa" />
              <stop offset="1" stopColor="#b9d6d4" />
            </linearGradient>
            <linearGradient id="patch-skin" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#e9f7f4" />
              <stop offset="1" stopColor="#bfe3dc" />
            </linearGradient>
            <radialGradient id="device-glow">
              <stop offset="0" stopColor="#2ec4b6" stopOpacity="0.35" />
              <stop offset="1" stopColor="#2ec4b6" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Pleth trace along the floor of the scene, the pulse the oximeter reads. */}
          <path
            className="cine-pulse"
            pathLength={1}
            d="M20 580 H250 C262 580 266 548 278 548 C290 548 292 590 304 590 C312 590 314 572 322 572 C330 572 334 580 346 580 H470 C482 580 486 548 498 548 C510 548 512 590 524 590 C532 590 534 572 542 572 C550 572 554 580 566 580 H690 C702 580 706 548 718 548 C730 548 732 590 744 590 C752 590 754 572 762 572 C770 572 774 580 786 580 H920"
            fill="none"
            stroke="#d6455d"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Measurement rings, one set per device. */}
          {[0, 1, 2].map((i) => (
            <circle key={`ox-${i}`} className="cine-ring cine-ring-ox" cx="330" cy="320" r={150 + i * 46} fill="none" stroke="#5fd4c7" strokeOpacity={0.5 - i * 0.14} strokeWidth="1.5" />
          ))}
          {[0, 1, 2].map((i) => (
            <circle key={`tp-${i}`} className="cine-ring cine-ring-tp" cx="720" cy="330" r={112 + i * 40} fill="none" stroke="#5fd4c7" strokeOpacity={0.45 - i * 0.13} strokeWidth="1.5" />
          ))}

          {/* Leader lines from each device to its reading. */}
          <path className="cine-leader" pathLength={1} d="M300 244 C290 190 260 150 238 128" fill="none" stroke="#8fe3d9" strokeWidth="1.5" strokeDasharray="1" />
          <path className="cine-leader" pathLength={1} d="M262 398 C250 450 244 480 238 500" fill="none" stroke="#8fe3d9" strokeWidth="1.5" strokeDasharray="1" />
          <path className="cine-leader" pathLength={1} d="M720 262 C730 220 760 196 790 176" fill="none" stroke="#8fe3d9" strokeWidth="1.5" strokeDasharray="1" />

          {/* Fingertip oximeter. */}
          <g className="cine-oximeter">
            <circle cx="330" cy="320" r="170" fill="url(#device-glow)" />
            <rect x="200" y="252" width="260" height="150" rx="56" fill="url(#ox-shell)" />
            <path d="M214 300 C214 268 240 246 276 246 H384 C420 246 446 268 446 300" fill="url(#ox-clip)" />
            <path d="M206 316 H454" stroke="#9fc3c1" strokeWidth="2" />
            {/* The slot the finger goes into. */}
            <ellipse cx="452" cy="330" rx="12" ry="30" fill="#7fa9a7" />
            <rect x="244" y="268" width="150" height="96" rx="16" fill="#062a2c" />
            <text x="258" y="292" fill="#5fd4c7" fontSize="13" fontWeight="600" fontFamily="inherit">SpO₂ %</text>
            <text x="258" y="340" fill="#ffffff" fontSize="40" fontWeight="700" fontFamily="inherit">{LIVE.spo2}</text>
            <text x="336" y="292" fill="#f2a3b0" fontSize="13" fontWeight="600" fontFamily="inherit">PR</text>
            <text x="336" y="326" fill="#ffffff" fontSize="22" fontWeight="700" fontFamily="inherit">{LIVE.heartRate}</text>
            {[0, 1, 2, 3, 4].map((i) => (
              <rect key={i} x={340 + i * 9} y={348 - (i % 3) * 5 - 4} width="5" height={(i % 3) * 5 + 6} rx="1.5" fill="#5fd4c7" />
            ))}
            <circle cx="228" cy="380" r="7" fill="#9fc3c1" />
          </g>

          {/* Skin temperature patch. */}
          <g className="cine-patch">
            <circle cx="720" cy="330" r="130" fill="url(#device-glow)" />
            <rect x="620" y="270" width="200" height="120" rx="60" fill="url(#patch-skin)" stroke="#9fd2c9" strokeWidth="2" />
            <circle cx="720" cy="330" r="34" fill="#ffffff" stroke="#7cc9bd" strokeWidth="3" />
            <circle cx="720" cy="330" r="14" fill="#0b5f63" />
            <circle cx="776" cy="304" r="5" fill="#2ec4b6" />
          </g>
        </svg>

        <Reading className="left-[28px] top-[54px]" label="SpO₂" to={LIVE.spo2} unit="%" />
        <Reading className="left-[28px] top-[500px]" label="Nhịp tim" to={LIVE.heartRate} unit="bpm" />
        <Reading className="left-[690px] top-[70px]" label="Nhiệt độ da" to={LIVE.temperature} unit="°C" decimals={1} />
      </div>
    </div>
  );
}

function Reading({
  className,
  label,
  to,
  unit,
  decimals = 0,
}: {
  className: string;
  label: string;
  to: number;
  unit: string;
  decimals?: number;
}) {
  return (
    <div className={`cine-label cine-glass absolute w-[210px] rounded-2xl px-5 py-3 ${className}`}>
      <p className="text-sm text-[#a9d9d4]">{label}</p>
      <p className="landing-display mt-0.5 text-3xl text-white tabular-nums">
        <span className="cine-num" data-to={to} data-decimals={decimals}>
          {to.toLocaleString("vi-VN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
        </span>
        <span className="ml-1.5 text-base font-semibold text-[#a9d9d4]">{unit}</span>
      </p>
    </div>
  );
}
