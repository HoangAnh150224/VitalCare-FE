import { useTable } from "@refinedev/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import React from "react";

import {
  actionsColumnWidth,
  DataTable,
  RESIZABLE_COLUMN_DEFAULTS,
} from "@/shared/components/data-table/data-table";
import { DataTableQuickFilter } from "@/shared/components/data-table/data-table-quick-filter";
import {
  DataTableAdvancedFilter,
  DataTableFilterChips,
  type AdvancedFilterField,
} from "@/shared/components/data-table/data-table-advanced-filter";
import {
  ListToolbar,
  ListView,
  ListViewHeader,
} from "@/shared/components/views/list-view";
import { ShowButton } from "@/shared/components/buttons/show";
import { EditButton } from "@/shared/components/buttons/edit";
import type { FirstAidArticle } from "@/domains/first-aid/types";
import {
  FIRST_AID_CATEGORY_LABELS,
  FIRST_AID_CATEGORY_OPTIONS,
  FIRST_AID_STATUS_OPTIONS,
} from "@/domains/first-aid/types";
import { formatDateTime } from "@/shared/lib/format";
import { FirstAidStatusBadge, revisionLabel } from "./parts";

const FILTER_FIELDS: AdvancedFilterField[] = [
  {
    field: "status",
    label: "Trạng thái",
    type: "select",
    options: FIRST_AID_STATUS_OPTIONS,
  },
  {
    field: "category",
    label: "Danh mục",
    type: "select",
    options: FIRST_AID_CATEGORY_OPTIONS,
  },
];

/** SRS 3.17.4: every article in every state, most recently changed first. */
export const FirstAidList = () => {
  const columns = React.useMemo(() => {
    const col = createColumnHelper<FirstAidArticle>();
    return [
      col.accessor("title", {
        id: "title",
        header: "Tiêu đề",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.title}</span>
            <span className="text-muted-foreground line-clamp-1 text-xs">
              {row.original.summary}
            </span>
          </div>
        ),
      }),
      col.accessor("category", {
        id: "category",
        header: "Danh mục",
        enableSorting: false,
        cell: ({ getValue }) => FIRST_AID_CATEGORY_LABELS[getValue()],
      }),
      col.accessor("status", {
        id: "status",
        header: "Trạng thái",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-1">
            <FirstAidStatusBadge status={row.original.status} />
            {row.original.publishedRevision &&
              row.original.status !== "published" && (
                <span className="text-muted-foreground text-xs">
                  Đang hiển thị {revisionLabel(row.original.publishedRevision)}
                </span>
              )}
          </div>
        ),
      }),
      col.accessor("revision", {
        id: "revision",
        header: "Phiên bản",
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="tabular-nums">{revisionLabel(getValue())}</span>
        ),
      }),
      col.accessor("updatedAt", {
        id: "updatedAt",
        header: "Cập nhật gần nhất",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="tabular-nums">
              {formatDateTime(row.original.updatedAt)}
            </span>
            {row.original.authorName && (
              <span className="text-muted-foreground text-xs">
                {row.original.authorName}
              </span>
            )}
          </div>
        ),
      }),
      col.display({
        id: "actions",
        header: "Thao tác",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex gap-1">
            <ShowButton
              resource="first_aid_articles"
              recordItemId={row.original.id}
              iconOnly
              size="icon-sm"
            />
            {row.original.actions.includes("edit") && (
              <EditButton
                resource="first_aid_articles"
                recordItemId={row.original.id}
                iconOnly
                size="icon-sm"
              />
            )}
          </div>
        ),
        ...actionsColumnWidth(2),
      }),
    ];
  }, []);

  const table = useTable({
    columns,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    defaultColumn: RESIZABLE_COLUMN_DEFAULTS,
    initialState: { columnPinning: { right: ["actions"] } },
    refineCoreProps: { resource: "first_aid_articles", syncWithLocation: true },
  });

  return (
    <ListView>
      <ListViewHeader
        resource="first_aid_articles"
        description="Hướng dẫn sơ cứu cho bệnh nhân và người chăm sóc. Bài viết được người khác duyệt rồi mới xuất bản."
      />
      <DataTable
        table={table}
        toolbar={
          <>
            <ListToolbar
              table={table}
              search={<DataTableQuickFilter table={table} />}
              filters={
                <DataTableAdvancedFilter table={table} fields={FILTER_FIELDS} />
              }
            />
            <DataTableFilterChips table={table} fields={FILTER_FIELDS} />
          </>
        }
      />
    </ListView>
  );
};
