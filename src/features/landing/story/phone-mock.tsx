import { Bell, CalendarCheck, HeartPulse, Thermometer, Wind } from "lucide-react";

import { HEART_RATE } from "../data";
import { Sparkline } from "./charts";

/**
 * Scene 6: the patient's (or their caregiver's) phone, showing what the clinic
 * saw. 300 × 620; `cine-phone-item` rows are what the film brings in one by one.
 */
export function PhoneMock() {
  return (
    <div className="cine-phone absolute h-[620px] w-[300px] rounded-[46px] bg-[#0b1d1e] p-3 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.6)]">
      <div className="relative h-full overflow-hidden rounded-[36px] bg-[#f3faf8] text-[#0f3d3f]">
        <div className="mx-auto mt-2 h-6 w-24 rounded-full bg-[#0b1d1e]" />
        <div className="px-5 pt-4">
          <p className="cine-phone-item text-[12px] text-[#4f6b6d]">Hồ sơ đang xem · người chăm sóc</p>
          <p className="cine-phone-item landing-display text-[19px]">Mẹ — Trần Thị Lan</p>

          <div className="cine-phone-item mt-3 rounded-2xl bg-[#0b5f63] px-4 py-3 text-white">
            <p className="text-[12px] text-white/75">Tình trạng hiện tại</p>
            <p className="mt-0.5 text-[14px] font-semibold">Cần chú ý · đội chăm sóc đã liên hệ</p>
          </div>

          <div className="cine-phone-item mt-3 grid grid-cols-3 gap-2">
            {[
              { Icon: Wind, value: "91", unit: "%", alert: true },
              { Icon: HeartPulse, value: "88", unit: "bpm", alert: false },
              { Icon: Thermometer, value: "34,2", unit: "°C", alert: false },
            ].map(({ Icon, value, unit, alert }) => (
              <div key={unit} className="rounded-xl bg-white px-2 py-2 text-center">
                <Icon className={`mx-auto size-3.5 ${alert ? "text-[#d6455d]" : "text-[#008c91]"}`} />
                <p className={`landing-display mt-1 text-[16px] tabular-nums ${alert ? "text-[#d6455d]" : ""}`}>{value}</p>
                <p className="text-[10px] text-[#4f6b6d]">{unit}</p>
              </div>
            ))}
          </div>

          <div className="cine-phone-item mt-3 rounded-2xl bg-white px-4 py-3">
            <p className="text-[12px] font-semibold">Nhịp tim · 8 giờ qua</p>
            <div className="mt-1 text-[#d6455d]">
              <Sparkline values={HEART_RATE} min={66} max={92} width={230} height={40} />
            </div>
          </div>

          <div className="cine-phone-item mt-3 flex gap-2.5 rounded-2xl bg-white px-4 py-3">
            <Bell className="mt-0.5 size-4 shrink-0 text-[#d6455d]" />
            <p className="text-[12px] leading-[17px]">
              <span className="font-semibold">ĐD. Ngô Thanh Hà</span> đã xem chỉ số SpO₂ lúc 09:12 và gọi điện hỏi thăm.
            </p>
          </div>

          <div className="cine-phone-item mt-3 flex gap-2.5 rounded-2xl bg-white px-4 py-3">
            <CalendarCheck className="mt-0.5 size-4 shrink-0 text-[#008c91]" />
            <p className="text-[12px] leading-[17px]">
              <span className="font-semibold">Tái khám thứ Sáu 23/10</span>
              <br />
              BS. Lê Thu Trang · số thứ tự 05
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
