import { HeartPulse, LayoutDashboard, Server, Smartphone } from "lucide-react";

/** The route a reading takes, through the four node centres below. */
const FLOW_ROUTE =
  "M110 330 C200 330 250 190 360 190 C470 190 480 440 600 440 C720 440 730 290 840 290";

const NODES = [
  { x: 110, y: 330, Icon: HeartPulse, name: "Thiết bị theo dõi", stage: "Thu nhận" },
  { x: 360, y: 190, Icon: Smartphone, name: "Điện thoại / Gateway", stage: "Truyền an toàn" },
  { x: 600, y: 440, Icon: Server, name: "Máy chủ VitalCare", stage: "Kiểm tra & xử lý" },
  { x: 840, y: 290, Icon: LayoutDashboard, name: "Nền tảng theo dõi", stage: "Lưu vào hồ sơ" },
];

export const PARTICLE_COUNT = 12;

/**
 * Scene 3: a reading's way from the device to the platform, as four nodes on
 * one curved route with particles running along it. 940 × 640 box, final
 * state; particles start hidden, since a still picture has nothing to carry.
 */
export function DataFlow() {
  return (
    <div className="cine-flow absolute inset-0" aria-hidden="true">
      <svg viewBox="0 0 940 640" className="absolute inset-0 size-full overflow-visible">
        <path d={FLOW_ROUTE} fill="none" stroke="#5fd4c7" strokeOpacity="0.12" strokeWidth="14" strokeLinecap="round" />
        <path
          id="cine-flow-route"
          className="cine-route"
          d={FLOW_ROUTE}
          pathLength={1}
          fill="none"
          stroke="#5fd4c7"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="1"
        />
        {Array.from({ length: PARTICLE_COUNT }, (_, i) => (
          <circle key={i} className="cine-particle" r={i % 3 === 0 ? 6 : 4} cx="0" cy="0" fill="#bff3ec" opacity="0" />
        ))}
      </svg>

      {NODES.map(({ x, y, Icon, name, stage }) => (
        <div
          key={name}
          className="cine-node absolute flex w-[180px] -translate-x-1/2 flex-col items-center text-center"
          style={{ left: x, top: y - 44 }}
        >
          <span className="cine-node-dot cine-glass flex size-[88px] items-center justify-center rounded-full">
            <Icon className="size-9 text-[#bff3ec]" strokeWidth={1.6} />
          </span>
          <span className="mt-3 text-[15px] font-semibold text-white">{name}</span>
          <span className="mt-1 rounded-full bg-[#0f5054] px-3 py-1 text-xs font-medium text-[#a9eee5]">
            {stage}
          </span>
        </div>
      ))}
    </div>
  );
}
