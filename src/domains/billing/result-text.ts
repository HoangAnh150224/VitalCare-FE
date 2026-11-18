/**
 * A service's result as the technician types it, read back in parts: the
 * measured indicators as rows of a table, the conclusion, and the rest as the
 * description. Nothing is stored this way — it is plain text — so a result
 * typed freely still reads, as description only.
 *
 * An indicator is a bulleted line, `• Name: value unit (reference)`, several on
 * one line split by ` · `; `↑` / `↓` after the value marks it out of range.
 * The conclusion is the line starting `Kết luận:`.
 */
export type ResultIndicator = {
  name: string;
  value: string;
  unit: string;
  reference: string;
  /** Out of range, as the technician marked it. */
  flag: "high" | "low" | null;
};

export type ParsedResult = {
  description: string[];
  indicators: ResultIndicator[];
  conclusion: string | null;
};

const BULLET = /^[•\-+*]\s*/;
const CONCLUSION = /^kết luận\s*:\s*/i;
const NUMBER = /^[<>≤≥]?\s*[−-]?\d[\d.,]*(\s*[/–-]\s*\d[\d.,]*)?/;

function indicator(part: string): ResultIndicator | null {
  const match = /^([^:]{1,120}):\s*(.+)$/.exec(part.trim());
  if (!match) return null;
  const name = match[1].trim();
  let rest = match[2].trim();
  let reference = "";
  const ref = /\(([^()]*)\)\s*$/.exec(rest);
  if (ref) {
    reference = ref[1].trim();
    rest = rest.slice(0, ref.index).trim();
  }
  const flag = rest.includes("↑") ? "high" : rest.includes("↓") ? "low" : null;
  rest = rest.replace(/[↑↓]/g, "").trim();
  const number = NUMBER.exec(rest);
  // "Kết luận"-like free text after a colon is not a measurement.
  if (!number) return null;
  return { name, value: number[0].trim(), unit: rest.slice(number[0].length).trim(), reference, flag };
}

export function parseResult(text: string | null | undefined): ParsedResult {
  const parsed: ParsedResult = { description: [], indicators: [], conclusion: null };
  for (const raw of (text ?? "").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (CONCLUSION.test(line)) {
      parsed.conclusion = line.replace(CONCLUSION, "");
      continue;
    }
    if (BULLET.test(line)) {
      const parts = line.replace(BULLET, "").split(" · ").map(indicator);
      if (parts.every((part): part is ResultIndicator => part != null)) {
        parsed.indicators.push(...parts);
        continue;
      }
    }
    parsed.description.push(line);
  }
  return parsed;
}
