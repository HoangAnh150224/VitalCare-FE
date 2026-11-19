import { Bell, CalendarCheck, CircleAlert, HeartPulse, Thermometer, Wind } from "lucide-react";

import {
  DEVICES,
  HEART_RATE,
  PATIENTS,
  SPO2,
  SPO2_DIP_FROM,
  SPO2_THRESHOLD,
  TEMPERATURE,
  VISITS,
} from "../data";
import { linePath, pointAt } from "./chart-math";
import { Sparkline } from "./charts";

const CHART = { w: 400, h: 120, min: 88, max: 100 };

/**
 * Where the SpO₂ card's centre sits inside the 940 × 640 dashboard, for the
 * film to zoom on. Kept beside the layout it describes.
 */
export const SPO2_CARD_CENTRE = "482px 272px";

/**
 * Scenes 4–5: the clinic's monitoring screen, at a fixed 940 × 640 so the film
 * can place and zoom it. Shows the alert state; the film starts from the calm
 * one (`cine-calm`) and moves to this.
 */
export function DashboardMock() {
  const threshold = CHART.h - ((SPO2_THRESHOLD - CHART.min) / (CHART.max - CHART.min)) * CHART.h;
  const dipStart = pointAt(SPO2, SPO2_DIP_FROM, CHART.w, CHART.h, CHART.min, CHART.max).x;
  const lowest = pointAt(SPO2, 21, CHART.w, CHART.h, CHART.min, CHART.max);

  return (
    <div className="cine-dashboard absolute top-0 left-0 h-[640px] w-[940px] overflow-hidden rounded-[22px] bg-[#f6fbfa] text-[#0f3d3f] shadow-[0_40px_80px_-30px_rgb(0_0_0/0.55)]">
      <header className="flex h-[52px] items-center justify-between border-b border-[#dcefeb] bg-white px-5">
        <div className="flex items-center gap-2.5">
          <img src="/vitalcare-mark.png" alt="" className="size-7" />
          <span className="landing-display text-[15px]">VitalCare</span>
          <span className="text-[13px] text-[#4f6b6d]">/ Theo dõi bệnh nhân</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[#eef6f5] px-2.5 py-1 text-[11px] text-[#4f6b6d]">Dữ liệu mô phỏng</span>
          <span className="relative">
            <Bell className="size-[18px]" />
            <span className="cine-bell absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-[#d6455d] text-[10px] font-semibold text-white">
              1
            </span>
          </span>
        </div>
      </header>

      <div className="relative">
        {/* Left column: who is followed, and on what. */}
        <section className="cine-card absolute top-4 left-4 h-[300px] w-[230px] rounded-2xl bg-white p-4">
          <h4 className="text-[13px] font-semibold">Bệnh nhân đang theo dõi</h4>
          <ul className="mt-3 space-y-2.5">
            {PATIENTS.map((p, i) => (
              <li
                key={p.code}
                className={`flex items-center justify-between rounded-xl px-2.5 py-2 ${i === 0 ? "bg-[#eef8f6]" : ""}`}
              >
                <span>
                  <span className="block text-[12.5px] font-medium">{p.name}</span>
                  <span className="block text-[11px] text-[#4f6b6d]">{p.code}</span>
                </span>
                <span
                  className={`size-2.5 rounded-full ${p.status === "alert" ? "cine-status-alert bg-[#d6455d]" : "bg-[#2ec4b6]"}`}
                />
              </li>
            ))}
          </ul>
        </section>
        <section className="cine-card absolute top-[332px] left-4 h-[292px] w-[230px] rounded-2xl bg-white p-4">
          <h4 className="text-[13px] font-semibold">Thiết bị đang kết nối</h4>
          <ul className="mt-3 space-y-3">
            {DEVICES.map((d) => (
              <li key={d.name}>
                <div className="flex justify-between text-[12px]">
                  <span>{d.name}</span>
                  <span className="text-[#4f6b6d] tabular-nums">{d.battery}%</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-[#e3f1ef]">
                  <div className="h-full rounded-full bg-[#2ec4b6]" style={{ width: `${d.battery}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[11px] leading-4 text-[#4f6b6d]">Cập nhật mỗi 20 phút qua gateway tại nhà.</p>
        </section>

        {/* Current readings of the selected patient. */}
        <div className="absolute top-4 left-[262px] grid w-[662px] grid-cols-3 gap-3">
          <Tile Icon={Wind} label="SpO₂" unit="%" calm="96" alert="91" />
          <Tile Icon={HeartPulse} label="Nhịp tim" unit="bpm" calm="79" alert="88" />
          <Tile Icon={Thermometer} label="Nhiệt độ da" unit="°C" calm="34,2" alert="34,2" steady />
        </div>

        <section className="cine-card cine-spo2-card absolute top-[116px] left-[262px] h-[208px] w-[440px] rounded-2xl bg-white p-4">
          <div className="flex items-baseline justify-between">
            <h4 className="text-[13px] font-semibold">Xu hướng SpO₂ · Trần Thị Lan</h4>
            <span className="text-[11px] text-[#4f6b6d]">8 giờ qua</span>
          </div>
          <svg viewBox={`0 0 ${CHART.w} ${CHART.h}`} className="mt-4 h-[120px] w-full overflow-visible">
            <rect
              className="cine-dip-zone"
              x={dipStart}
              y={0}
              width={CHART.w - dipStart}
              height={CHART.h}
              rx={8}
              fill="#d6455d"
              fillOpacity="0.08"
            />
            <line
              className="cine-threshold"
              x1={0}
              x2={CHART.w}
              y1={threshold}
              y2={threshold}
              stroke="#d6455d"
              strokeDasharray="5 5"
              strokeWidth={1.2}
            />
            <text className="cine-threshold" x={CHART.w} y={threshold - 6} textAnchor="end" fontSize="10" fill="#d6455d">
              Ngưỡng {SPO2_THRESHOLD}%
            </text>
            <path
              className="cine-spo2-line"
              d={linePath(SPO2.slice(0, SPO2_DIP_FROM + 1), (CHART.w / (SPO2.length - 1)) * SPO2_DIP_FROM, CHART.h, CHART.min, CHART.max)}
              pathLength={1}
              fill="none"
              stroke="#008c91"
              strokeWidth={2.5}
              strokeDasharray="1"
            />
            <path
              className="cine-spo2-dip"
              d={linePath(SPO2, CHART.w, CHART.h, CHART.min, CHART.max, SPO2_DIP_FROM)}
              pathLength={1}
              fill="none"
              stroke="#d6455d"
              strokeWidth={2.5}
              strokeDasharray="1"
            />
            <circle className="cine-dip-dot" cx={lowest.x} cy={lowest.y} r={5} fill="#d6455d" stroke="#fff" strokeWidth={2} />
          </svg>
          <div className="mt-2 flex justify-between text-[10px] text-[#7d9496]">
            <span>02:00</span>
            <span>06:00</span>
            <span>09:40</span>
          </div>
        </section>

        <section className="cine-card absolute top-[116px] left-[714px] h-[98px] w-[210px] rounded-2xl bg-white px-4 py-3">
          <h4 className="text-[12px] font-semibold">Nhịp tim</h4>
          <div className="mt-2 text-[#d6455d]">
            <Sparkline values={HEART_RATE} min={66} max={92} width={180} height={44} className="cine-spark" />
          </div>
        </section>
        <section className="cine-card absolute top-[226px] left-[714px] h-[98px] w-[210px] rounded-2xl bg-white px-4 py-3">
          <h4 className="text-[12px] font-semibold">Nhiệt độ da</h4>
          <div className="mt-2 text-[#008c91]">
            <Sparkline values={TEMPERATURE} min={33.8} max={34.5} width={180} height={44} className="cine-spark" />
          </div>
        </section>

        <section className="cine-card absolute top-[336px] left-[262px] h-[288px] w-[350px] rounded-2xl bg-white p-4">
          <h4 className="flex items-center gap-2 text-[13px] font-semibold">
            <CircleAlert className="size-4 text-[#d6455d]" /> Cảnh báo
          </h4>
          <ul className="mt-3 space-y-2.5 text-[12px]">
            <li className="cine-alert-row rounded-xl border border-[#f3c7cf] bg-[#fdf1f3] px-3 py-2.5">
              <span className="block font-semibold text-[#b8334a]">SpO₂ bất thường · Trần Thị Lan</span>
              <span className="block text-[#7a4a53]">91% · Mức trung bình · Cần xem xét</span>
            </li>
            <li className="rounded-xl bg-[#f3f8f7] px-3 py-2.5">
              <span className="block font-medium">Nhịp tim cao · Lê Minh Châu</span>
              <span className="block text-[#4f6b6d]">Đã xử lý · hôm qua 21:40</span>
            </li>
            <li className="rounded-xl bg-[#f3f8f7] px-3 py-2.5">
              <span className="block font-medium">Thiết bị mất kết nối · OX-09</span>
              <span className="block text-[#4f6b6d]">Đã xử lý · hôm qua 18:05</span>
            </li>
          </ul>
        </section>
        <section className="cine-card absolute top-[336px] left-[624px] h-[288px] w-[300px] rounded-2xl bg-white p-4">
          <h4 className="flex items-center gap-2 text-[13px] font-semibold">
            <CalendarCheck className="size-4 text-[#008c91]" /> Đăng ký khám hôm nay
          </h4>
          <ul className="mt-3 space-y-2.5">
            {VISITS.map((v) => (
              <li key={v.name} className="flex items-center gap-3 rounded-xl bg-[#f3f8f7] px-3 py-2.5 text-[12px]">
                <span className="landing-display w-8 text-center text-[15px] text-[#008c91] tabular-nums">
                  {String(v.queue).padStart(2, "0")}
                </span>
                <span className="flex-1">
                  <span className="block font-medium">{v.name}</span>
                  <span className="block text-[#4f6b6d]">khoảng {v.time}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Tile({
  Icon,
  label,
  unit,
  calm,
  alert,
  steady = false,
}: {
  Icon: typeof Wind;
  label: string;
  unit: string;
  calm: string;
  alert: string;
  steady?: boolean;
}) {
  return (
    <div className="cine-card h-[88px] rounded-2xl bg-white px-4 py-3">
      <p className="flex items-center gap-1.5 text-[12px] text-[#4f6b6d]">
        <Icon className="size-3.5" /> {label}
      </p>
      <p className="landing-display relative mt-1.5 h-8 text-[26px] tabular-nums">
        {/* The calm reading, and the one after the dip on top of it. */}
        <span className="cine-calm absolute inset-0 opacity-0">
          {calm}
          <span className="ml-1 text-[13px] font-semibold text-[#4f6b6d]">{unit}</span>
        </span>
        <span className={`absolute inset-0 ${steady ? "" : "cine-alerted text-[#d6455d]"}`}>
          {alert}
          <span className="ml-1 text-[13px] font-semibold text-[#4f6b6d]">{unit}</span>
        </span>
      </p>
    </div>
  );
}

/** Scene 5's alert, opened over the dashboard, and who took it. */
export function AlertCard() {
  return (
    <div className="cine-alert cine-glass-light absolute w-[340px] rounded-2xl p-5 text-[#0f3d3f]">
      <p className="flex items-center gap-2 text-[13px] font-semibold text-[#b8334a]">
        <CircleAlert className="size-4" /> Chỉ số SpO₂ bất thường
      </p>
      <p className="landing-display mt-2 text-[34px] leading-none text-[#d6455d] tabular-nums">
        91<span className="ml-1 text-base">%</span>
      </p>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
        <dt className="text-[#4f6b6d]">Bệnh nhân</dt>
        <dd className="font-medium">Trần Thị Lan · BN-0217</dd>
        <dt className="text-[#4f6b6d]">Mức độ</dt>
        <dd className="font-medium">Trung bình</dd>
        <dt className="text-[#4f6b6d]">Trạng thái</dt>
        <dd className="font-medium">
          <span className="cine-alert-open">Cần xem xét</span>
        </dd>
      </dl>
      <p className="cine-ack mt-4 rounded-xl bg-[#e7f6f3] px-3 py-2.5 text-[12.5px] text-[#0b5f63]">
        ĐD. Ngô Thanh Hà đã nhận cảnh báo lúc 09:12 và gọi điện cho bệnh nhân.
      </p>
    </div>
  );
}
