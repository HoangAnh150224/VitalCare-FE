import { ALERT_STEPS } from "../data";

/** Scene 5's four steps, in the order an alert goes through them. */
export function AlertSteps() {
  return (
    <ol className="mt-7 flex flex-wrap items-center gap-x-2 gap-y-2 text-[15px]">
      {ALERT_STEPS.map((step, i) => (
        <li key={step} className="cine-step flex items-center gap-2">
          {i > 0 && <span className="h-px w-5 bg-[#5f9fd4]/60" aria-hidden="true" />}
          <span className="flex items-center gap-2 rounded-full border border-[#5f9fd4]/40 bg-[#145a8f] px-3 py-1.5 text-[#d9e9f6]">
            <span className="cine-step-dot size-2 rounded-full bg-[#5f9fd4]" />
            {step}
          </span>
        </li>
      ))}
    </ol>
  );
}
