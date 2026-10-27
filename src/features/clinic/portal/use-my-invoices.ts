import { useCustom } from "@refinedev/core";

import { API_URL } from "@/shared/api/constants";
import { customResult } from "@/shared/hooks/use-custom-result";
import type { Invoice } from "@/domains/billing/types";

/** The account's bills: the owner's and relatives', newest first, each with its payments. */
export function useMyInvoices() {
  const { result, query } = useCustom<Invoice[]>({ url: `${API_URL}/my_invoices`, method: "get" });
  return { invoices: customResult(result?.data, "length") ?? [], query };
}
