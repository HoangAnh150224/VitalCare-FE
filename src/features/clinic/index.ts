/**
 * The clinic: customers becoming patients, and the appointment book that gets
 * them there — from the front desk's side and from the customer's own.
 *
 * One feature rather than three because the screens share their pieces — the
 * booking fields and the check-in/cancel actions appear on both sides of the
 * book — and a feature may not import another feature.
 */
export * from "./customers";
export * from "./appointments";
export * from "./my-appointments";
export * from "./clinics";
export * from "./staff";
export * from "./devices";
export * from "./my-patients";
export * from "./view-as";
