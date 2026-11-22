import type { BaseRecord, CrudFilter, CrudSort, DataProvider } from "@refinedev/core";
import { toast } from "sonner";

/** The name of an export scope: the menu item and the file's "Phạm vi" line both read it, so they cannot drift apart. */
export const exportScopeLabel = (all: boolean) => all ? "Tất cả kết quả theo bộ lọc" : "Trang đang xem";

/** "Tất cả kết quả theo bộ lọc" stops here: a wider export is a filter to narrow, not a file to wait for. */
export const EXPORT_ROW_CAP = 10_000;

/** Every row the filters match, page by page, up to EXPORT_ROW_CAP; past it the user is told the file was cut. */
export async function fetchAllForExport<T extends BaseRecord>(provider: DataProvider, resource: string, filters: CrudFilter[], sorters: CrudSort[]): Promise<T[]> {
  const rows: T[] = [];
  for (let currentPage = 1; ; currentPage++) {
    const result = await provider.getList<T>({
      resource, filters, sorters,
      pagination: { currentPage, pageSize: 200, mode: "server" },
    });
    rows.push(...result.data);
    if (rows.length >= EXPORT_ROW_CAP && result.total > EXPORT_ROW_CAP) {
      toast.warning(`Chỉ xuất ${EXPORT_ROW_CAP.toLocaleString("vi-VN")} dòng đầu tiên trên tổng ${result.total.toLocaleString("vi-VN")}. Hãy thu hẹp bộ lọc để xuất đủ.`);
      return rows.slice(0, EXPORT_ROW_CAP);
    }
    if (!result.data.length || rows.length >= result.total) return rows;
  }
}
