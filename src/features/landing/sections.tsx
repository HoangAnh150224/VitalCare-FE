import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Activity,
  BellRing,
  Building2,
  CalendarCheck,
  ClipboardList,
  Cpu,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router";

import { Button } from "@/shared/ui/button";

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  { Icon: Building2, title: "Quản lý phòng khám", body: "Nhiều cơ sở, mỗi cơ sở có nhân viên, thiết bị và bệnh nhân riêng." },
  { Icon: Users, title: "Quản lý bệnh nhân", body: "Hồ sơ cho cả gia đình, giấy tờ tùy thân và trạng thái theo dõi." },
  { Icon: ClipboardList, title: "Hồ sơ bệnh án", body: "Lần khám, chẩn đoán của bác sĩ và ghi chú theo dõi có ký tên." },
  { Icon: CalendarCheck, title: "Đăng ký khám", body: "Chọn bác sĩ và ngày, nhận số thứ tự ngay khi đăng ký." },
  { Icon: Cpu, title: "Thiết bị theo dõi", body: "Kho thiết bị theo cơ sở, cấp cho bệnh nhân và thu hồi khi xong." },
  { Icon: Activity, title: "Theo dõi từ xa", body: "SpO₂, nhịp tim và nhiệt độ gửi về liên tục, xem theo xu hướng." },
  { Icon: BellRing, title: "Cảnh báo & phản hồi", body: "Vượt ngưỡng thì tạo cảnh báo, nhân viên y tế nhận và xử lý." },
  { Icon: Smartphone, title: "Theo dõi trên di động", body: "Bệnh nhân và người chăm sóc xem chỉ số, thông báo, lịch tái khám." },
  { Icon: ShieldCheck, title: "Phân quyền theo vai trò", body: "Mỗi người chỉ thấy đúng dữ liệu của phòng khám và vai trò mình." },
];

const STEPS = [
  { title: "Tạo tài khoản", body: "Bằng số điện thoại, xác nhận qua mã gửi tới máy." },
  { title: "Điền hồ sơ", body: "Họ tên, ngày sinh, giới tính và CCCD, cho bạn hoặc người thân." },
  { title: "Đăng ký khám", body: "Chọn cơ sở, bác sĩ và ngày. Số thứ tự có ngay khi đăng ký." },
  { title: "Khám và nhận thiết bị", body: "Bác sĩ khám, ghi hồ sơ và cấp thiết bị nếu cần theo dõi." },
  { title: "Theo dõi tại nhà", body: "Thiết bị gửi chỉ số, đội chăm sóc theo dõi và liên hệ khi cần." },
];

export function Features() {
  return (
    <section id="tinh-nang" className="mx-auto max-w-6xl px-4 py-24 sm:px-8">
      <h2 className="landing-display landing-section-title max-w-2xl">Mọi việc của phòng khám, trên một nền tảng</h2>
      <ul className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ Icon, title, body }) => (
          <li key={title} className="landing-feature">
            <Icon className="size-6 text-[var(--landing-teal)]" strokeWidth={1.8} />
            <h3 className="landing-ink mt-4 font-semibold">{title}</h3>
            <p className="landing-muted mt-1.5 text-sm leading-6">{body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The five steps, with a line drawn through them as they scroll past. */
export function HowItWorks({ animate }: { animate: boolean }) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!animate || !root.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".landing-flow-line",
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top 75%", end: "bottom 60%", scrub: 0.6 },
        },
      );
      gsap.utils.toArray<HTMLElement>(".landing-flow-step").forEach((step, i) => {
        gsap.fromTo(
          step,
          { autoAlpha: 0.25, y: 18 },
          {
            autoAlpha: 1,
            y: 0,
            ease: "none",
            scrollTrigger: { trigger: root.current, start: `top+=${i * 50} 70%`, end: `top+=${i * 50 + 160} 70%`, scrub: 0.6 },
          },
        );
      });
    }, root);
    return () => ctx.revert();
  }, [animate]);

  return (
    <section ref={root} className="landing-band">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-8">
        <h2 className="landing-display landing-section-title">VitalCare hoạt động thế nào</h2>
        <p className="landing-muted mt-4 max-w-xl leading-7">
          Từ lần đầu đăng ký khám tới những ngày được theo dõi ở nhà, mỗi bước nối tiếp bước trước.
        </p>
        <div className="relative mt-14">
          <div className="landing-flow-track absolute top-[22px] right-0 left-0 hidden h-0.5 lg:block" aria-hidden="true">
            <div className="landing-flow-line h-full origin-left" />
          </div>
          <ol className="grid gap-y-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-x-8">
            {STEPS.map(({ title, body }, i) => (
              <li key={title} className="landing-flow-step relative">
                <span className="landing-display landing-flow-number">{i + 1}</span>
                <h3 className="landing-ink mt-5 font-semibold">{title}</h3>
                <p className="landing-muted mt-2 text-sm leading-6">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

export function Platform() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-8">
      <h2 className="landing-display landing-section-title">Hai ứng dụng, một hồ sơ</h2>
      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <article className="landing-platform">
          <div className="landing-photo aspect-[16/10]">
            <img src="/landing/consult.webp" alt="Bác sĩ trao đổi với bệnh nhân" loading="lazy" className="size-full object-cover" />
          </div>
          <h3 className="landing-display mt-6 text-2xl">VitalCare Web</h3>
          <p className="landing-muted mt-2 leading-7">
            Cho bác sĩ, điều dưỡng, lễ tân, quản trị phòng khám và quản trị hệ thống: tiếp nhận, khám, hồ sơ, thiết bị,
            theo dõi và cảnh báo — mỗi vai trò thấy đúng phần việc của mình.
          </p>
        </article>
        <article className="landing-platform">
          <div className="landing-photo aspect-[16/10]">
            <img
              src="/landing/family.webp"
              alt="Hai vợ chồng lớn tuổi ngồi cạnh nhau ở nhà"
              loading="lazy"
              className="size-full object-cover"
            />
          </div>
          <h3 className="landing-display mt-6 text-2xl">VitalCare Mobile</h3>
          <p className="landing-muted mt-2 leading-7">
            Cho bệnh nhân và người chăm sóc: đăng ký khám, xem chỉ số mới nhất và xu hướng, nhận thông báo, theo dõi lịch tái
            khám — cho mình và cho người thân.
          </p>
        </article>
      </div>
    </section>
  );
}

export function AiAssist() {
  return (
    <section className="landing-band">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 sm:px-8 lg:grid-cols-2">
        <div>
          <h2 className="landing-display landing-section-title">AI tóm tắt, bác sĩ quyết định</h2>
          <p className="landing-muted mt-5 leading-7">
            Trợ lý AI đọc chuỗi chỉ số dài và tóm lại những gì đáng chú ý: xu hướng, những lần ra khỏi ngưỡng, thiết bị gửi
            thiếu dữ liệu. Nó giúp bác sĩ đọc nhanh hơn.
          </p>
          <p className="landing-muted mt-4 leading-7">
            AI không chẩn đoán, không đề xuất điều trị và không tự gửi gì cho bệnh nhân.
          </p>
        </div>
        <figure className="landing-ai-card">
          <figcaption className="landing-muted flex items-center gap-2 text-sm">
            <Sparkles className="size-4 text-[var(--landing-teal)]" /> Tóm tắt 8 giờ · Trần Thị Lan · dữ liệu mô phỏng
          </figcaption>
          <ul className="landing-ink mt-5 space-y-3 text-[15px] leading-6">
            <li>SpO₂ ổn định quanh 96–97% đến khoảng 07:40, sau đó giảm dần, thấp nhất 91% lúc 09:00.</li>
            <li>Nhịp tim tăng nhẹ cùng thời điểm, từ khoảng 76 lên 88 bpm.</li>
            <li>Nhiệt độ da không đổi, 34,1–34,3°C. Thiết bị gửi đủ dữ liệu.</li>
          </ul>
          <p className="landing-note mt-6 text-sm leading-6">Bản tóm tắt để tham khảo. Đánh giá và quyết định thuộc về bác sĩ.</p>
        </figure>
      </div>
    </section>
  );
}

export function FinalCall({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-8">
      <div className="landing-cta flex flex-col items-start gap-8 px-6 py-14 sm:px-12 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl">
          <h2 className="landing-display text-3xl text-white sm:text-4xl">Tương lai của theo dõi bệnh nhân là kết nối.</h2>
          <p className="mt-4 text-white/80">Mở tài khoản bằng số điện thoại, không cần đến quầy.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {signedIn ? (
            <Button asChild size="lg" variant="secondary">
              <Link to="/dashboard">Vào trang của tôi</Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg" variant="secondary">
                <Link to="/register">Tạo tài khoản</Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                <Link to="/login">Đăng nhập</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
