import { useCan, useList } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import React from "react";
import { Outlet } from "react-router";

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
import { Badge } from "@/shared/ui/badge";
import { EditButton } from "@/shared/components/buttons/edit";
import { ShowButton } from "@/shared/components/buttons/show";
import { DeleteButton } from "@/shared/components/buttons/delete";
import { CloneButton } from "@/shared/components/buttons/clone";
import type { ComponentProps } from "react";
import { LOCALE } from "@/shared/lib/format";

type BlogPost = {
  id: string;
  title: string;
  content: string;
  status: string;
  createdAt: string;
  category: { id: string; title: string };
};

/**
 * The seed data carries a `rejected` status the API has no enum for, so this
 * is keyed on the wire string with a neutral fallback rather than a `Record`
 * over a union — an unmapped value gets a grey chip instead of a crash.
 */
const BLOG_STATUS_VARIANTS: Record<
  string,
  ComponentProps<typeof Badge>["variant"]
> = {
  published: "success",
  draft: "neutral",
  rejected: "destructive",
};

/** Display text for each wire status; an unmapped one falls back to the raw string. */
const BLOG_STATUS_LABELS: Record<string, string> = {
  published: "Đã xuất bản",
  draft: "Bản nháp",
  rejected: "Bị từ chối",
};

export const BlogPostList = () => {
  // Reading blog posts and reading categories are separate grants, so a role
  // can hold one without the other. Asking anyway would spend a request on a
  // guaranteed 403 and raise an error toast on every visit, for a filter that
  // could not be populated either way — so the lookup is gated and the filter
  // field drops out below. Same pattern as the notification bell.
  const { data: canReadCategories } = useCan({
    resource: "categories",
    action: "list",
  });
  const mayReadCategories = canReadCategories?.can ?? false;

  // Every category, for the options of the category filter. The list rows
  // themselves do not need this: each post already carries its category.
  const {
    result: { data: categories },
    query: { isLoading: categoryIsLoading },
  } = useList({
    resource: "categories",
    pagination: {
      currentPage: 1,
      pageSize: 999,
    },
    queryOptions: {
      enabled: mayReadCategories,
    },
  });

  const columns = React.useMemo(() => {
    const columnHelper = createColumnHelper<BlogPost>();

    return [
      columnHelper.accessor("id", {
        id: "id",
        header: "ID",
        enableSorting: false,
        size: 90,
        minSize: 60,
      }),
      columnHelper.accessor("title", {
        id: "title",
        header: "Tiêu đề",
        enableSorting: true,
        enableResizing: true,
        size: 240,
      }),
      columnHelper.accessor("content", {
        id: "content",
        header: "Nội dung",
        enableSorting: false,
        enableResizing: true,
        size: 320,
        cell: ({ getValue }) => {
          const content = getValue();
          if (!content) return "-";
          // No `max-w-*` here: the cell has to follow the column width, which
          // is now the user's to set.
          return <div className="truncate">{content.slice(0, 80)}...</div>;
        },
      }),
      columnHelper.accessor("category.title", {
        id: "category",
        header: "Danh mục",
        enableSorting: false,
        enableResizing: true,
        size: 200,
        // The API nests the whole category on every post, so the title is
        // already here — no second lookup against the categories list.
        cell: ({ getValue }) => getValue() || "-",
      }),
      columnHelper.accessor("status", {
        id: "status",
        header: "Trạng thái",
        enableSorting: true,
        size: 130,
        cell: ({ getValue }) => {
          const status = getValue();
          return (
            <Badge variant={BLOG_STATUS_VARIANTS[status] ?? "neutral"} dot>
              {BLOG_STATUS_LABELS[status] ??
                status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("createdAt", {
        id: "createdAt",
        header: "Ngày tạo",
        enableSorting: true,
        size: 150,
        cell: ({ getValue }) => {
          const date = getValue();
          return date ? new Date(date).toLocaleDateString(LOCALE) : "-";
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "Thao tác",
        // Icon-only: four labelled buttons per row turned the widest column in
        // the table into the least informative one. Each button keeps its label
        // in a tooltip and in `aria-label`.
        cell: ({ row }) => (
          <div className="flex gap-1">
            <EditButton recordItemId={row.original.id} iconOnly size="icon-sm" />
            <ShowButton recordItemId={row.original.id} iconOnly size="icon-sm" />
            <CloneButton recordItemId={row.original.id} iconOnly size="icon-sm" />
            <DeleteButton
              recordItemId={row.original.id}
              iconOnly
              size="icon-sm"
            />
          </div>
        ),
        enableSorting: false,
        ...actionsColumnWidth(4),
      }),
    ];
  }, []);

  const advancedFilterFields = React.useMemo<AdvancedFilterField[]>(
    () => [
      { field: "id", label: "ID", type: "number", placeholder: "Bất kỳ" },
      { field: "title", label: "Tiêu đề", type: "text", placeholder: "Bất kỳ" },
      {
        field: "status",
        label: "Trạng thái",
        type: "select",
        placeholder: "Mọi trạng thái",
        options: [
          { label: "Bản nháp", value: "draft" },
          { label: "Đã xuất bản", value: "published" },
          { label: "Bị từ chối", value: "rejected" },
        ],
      },
      // Offered only to somebody who may read the catalogue it filters on. A
      // select with no options is a control that looks broken rather than one
      // that explains itself.
      ...(mayReadCategories
        ? [
            {
              field: "category.id",
              label: "Danh mục",
              type: "select" as const,
              placeholder: categoryIsLoading ? "Đang tải..." : "Mọi danh mục",
              options:
                categories?.map((item) => ({
                  label: String(item.title),
                  value: String(item.id),
                })) ?? [],
            },
          ]
        : []),
      {
        field: "createdAt",
        label: "Ngày tạo",
        type: "text",
        // The backend reads `_gte`/`_lte` as real bounds and `_like` as a bare
        // year, which it expands into a range over that year.
        operators: ["gte", "lte", "contains"],
        defaultOperator: "gte",
        placeholder: "2024-01-31 hoặc 2024",
        hint: "Nhập ngày (YYYY-MM-DD) để lọc theo mốc, hoặc chỉ nhập năm để khớp cả năm đó.",
      },
    ],
    [categories, categoryIsLoading, mayReadCategories]
  );

  const table = useTable({
    columns,
    // Drag the divider in the header to resize; double-click it to go back to
    // the column's default width.
    // Resizing is opt-in per column: `RESIZABLE_COLUMN_DEFAULTS` turns it off
    // by default and a column asks for a handle with `enableResizing: true`.
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    defaultColumn: RESIZABLE_COLUMN_DEFAULTS,
    // The row's actions are the cell somebody scrolls sideways *in order to*
    // reach, so they are the one cell that must not be what scrolls away.
    // `getCommonStyles` in `data-table.tsx` renders a pinned column sticky, but
    // only ever reads pinning state and never sets it, so a column stays where
    // it was declared until a table asks for this.
    //
    // Sticky positioning costs nothing while the table fits its card — the cell
    // never leaves its static position — so this is unconditional rather than
    // switched on once the table is measured to overflow.
    initialState: {
      columnPinning: { right: ["actions"] },
    },
    refineCoreProps: {
      syncWithLocation: true,
    },
  });

  return (
    <ListView>
      <ListViewHeader description="Các bài viết ở trạng thái bản nháp, đã xuất bản hoặc bị từ chối, kèm danh mục mà mỗi bài thuộc về." />
      <DataTable
        table={table}
        toolbar={
          <>
            <ListToolbar
              table={table}
              search={<DataTableQuickFilter table={table} />}
              filters={
                <DataTableAdvancedFilter
                  table={table}
                  fields={advancedFilterFields}
                />
              }
            />
            <DataTableFilterChips
              table={table}
              fields={advancedFilterFields}
            />
          </>
        }
      />
      {/*
        Create / edit / show / clone are nested routes (see `app/router/routes.tsx`) and
        render as dialogs over this list.
      */}
      <Outlet />
    </ListView>
  );
};
