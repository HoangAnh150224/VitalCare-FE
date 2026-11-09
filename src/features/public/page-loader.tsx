import { useIsFetching } from "@tanstack/react-query";
import { HeartIcon } from "lucide-react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import "./page-loader.css";

/**
 * Shown at least this long: one whole round of the rabbit (into the database, out with hearts).
 * ponytail: every public page waits this long even when its data is cached; lower it to trade the
 * show for speed.
 */
const MIN_MS = 1800;

/** Where each heart flies to, and in which colour. */
const HEARTS = [
  { dx: -50, color: "#f472a8" },
  { dx: 42, color: "#7cc4ff" },
  { dx: -20, color: "#ffd1e3" },
  { dx: 60, color: "#f472a8" },
  { dx: -64, color: "#7cc4ff" },
  { dx: 16, color: "#ff9ec4" },
];

/**
 * One public page arriving: the rabbit slipping into the database for the page's data and
 * popping back out with hearts, a bar under it, until the data is in; then the page's blocks
 * lift into place. Mount it keyed by the path, so every page gets its own.
 */
export function PageArrival({ children }: { children: ReactNode }) {
  const [minPassed, setMinPassed] = useState(false);
  // The public pages read under ["public", …]; anything still in flight keeps the loader up.
  const fetching = useIsFetching({ queryKey: ["public"] }) > 0;
  const loading = !minPassed || fetching;

  useEffect(() => {
    // A new page starts at its top, wherever the last one was scrolled to.
    window.scrollTo(0, 0);
    const timer = setTimeout(() => setMinPassed(true), MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div className="page-loader" data-done={!loading} role="status" aria-live="polite" aria-busy={loading}>
        <div className="pl-scene" aria-hidden="true">
          {HEARTS.map((heart, i) => (
            <HeartIcon
              key={i}
              className="pl-heart"
              fill="currentColor"
              strokeWidth={0}
              // A tilt that follows the drift: hearts leaning out the way they fly.
              style={{ "--dx": `${heart.dx}px`, "--tilt": `${heart.dx / 3}deg`, "--i": i, color: heart.color } as CSSProperties}
            />
          ))}
          {/* The rabbit lives above the database's mouth; this box clips it as it drops in. */}
          <div className="pl-hole">
            <img src="/loader-rabbit.gif" alt="" className="pl-rabbit" />
          </div>
          <svg className="pl-db" viewBox="0 0 120 100" fill="none">
            {/* Body, then the three disks that light up while the rabbit is inside. */}
            <path d="M6 14v68c0 7.7 24.2 14 54 14s54-6.3 54-14V14" className="pl-db-body" />
            <path d="M6 37c0 7.7 24.2 14 54 14s54-6.3 54-14" className="pl-db-disk" style={{ "--d": 0 } as CSSProperties} />
            <path d="M6 60c0 7.7 24.2 14 54 14s54-6.3 54-14" className="pl-db-disk" style={{ "--d": 1 } as CSSProperties} />
            <path d="M6 82c0 7.7 24.2 14 54 14s54-6.3 54-14" className="pl-db-disk" style={{ "--d": 2 } as CSSProperties} />
            {/* The mouth: its back half sits behind the rabbit, its front rim over it. */}
            <ellipse cx="60" cy="14" rx="54" ry="12" className="pl-db-mouth" />
          </svg>
        </div>
        <div className="page-loader-track" aria-hidden="true">
          <div className="page-loader-bar" />
        </div>
        <p className="page-loader-text">{loading ? "Chờ em 1 chút......." : "Có rồi!"}</p>
      </div>
      {/* Mounted from the start so its data loads under the loader; shown once it is in. */}
      <div className={loading ? "invisible" : "screen-enter screen-enter-stagger"}>{children}</div>
    </>
  );
}
