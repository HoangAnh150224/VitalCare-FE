import "@fontsource/be-vietnam-pro/vietnamese-600.css";
import "@fontsource/be-vietnam-pro/latin-600.css";
import "@fontsource/be-vietnam-pro/vietnamese-800.css";
import "@fontsource/be-vietnam-pro/latin-800.css";
import { useIsAuthenticated } from "@refinedev/core";
import { Link } from "react-router";

import "./landing.css";

import { Button } from "@/shared/ui/button";

/**
 * The page a visitor sees before signing in: what VitalCare does for a
 * patient, the way a visit goes from registering to being followed at home,
 * and the two doors in — create an account or sign in. Static: nothing here
 * calls the API, which answers nobody who is not signed in.
 */
export function Landing() {
  // Everybody opens here; somebody already signed in goes on to the app instead of signing in again.
  const { data: auth } = useIsAuthenticated();
  const signedIn = auth?.authenticated ?? false;

  return (
    <div className="landing min-h-svh">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-8">
        <Link to="/" className="landing-display flex items-center gap-2.5 text-lg rounded-md">
          <img src="/vitalcare-mark.png" alt="" className="size-9" />
          VitalCare
        </Link>
        <nav className="flex items-center gap-2">
          {signedIn ? (
            <Button asChild>
              <Link to="/dashboard">Vào trang của tôi</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" className="landing-ink">
                <Link to="/login">Đăng nhập</Link>
              </Button>
              <Button asChild className="hidden sm:inline-flex">
                <Link to="/register">Tạo tài khoản</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-10 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:pt-16 lg:pb-14">
            <div className="max-w-xl">
              <h1 className="landing-display landing-hero-title">
                Đăng ký khám, nhận số, và được theo dõi cả khi đã về nhà.
              </h1>
              <p className="landing-muted mt-6 text-lg leading-8">
                Chọn bác sĩ và ngày khám từ điện thoại, biết trước số thứ tự và giờ dự kiến. Sau buổi khám,
                chỉ số từ thiết bị đo được gửi về để đội chăm sóc của phòng khám tiếp tục theo dõi.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/register">Tạo tài khoản để đăng ký khám</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/login">Tôi đã có tài khoản</Link>
                </Button>
              </div>
            </div>

            <QueueTicket />
          </div>
          <Heartbeat />
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
          <h2 className="landing-display landing-section-title">Một lượt khám đi qua năm bước</h2>
          <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map(({ title, body }, index) => (
              <li key={title} className="landing-step">
                <span className="landing-display landing-step-number" aria-hidden="true">
                  {index + 1}
                </span>
                <h3 className="landing-ink mt-4 font-semibold">{title}</h3>
                <p className="landing-muted mt-2 text-sm leading-6">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="landing-band">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-8 lg:grid-cols-2">
            <div className="max-w-lg">
              <h2 className="landing-display landing-section-title">Sau buổi khám, phòng khám vẫn ở bên bạn</h2>
              <p className="landing-muted mt-5 leading-7">
                Thiết bị đo do phòng khám cấp gửi nhịp tim, SpO2 và huyết áp về hồ sơ của bạn. Bác sĩ và điều dưỡng
                phụ trách xem các chỉ số này, ghi chú theo dõi có ký tên, và liên hệ khi có điều cần lưu ý.
              </p>
              <p className="landing-muted mt-4 leading-7">
                Hồ sơ khám và lịch sử đo luôn được lưu lại, kể cả khi bạn tạm dừng theo dõi.
              </p>
            </div>
            <Readings />
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-8 lg:grid-cols-[1fr_1.2fr]">
          <h2 className="landing-display landing-section-title max-w-md">Một tài khoản cho cả nhà</h2>
          <div className="landing-muted max-w-xl leading-7">
            <p>
              Thêm hồ sơ cho bố mẹ, con cái hay người thân bạn đưa đi khám, tối đa mười người. Mỗi hồ sơ có họ tên,
              ngày sinh, giới tính và giấy tờ tùy thân riêng, nên bác sĩ luôn biết mình đang khám cho ai.
            </p>
            <p className="mt-4">Khi đăng ký khám, bạn chỉ cần chọn người tới khám trong danh sách.</p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-8">
          <div className="landing-cta flex flex-col items-start justify-between gap-6 px-6 py-10 sm:px-10 md:flex-row md:items-center">
            <div>
              <h2 className="landing-display text-2xl text-white sm:text-3xl">Bắt đầu với số điện thoại của bạn</h2>
              <p className="mt-2 text-white/80">Mã xác nhận được gửi qua tin nhắn. Không cần đến quầy để mở tài khoản.</p>
            </div>
            <Button asChild size="lg" variant="secondary">
              <Link to="/register">Tạo tài khoản</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="landing-rule">
        <div className="landing-muted mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm sm:px-8">
          <span>© 2026 VitalCare</span>
          <Link to="/login" className="landing-link rounded-sm">
            Nhân viên phòng khám đăng nhập tại đây
          </Link>
        </div>
      </footer>
    </div>
  );
}

const STEPS = [
  { title: "Tạo tài khoản", body: "Bằng số điện thoại, xác nhận qua mã gửi tới máy." },
  { title: "Điền hồ sơ", body: "Họ tên, ngày sinh, giới tính và CCCD, cho bạn hoặc người thân." },
  { title: "Đăng ký khám", body: "Chọn cơ sở, bác sĩ và ngày. Số thứ tự có ngay khi đăng ký." },
  { title: "Đến khám", body: "Đưa số cho quầy tiếp nhận, bác sĩ khám và ghi vào hồ sơ." },
  { title: "Theo dõi tại nhà", body: "Thiết bị đo gửi chỉ số, đội chăm sóc theo dõi và ghi chú." },
];

/** What a registration hands back: the slip a hospital queue would print. */
function QueueTicket() {
  return (
    <figure className="landing-ticket mx-auto w-full max-w-sm" aria-label="Ví dụ phiếu đăng ký khám">
      <div className="px-7 pt-7 pb-6">
        <p className="landing-muted text-sm">Phiếu đăng ký khám</p>
        <p className="landing-display landing-ticket-number" aria-label="Số thứ tự 7">
          07
        </p>
        <p className="landing-ink font-semibold">Số thứ tự của bạn</p>
      </div>
      <div className="landing-perforation" aria-hidden="true" />
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 px-7 pt-6 pb-7 text-sm">
        <dt className="landing-muted">Người khám</dt>
        <dd className="landing-ink font-medium">Phạm Gia Bảo</dd>
        <dt className="landing-muted">Bác sĩ</dt>
        <dd className="landing-ink font-medium">BS. Lê Thu Trang</dd>
        <dt className="landing-muted">Ngày khám</dt>
        <dd className="landing-ink font-medium">Thứ Ba, 20/10/2026</dd>
        <dt className="landing-muted">Giờ dự kiến</dt>
        <dd className="landing-ink font-medium">khoảng 08:42</dd>
      </dl>
      <p className="landing-ticket-foot px-7 py-4 text-xs leading-5">
        Đổi ngày hoặc hủy được đến 2 giờ trước giờ dự kiến.
      </p>
    </figure>
  );
}

/** The one moving thing on the page: a trace drawn once across the hero. */
function Heartbeat() {
  return (
    <svg
      className="landing-heartbeat"
      viewBox="0 0 1200 80"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <path
        pathLength={1}
        d="M0 50 H420 L440 50 L452 30 L464 50 L486 50 L500 8 L516 74 L530 50 L560 50 L574 40 L590 50 H1200"
      />
    </svg>
  );
}

const READINGS = [
  { label: "Nhịp tim", value: "78", unit: "lần/phút" },
  { label: "SpO2", value: "97", unit: "%" },
  { label: "Huyết áp", value: "128/82", unit: "mmHg" },
];

function Readings() {
  return (
    <figure className="landing-readings" aria-label="Ví dụ chỉ số gửi từ thiết bị đo">
      <figcaption className="landing-muted text-sm">Lần đo gần nhất, 07:15 sáng nay</figcaption>
      <dl className="mt-5 grid grid-cols-3 gap-4">
        {READINGS.map(({ label, value, unit }) => (
          <div key={label}>
            <dt className="landing-muted text-sm">{label}</dt>
            <dd className="landing-display landing-ink mt-1 text-2xl tabular-nums sm:text-3xl">{value}</dd>
            <dd className="landing-muted text-xs">{unit}</dd>
          </div>
        ))}
      </dl>
      <p className="landing-note mt-6 text-sm leading-6">
        ĐD. phụ trách: chỉ số ổn định ba ngày liền, giữ lịch đo buổi sáng.
      </p>
    </figure>
  );
}
