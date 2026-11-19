import type { HttpError } from "@refinedev/core";
import { useShow } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useTable } from "@refinedev/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import React from "react";
import { LockKeyhole, LockKeyholeOpen } from "lucide-react";
import { toast } from "sonner";
import type { Control, UseFormSetError } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router";

import { kyInstance } from "@/shared/api/data";
import {
  actionsColumnWidth,
  DataTable,
  RESIZABLE_COLUMN_DEFAULTS,
} from "@/shared/components/data-table/data-table";
import { DataTableQuickFilter } from "@/shared/components/data-table/data-table-quick-filter";
import { ExcelTableExport } from "@/shared/components/data-table/excel-export";
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
  OPERATOR_LABELS,
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

function RulePauseButton({ rule }: { rule: AlertRule }) {
  const queryClient = useQueryClient();
  const toggle = useMutation({
    mutationFn: () => kyInstance.patch(`alert_rules/${rule.id}`, {
      json: {
        name: rule.name,
        metric: rule.metric,
        operator: rule.operator,
        threshold: Number(rule.threshold),
        severity: rule.severity,
        enabled: !rule.enabled,
        note: rule.note?.trim() || "Tạm ngưng/mở lại quy tắc cảnh báo",
      },
    }).json(),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success(rule.enabled ? "Đã tạm ngưng quy tắc" : "Đã mở lại quy tắc");
    },
    onError: () => toast.error("Không đổi được trạng thái quy tắc. Hãy kiểm tra quyền hoặc kết nối máy chủ."),
  });
  const label = rule.enabled ? "Tạm ngưng quy tắc" : "Mở lại quy tắc";
  return (
    <Button type="button" size="icon-sm" variant="ghost" disabled={toggle.isPending}
      onClick={(event) => { event.stopPropagation(); toggle.mutate(); }} aria-label={label} title={label}>
      {rule.enabled ? <LockKeyhole className="size-4" /> : <LockKeyholeOpen className="size-4" />}
    </Button>
  );
}

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
            <Badge variant="neutral">Tạm ngưng</Badge>
          ),
      }),
      col.display({
        id: "actions",
        header: "Thao tác",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex gap-1">
            <RulePauseButton rule={row.original} />
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
              exportAction={<ExcelTableExport<AlertRule>
                table={table}
                resource="alert_rules"
                title="Quy tắc cảnh báo"
                columns={[
                  { label: "Tên quy tắc", width: 36, value: (r) => r.name },
                  { label: "Chỉ số", width: 24, value: (r) => METRIC_LABELS[r.metric] },
                  { label: "Điều kiện", width: 16, value: (r) => OPERATOR_LABELS[r.operator] },
                  { label: "Ngưỡng", width: 14, value: (r) => Number(r.threshold) },
                  { label: "Đơn vị", width: 12, value: (r) => METRIC_UNITS[r.metric].trim() },
                  { label: "Mức độ", width: 18, value: (r) => SEVERITY_LABELS[r.severity] },
                  { label: "Phạm vi áp dụng", width: 24, value: (r) => r.patient ? "Riêng bệnh nhân" : "Toàn cơ sở" },
                  { label: "Mã bệnh nhân", width: 22, value: (r) => r.patient?.customerCode ?? "—" },
                  { label: "Tên bệnh nhân", width: 30, value: (r) => r.patient?.fullName ?? "—" },
                  { label: "Trạng thái", width: 18, value: (r) => r.enabled ? "Đang bật" : "Đã tắt" },
                  { label: "Ghi chú", width: 48, value: (r) => r.note ?? "—" },
                  { label: "Cập nhật gần nhất", width: 27, value: (r) => r.updatedAt ? formatDateTime(r.updatedAt) : "—" },
                ]}
              />}
              search={<DataTableQuickFilter table={table} placeholder="Tìm theo tên quy tắc cảnh báo..." />}
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

/** A Vietnamese keyboard types "38,5": the comma is read as the decimal point. */
const toThreshold = (v: unknown) =>
  Number(String(v ?? "").trim().replace(",", "."));

/** The API's English field refusals (AlertRules), in Vietnamese. */
const FIELD_MESSAGES: Record<string, string> = {
  "Choose heart rate, SpO2, skin or body temperature": "Chọn nhịp tim, SpO2, nhiệt độ da hoặc nhiệt độ cơ thể.",
  "Choose below or above": "Chọn điều kiện thấp hơn hoặc cao hơn.",
  "Choose warning or critical": "Chọn mức cảnh báo hoặc nguy cấp.",
};

/**
 * Refine has already put the API's English refusal under the field; it is
 * said again in Vietnamese in its place.
 */
const translateThresholdError = (
  error: HttpError,
  setError: UseFormSetError<RuleValues>
) => {
  const range = /^Between (\S+) and (\S+) for this measure/.exec(
    String(error?.errors?.threshold ?? "")
  );
  if (range) {
    setError("threshold", {
      type: "server",
      message: `Ngưỡng phải nằm trong khoảng ${range[1]} đến ${range[2]} cho chỉ số này.`,
    });
  }
  for (const name of ["metric", "operator", "severity"] as const) {
    const vi = FIELD_MESSAGES[String(error?.errors?.[name] ?? "")];
    if (vi) setError(name, { type: "server", message: vi });
  }
};

/**
 * A refused field is said under that field, not again in a toast (RULE-35).
 * `clinicId` has no field here: a system administrator, who belongs to no
 * clinic, is told so instead of a button that seems to do nothing.
 */
const ruleErrorNotification = (error?: HttpError) =>
  error?.statusCode === 422 && !error.errors?.clinicId
    ? false
    : {
        type: "error" as const,
        message: error?.errors?.clinicId
          ? "Quy tắc thuộc về một phòng khám. Đăng nhập bằng tài khoản quản trị phòng khám để tạo quy tắc."
          : "Không lưu được quy tắc. Vui lòng thử lại.",
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
        <FormLabel>{label} <span className="text-destructive">*</span></FormLabel>
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
          validate: (v) => !!v.trim() || "Vui lòng nhập tên quy tắc",
          maxLength: { value: 255, message: "Tối đa 255 ký tự" },
        }}
        render={({ field }) => (
          <FormItem className="md:col-span-6">
            <FormLabel>Tên quy tắc <span className="text-destructive">*</span></FormLabel>
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
            String(v ?? "").trim() !== "" && Number.isFinite(toThreshold(v)) ? true : "Vui lòng nhập ngưỡng hợp lệ",
        }}
        render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>Ngưỡng ({METRIC_UNITS[metric].trim()}) <span className="text-destructive">*</span></FormLabel>
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
        rules={{ validate: (v) => typeof v === "boolean" || "Vui lòng chọn trạng thái" }}
        render={({ field }) => (
          <FormItem className="flex items-center gap-2 md:col-span-4">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={(v) => field.onChange(v === true)}
              />
            </FormControl>
            <FormLabel className="!mt-0">Đang bật <span className="text-destructive">*</span></FormLabel>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="note"
        rules={{ required: "Vui lòng nhập ghi chú", validate: (v) => !!v?.trim() || "Vui lòng nhập ghi chú", maxLength: { value: 1000, message: "Tối đa 1000 ký tự" } }}
        render={({ field }) => (
          <FormItem className="md:col-span-6">
            <FormLabel>Ghi chú <span className="text-destructive">*</span></FormLabel>
            <FormControl>
              <Textarea {...field} value={field.value ?? ""} rows={3} placeholder="Nhập căn cứ hoặc lý do thiết lập quy tắc" aria-required="true" />
            </FormControl>
            <FormDescription>
              Căn cứ chuyên môn, hoặc vì sao bệnh nhân này cần ngưỡng riêng.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormSection>
  );
}

const toBody = (v: RuleValues) => ({ ...v, threshold: toThreshold(v.threshold) });

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
    refineCoreProps: {
      resource: "alert_rules",
      redirect: "show",
      errorNotification: ruleErrorNotification,
      onMutationError: (error) => translateThresholdError(error, form.setError),
    },
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
      errorNotification: ruleErrorNotification,
      onMutationError: (error) => translateThresholdError(error, form.setError),
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
