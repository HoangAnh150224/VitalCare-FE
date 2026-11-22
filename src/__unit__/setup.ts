import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

class RO { observe() {} unobserve() {} disconnect() {} }
(globalThis as any).ResizeObserver = RO;
Element.prototype.scrollIntoView = () => {};
document.elementFromPoint = (() => null) as typeof document.elementFromPoint;
Element.prototype.hasPointerCapture = () => false;
Element.prototype.releasePointerCapture = () => {};
window.matchMedia = window.matchMedia || ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as any;
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

/*
 * Refine's useForm rethrows the API's HttpError from onFinish after it has shown
 * it (notification, field errors); a form's submit handler does not catch it, so
 * the browser logs it as an unhandled rejection. Those, and only those, are not
 * test failures; anything else still reaches Vitest.
 */
const isHttpError = (reason: unknown) =>
  typeof reason === "object" && reason !== null && "statusCode" in reason && typeof (reason as { statusCode: unknown }).statusCode === "number";
const vitestListeners = process.listeners("unhandledRejection");
process.removeAllListeners("unhandledRejection");
process.on("unhandledRejection", (reason, promise) => {
  if (isHttpError(reason)) return;
  for (const listener of vitestListeners) listener(reason, promise);
});
