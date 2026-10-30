/**
 * First-aid guidance (SRS 3.17): written and reviewed by clinical staff,
 * published for everybody (BR-31). What patients read is the published
 * revision; staff work on the one after it meanwhile.
 */

export type FirstAidStatus =
  | "draft"
  | "pending_review"
  | "reviewed"
  | "published"
  | "archived";

export type FirstAidCategory =
  | "respiratory"
  | "fainting"
  | "fever"
  | "wound"
  | "injury"
  | "environment"
  | "general";

/** A step the caller may take on an article now, as the API decides it. */
export type FirstAidAction =
  | "edit"
  | "submit"
  | "approve"
  | "reject"
  | "publish"
  | "archive";

/** An article as staff work it: `GET /first_aid_articles/{id}`. */
export type FirstAidArticle = {
  id: number;
  title: string;
  category: FirstAidCategory;
  summary: string;
  body: string;
  emergencyWarning: string;
  status: FirstAidStatus;
  revision: number;
  authorId: number | null;
  authorName: string | null;
  reviewerName: string | null;
  reviewNote: string | null;
  /** The revision patients read; null while none is published. */
  publishedRevision: number | null;
  publishedAt: string | null;
  updatedAt: string;
  actions: FirstAidAction[];
};

/** One step of an article's history, with the content it left. */
export type FirstAidStep = {
  id: number;
  revision: number;
  /** Null on the step that created the article. */
  fromStatus: FirstAidStatus | null;
  toStatus: FirstAidStatus;
  actorName: string | null;
  note: string | null;
  at: string;
  title: string;
  category: FirstAidCategory;
  summary: string;
  body: string;
  emergencyWarning: string;
};

/** A published article as anybody reads it: `GET /public/first_aid`. */
export type PublishedFirstAid = {
  id: number;
  title: string;
  category: FirstAidCategory;
  summary: string;
  body: string;
  emergencyWarning: string;
  publishedAt: string;
};

export const FIRST_AID_STATUS_LABELS: Record<FirstAidStatus, string> = {
  draft: "Bản nháp",
  pending_review: "Đang duyệt",
  reviewed: "Đã duyệt",
  published: "Đã xuất bản",
  archived: "Đã lưu trữ",
};

export const FIRST_AID_STATUS_OPTIONS = (
  Object.keys(FIRST_AID_STATUS_LABELS) as FirstAidStatus[]
).map((value) => ({
  value,
  label: FIRST_AID_STATUS_LABELS[value],
}));

export const FIRST_AID_CATEGORY_LABELS: Record<FirstAidCategory, string> = {
  respiratory: "Hô hấp",
  fainting: "Ngất xỉu",
  fever: "Sốt",
  wound: "Vết thương",
  injury: "Chấn thương",
  environment: "Môi trường",
  general: "Tổng quát",
};

export const FIRST_AID_CATEGORY_OPTIONS = (
  Object.keys(FIRST_AID_CATEGORY_LABELS) as FirstAidCategory[]
).map((value) => ({ value, label: FIRST_AID_CATEGORY_LABELS[value] }));

/** National emergency numbers; the same everywhere in Việt Nam. */
export const NATIONAL_EMERGENCY_NUMBERS = [
  { number: "115", label: "Cấp cứu y tế" },
  { number: "114", label: "Cứu hoả, cứu nạn" },
  { number: "113", label: "Công an" },
] as const;

/** BR: VitalCare points the way to help; it does not send it. */
export const NOT_AN_EMERGENCY_SERVICE =
  "VitalCare không phải dịch vụ cấp cứu. Trong tình huống nguy hiểm đến tính mạng, hãy gọi 115 ngay.";

/** Under every piece of guidance (SRS 3.17.2). */
export const GUIDANCE_DISCLAIMER =
  "Hướng dẫn tham khảo, không dùng để chẩn đoán hoặc thay thế chăm sóc y tế.";

/**
 * The guidance body, read into blocks. The text is plain, with three marks:
 * `## ` starts a heading, `1. ` a numbered step, `- ` a bullet. Anything
 * else is a paragraph; a blank line ends one. Nothing is ever read as HTML.
 */
export type GuidanceBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "steps"; items: string[] }
  | { kind: "bullets"; items: string[] };

export function parseGuidance(body: string): GuidanceBlock[] {
  const blocks: GuidanceBlock[] = [];
  // A blank line closes whatever block is open; the next line starts a new one.
  let open = false;
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    const last = open ? blocks.at(-1) : undefined;
    if (!line) {
      open = false;
      continue;
    }
    open = true;
    if (line.startsWith("## ")) {
      blocks.push({ kind: "heading", text: line.slice(3).trim() });
    } else if (/^\d+[.)]\s+/.test(line)) {
      const item = line.replace(/^\d+[.)]\s+/, "");
      if (last?.kind === "steps") last.items.push(item);
      else blocks.push({ kind: "steps", items: [item] });
    } else if (/^[-*•]\s+/.test(line)) {
      const item = line.replace(/^[-*•]\s+/, "");
      if (last?.kind === "bullets") last.items.push(item);
      else blocks.push({ kind: "bullets", items: [item] });
    } else if (last?.kind === "paragraph") {
      last.text = `${last.text} ${line}`;
    } else {
      blocks.push({ kind: "paragraph", text: line });
    }
  }
  return blocks;
}
