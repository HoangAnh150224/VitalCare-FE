import type { HttpError } from "@refinedev/core";
import { useShow } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useTable } from "@refinedev/react-table";
import { useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import React from "react";
import type { Control } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router";

import { kyInstance } from "@/shared/api/data";
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
import {
  CreateView,
  CreateViewHeader,
} from "@/shared/components/views/create-view";
import { EditView, EditViewHeader } from "@/shared/components/views/edit-view";
import { ShowView, ShowViewHeader } from "@/shared/components/views/show-view";
import {
  DetailList,
  DetailPanel,
  DetailRow,
  EmptyValue,
} from "@/shared/components/views/record-detail";
import {
  FormSection,
  FormSectionActions,
  SectionedFormPanel,
} from "@/shared/components/form/form-section";
import { EditButton } from "@/shared/components/buttons/edit";
import { ShowButton } from "@/shared/components/buttons/show";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { formatDateTime } from "@/shared/lib/format";
import {
  METRIC_LABELS,
  METRIC_OPTIONS,
  METRIC_UNITS,
  OPERATOR_OPTIONS,
  SEVERITY_LABELS,
  SEVERITY_OPTIONS,
  SEVERITY_VARIANTS,
  condition,
  type AlertRule,
  type Metric,
  type Operator,
  type Severity,
} from "@/domains/alerts/types";

const FILTER_FIELDS: AdvancedFilterField[] = [
  {
    field: "scope",
    label: "Áp dụng cho",
    type: "select",
    options: [
      { value: "clinic", label: "Toàn cơ sở" },
      { value: "patient", label: "Riêng bệnh nhân" },
    ],
  },
  { field: "metric", label: "Chỉ số", type: "select", options: METRIC_OPTIONS },
  {
    field: "severity",
    label: "Mức độ",
    type: "select",
    options: SEVERITY_OPTIONS,
  },
];

/** Alert Rule List (FE-05): the clinic's rules and patients' own. */
export const AlertRuleList = () => {
  const columns = React.useMemo(() => {
    const col = createColumnHelper<AlertRule>();
    return [
      col.accessor("name", {
        id: "name",
        header: "Tên quy tắc",
        cell: ({ row }) => (
          <Link
            to={`/alert-rules/show/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      }),
      col.display({
        id: "condition",
        header: "Điều kiện",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {condition(
              row.original.metric,
              row.original.operator,
              row.original.threshold
            )}
          </span>
        ),
      }),
      col.accessor("severity", {
        id: "severity",
        header: "Mức độ",
        cell: ({ getValue }) => (
          <Badge variant={SEVERITY_VARIANTS[getValue()]}>
            {SEVERITY_LABELS[getValue()]}
          </Badge>
        ),
      }),
      col.display({
        id: "scope",
        header: "Áp dụng cho",
        cell: ({ row }) =>
          row.original.patient ? (
            <Link
              to={`/vital-signs/patient/${row.original.patient.id}`}
              className="hover:underline"
            >
              {row.original.patient.fullName}
            </Link>
          ) : (
            <span className="text-muted-foreground">Toàn cơ sở</span>
          ),
      }),
      col.accessor("enabled", {
        id: "enabled",
        header: "Bật",
        cell: ({ getValue }) =>
          getValue() ? (
            <Badge variant="success">Đang bật</Badge>
          ) : (
            <Badge variant="neutral">Tắt</Badge>
          ),
      }),
      col.display({
        id: "actions",
        header: "Thao tác",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex gap-1">
            <EditButton
              resource="alert_rules"
              recordItemId={row.original.id}
              iconOnly
              size="icon-sm"
            />
            <ShowButton
              resource="alert_rules"
              recordItemId={row.original.id}
              iconOnly
              size="icon-sm"
            />
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
    refineCoreProps: { resource: "alert_rules", syncWithLocation: true },
  });

  return (
    <ListView>
      <ListViewHeader
        resource="alert_rules"
        description="Ngưỡng sinh hiệu làm phát sinh cảnh báo. Quy tắc riêng của một bệnh nhân thay cho quy tắc chung của cơ sở với cùng chỉ số và chiều (trên/dưới)."
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

type RuleValues = {
  name: string;
  metric: Metric;
  operator: Operator;
  threshold: string;
  severity: Severity;
  enabled: boolean;
  note: string;
  customerId?: number | null;
};

const SelectField = ({
  control,
  name,
  label,
  options,
}: {
  control: Control<RuleValues>;
  name: "metric" | "operator" | "severity";
  label: string;
  options: { value: string; label: string }[];
}) => (
  <FormField
    control={control}
    name={name}
    rules={{ required: `Chọn ${label.toLowerCase()}` }}
    render={({ field }) => (
      <FormItem className="md:col-span-2">
        <FormLabel>{label}</FormLabel>
        <Select value={field.value} onValueChange={field.onChange}>
          <FormControl>
            <SelectTrigger className="w-full" aria-label={label}>
              <SelectValue placeholder={label} />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )}
  />
);

function RuleFields({
  control,
  metric,
  patientName,
}: {
  control: Control<RuleValues>;
  metric: Metric;
  patientName?: string | null;
}) {
  return (
    <FormSection
      title="Quy tắc"
      description={
        patientName
          ? `Quy tắc riêng của ${patientName}: thay cho quy tắc chung của cơ sở với cùng chỉ số và chiều.`
          : "Quy tắc chung, áp dụng cho mọi bệnh nhân của cơ sở."
      }
    >
      <FormField
        control={control}
        name="name"
        rules={{
          required: "Nhập tên quy tắc",
          maxLength: { value: 255, message: "Tối đa 255 ký tự" },
        }}
        render={({ field }) => (
          <FormItem className="md:col-span-6">
            <FormLabel>Tên quy tắc</FormLabel>
            <FormControl>
              <Input {...field} placeholder="VD: SpO₂ rất thấp" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <SelectField
        control={control}
        name="metric"
        label="Chỉ số"
        options={METRIC_OPTIONS}
      />
      <SelectField
        control={control}
        name="operator"
        label="Điều kiện"
        options={OPERATOR_OPTIONS}
      />
      <FormField
        control={control}
        name="threshold"
        rules={{
          required: "Nhập ngưỡng",
          validate: (v) =>
            Number.isFinite(Number(v)) ? true : "Ngưỡng phải là số",
        }}
        render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>Ngưỡng ({METRIC_UNITS[metric].trim()})</FormLabel>
            <FormControl>
              <Input {...field} inputMode="decimal" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <SelectField
        control={control}
        name="severity"
        label="Mức độ"
        options={SEVERITY_OPTIONS}
      />
      <FormField
        control={control}
        name="enabled"
        render={({ field }) => (
          <FormItem className="flex items-center gap-2 md:col-span-4">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={(v) => field.onChange(v === true)}
              />
            </FormControl>
            <FormLabel className="!mt-0">Đang bật</FormLabel>
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="note"
        render={({ field }) => (
          <FormItem className="md:col-span-6">
            <FormLabel>Ghi chú</FormLabel>
            <FormControl>
              <Textarea {...field} rows={3} />
            </FormControl>
            <FormDescription>
              Căn cứ chuyên môn, hoặc vì sao bệnh nhân này cần ngưỡng riêng.
            </FormDescription>
          </FormItem>
        )}
      />
    </FormSection>
  );
}

const toBody = (v: RuleValues) => ({ ...v, threshold: Number(v.threshold) });

/** Alert Rule Create: clinic-wide, or `?customerId=` for a patient's own. */
export const AlertRuleCreate = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const customerId = Number(params.get("customerId")) || null;
  const { data: patient } = useQuery({
    queryKey: ["vital_signs", "patient", customerId],
    queryFn: () =>
      kyInstance
        .get(`vital_signs/patients/${customerId}`)
        .json<{ fullName: string }>(),
    enabled: customerId != null,
  });
  const {
    refineCore: { onFinish },
    ...form
  } = useForm<RuleValues, HttpError, RuleValues>({
    refineCoreProps: { resource: "alert_rules", redirect: "show" },
    defaultValues: {
      name: "",
      metric: "SPO2",
      operator: "BELOW",
      threshold: "",
      severity: "WARNING",
      enabled: true,
      note: "",
      customerId,
    },
  });
  const metric = form.watch("metric");

  return (
    <CreateView>
      <CreateViewHeader
        resource="alert_rules"
        title={customerId ? "Thêm quy tắc riêng" : undefined}
      />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((v) =>
            onFinish(toBody({ ...v, customerId }) as unknown as RuleValues)
          )}
          className="min-w-0"
        >
          <SectionedFormPanel>
            <RuleFields
              control={form.control}
              metric={metric}
              patientName={customerId ? patient?.fullName ?? "bệnh nhân" : null}
            />
            <FormSectionActions>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Đang lưu..." : "Tạo quy tắc"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
              >
                Hủy
              </Button>
            </FormSectionActions>
          </SectionedFormPanel>
        </form>
      </Form>
    </CreateView>
  );
};

/** Alert Rule Update. */
export const AlertRuleEdit = () => {
  const navigate = useNavigate();
  const {
    refineCore: { onFinish, query },
    ...form
  } = useForm<RuleValues, HttpError, RuleValues>({
    refineCoreProps: {
      resource: "alert_rules",
      redirect: "show",
      action: "edit",
    },
  });
  const rule = query?.data?.data as AlertRule | undefined;
  const metric = form.watch("metric") ?? "SPO2";

  return (
    <EditView>
      <EditViewHeader resource="alert_rules" />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((v) =>
            onFinish(
              toBody({
                ...v,
                threshold: String(v.threshold),
              }) as unknown as RuleValues
            )
          )}
          className="min-w-0"
        >
          <SectionedFormPanel>
            <RuleFields
              control={form.control}
              metric={metric}
              patientName={rule?.patient?.fullName ?? null}
            />
            <FormSectionActions>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
              >
                Hủy
              </Button>
            </FormSectionActions>
          </SectionedFormPanel>
        </form>
      </Form>
    </EditView>
  );
};

/** Alert Rule Details. */
export const AlertRuleShow = () => {
  const { result: rule } = useShow<AlertRule>({ resource: "alert_rules" });
  return (
    <ShowView>
      <ShowViewHeader
        resource="alert_rules"
        title={rule?.name ?? "Quy tắc cảnh báo"}
      />
      <DetailPanel title="Quy tắc">
        <DetailList>
          <DetailRow label="Điều kiện">
            {rule ? (
              condition(rule.metric, rule.operator, rule.threshold)
            ) : (
              <EmptyValue />
            )}
          </DetailRow>
          <DetailRow label="Mức độ">
            {rule ? (
              <Badge variant={SEVERITY_VARIANTS[rule.severity]}>
                {SEVERITY_LABELS[rule.severity]}
              </Badge>
            ) : (
              <EmptyValue />
            )}
          </DetailRow>
          <DetailRow label="Áp dụng cho">
            {rule?.patient ? (
              <Link
                to={`/vital-signs/patient/${rule.patient.id}`}
                className="hover:underline"
              >
                {rule.patient.fullName}
              </Link>
            ) : (
              "Toàn cơ sở"
            )}
          </DetailRow>
          <DetailRow label="Chỉ số">
            {rule ? METRIC_LABELS[rule.metric] : <EmptyValue />}
          </DetailRow>
          <DetailRow label="Trạng thái">
            {rule ? rule.enabled ? "Đang bật" : "Đang tắt" : <EmptyValue />}
          </DetailRow>
          <DetailRow label="Ghi chú">{rule?.note ?? <EmptyValue />}</DetailRow>
          <DetailRow label="Cập nhật">
            {formatDateTime(rule?.updatedAt)}
          </DetailRow>
        </DetailList>
      </DetailPanel>
    </ShowView>
  );
};
