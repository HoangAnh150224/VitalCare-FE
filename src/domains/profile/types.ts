import type { CustomerStatus, Gender } from "@/domains/customer/types";

/**
 * A patient profile under the signed-in account (`GET /my_profiles`): the
 * owner's own, or a relative's they register visits for.
 */
export type Profile = {
  id: number;
  customerCode: string;
  /** The account owner's own profile, as opposed to a relative's. */
  self: boolean;
  fullName: string;
  phone: string;
  dateOfBirth: string | null;
  gender: Gender | null;
  /** What a relative is to the owner; null on the owner's own profile. */
  relationship: Relationship | null;
  nationalId: string | null;
  nationalIdType: "cccd" | "personal_id" | "passport" | null;
  /** `YYYY-MM-DD`. */
  nationalIdIssuedOn: string | null;
  ethnicity: string | null;
  nationality: string | null;
  occupation: string | null;
  province: string | null;
  ward: string | null;
  address: string | null;
  status: CustomerStatus;
  /** Whether a visit can be registered for this profile yet: it needs a date of birth and a gender. */
  complete: boolean;
};

export type Relationship = "child" | "parent" | "spouse" | "sibling" | "other";

export const RELATIONSHIP_LABELS: Record<Relationship, string> = {
  child: "Con",
  parent: "Bố / Mẹ",
  spouse: "Vợ / Chồng",
  sibling: "Anh / Chị / Em",
  other: "Khác",
};

export const RELATIONSHIP_OPTIONS = (Object.keys(RELATIONSHIP_LABELS) as Relationship[]).map((value) => ({
  label: RELATIONSHIP_LABELS[value],
  value,
}));

/** "Bản thân" for the owner, the relationship for a relative. */
export const profileKind = (profile: Pick<Profile, "self" | "relationship">) =>
  profile.self ? "Bản thân" : profile.relationship ? RELATIONSHIP_LABELS[profile.relationship] : "Người thân";

export const ID_TYPE_LABELS = {
  cccd: "CCCD",
  personal_id: "Mã định danh",
  passport: "Hộ chiếu",
} as const;

export type IdType = keyof typeof ID_TYPE_LABELS;

/** Street, ward, province as one line, leaving out whatever is not filled in. */
export const fullAddress = (profile: { address: string | null; ward: string | null; province: string | null }) =>
  [profile.address, profile.ward, profile.province].filter(Boolean).join(", ") || null;
