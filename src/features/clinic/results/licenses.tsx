import { useNotification } from "@refinedev/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { kyInstance } from "@/shared/api/data";
import { ListView, ListViewHeader } from "@/shared/components/views/list-view";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { formatLocalDate } from "@/shared/lib/format";
import {
  LICENSE_KIND_LABELS,
  resultsErrorText,
  VALIDITY_LABELS,
  VALIDITY_VARIANTS,
  type License,
  type LicenseKind,
} from "@/domains/results/types";
import { download, refusal, send } from "./send";

type Draft = {
  kind: LicenseKind;
  title: string;
  licenseNumber: string;
  issuer: string;
  issuedOn: string;
  expiresOn: string;
};
const EMPTY: Draft = { kind: "LICENSE", title: "", licenseNumber: "", issuer: "", issuedOn: "", expiresOn: "" };
const MAX_FILE = 10 * 1024 * 1024;

/** FE-17 Manage Own Professional License and Certificate. */
export const MyLicenses = () => {
  const queryClient = useQueryClient();
  const { open: notify } = useNotification();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileFor = useRef<number | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["my_licenses"],
    queryFn: () => kyInstance.get("my_licenses").json<License[]>(),
  });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["my_licenses"] });
  const save = useMutation({
    mutationFn: () => {
      const body = { ...draft, expiresOn: draft.expiresOn || null, issuedOn: draft.issuedOn || null };
      return editing === "new" ? send("post", "my_licenses", body) : send("put", `my_licenses/${editing}`, body);
    },
    onSuccess: () => {
      notify?.({ type: "success", message: "Đã lưu giấy phép" });
      setEditing(null);
      setDraft(EMPTY);
      setError(null);
      refresh();
    },
    onError: (e) => setError(resultsErrorText(refusal(e))),
  });
  const remove = useMutation({
    mutationFn: (id: number) => send("delete", `my_licenses/${id}`),
    onSuccess: () => {
      notify?.({ type: "success", message: "Đã xoá giấy phép" });
      refresh();
    },
    onError: (e) => notify?.({ type: "error", message: resultsErrorText(refusal(e)) }),
  });
  const upload = async (file: File) => {
    const id = fileFor.current;
    if (id == null) return;
    if (file.size > MAX_FILE) {
      notify?.({ type: "error", message: "File tối đa 10 MB." });
      return;
    }
    const body = new FormData();
    body.append("file", file);
    try {
      // The multipart boundary is only set once the instance's JSON default is taken off.
      await kyInstance.post(`my_licenses/${id}/file`, { body, headers: { "Content-Type": undefined } });
      notify?.({ type: "success", message: `Đã tải lên ${file.name}` });
      refresh();
    } catch (e) {
      notify?.({ type: "error", message: resultsErrorText(refusal(e)) });
    }
  };
  const startEdit = (l: License) => {
    setDraft({
      kind: l.kind,
      title: l.title,
      licenseNumber: l.licenseNumber,
      issuer: l.issuer,
      issuedOn: l.issuedOn,
      expiresOn: l.expiresOn ?? "",
    });
    setError(null);
    setEditing(l.id);
  };
  const field = (name: keyof Draft, label: string, type = "text") => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`license-${name}`}>{label}</Label>
      <Input
        id={`license-${name}`}
        type={type}
        value={draft[name]}
        onChange={(e) => setDraft({ ...draft, [name]: e.target.value })}
      />
    </div>
  );
  const rows = data ?? [];

  return (
    <ListView>
      <ListViewHeader
        resource="my_licenses"
        title="Giấy phép của tôi"
        description="Chứng chỉ hành nghề và các chứng nhận chuyên môn, kèm bản scan."
        canCreate={false}
        actions={
          editing == null && (
            <Button
              onClick={() => {
                setDraft(EMPTY);
                setError(null);
                setEditing("new");
              }}
            >
              Thêm giấy phép
            </Button>
          )
        }
      />
      <input
        ref={picker}
        type="file"
        accept="application/pdf,image/png,image/jpeg"
        className="hidden"
        data-testid="license-file"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
      {editing != null && (
        <Card className="gap-4 p-5" data-testid="license-form">
          <RadioGroup
            className="flex gap-6"
            value={draft.kind}
            onValueChange={(v) => setDraft({ ...draft, kind: v as LicenseKind })}
          >
            {(Object.keys(LICENSE_KIND_LABELS) as LicenseKind[]).map((k) => (
              <div key={k} className="flex items-center gap-2">
                <RadioGroupItem id={`kind-${k}`} value={k} />
                <Label htmlFor={`kind-${k}`}>{LICENSE_KIND_LABELS[k]}</Label>
              </div>
            ))}
          </RadioGroup>
          <div className="grid gap-3 sm:grid-cols-2">
            {field("title", "Tên giấy phép")}
            {field("licenseNumber", "Số hiệu")}
            {field("issuer", "Nơi cấp")}
            {field("issuedOn", "Ngày cấp", "date")}
            {field("expiresOn", "Ngày hết hạn (để trống nếu không thời hạn)", "date")}
          </div>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button disabled={save.isPending} onClick={() => save.mutate()}>
              Lưu
            </Button>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Huỷ
            </Button>
          </div>
        </Card>
      )}
      {!isLoading && rows.length === 0 && editing == null ? (
        <Card className="text-muted-foreground px-6 py-8 text-center text-sm">Bạn chưa thêm giấy phép nào.</Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((l) => (
            <Card key={l.id} className="gap-2 px-5 py-4" data-testid={`license-${l.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{l.title}</span>
                <Badge variant={VALIDITY_VARIANTS[l.validity]}>{VALIDITY_LABELS[l.validity]}</Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                {LICENSE_KIND_LABELS[l.kind]} · Số {l.licenseNumber} · {l.issuer}
              </p>
              <p className="text-muted-foreground text-sm tabular-nums">
                Cấp {formatLocalDate(l.issuedOn)} · {l.expiresOn ? `hết hạn ${formatLocalDate(l.expiresOn)}` : "không thời hạn"}
              </p>
              <div className="flex flex-wrap gap-2">
                {l.hasFile && (
                  <Button size="sm" variant="outline" onClick={() => void download(`my_licenses/${l.id}/file`, l.fileName ?? "giay-phep")}>
                    Tải {l.fileName}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    fileFor.current = l.id;
                    picker.current?.click();
                  }}
                >
                  {l.hasFile ? "Thay bản scan" : "Tải bản scan"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => startEdit(l)}>
                  Sửa
                </Button>
                <Button size="sm" variant="ghost" disabled={remove.isPending} onClick={() => remove.mutate(l.id)}>
                  Xoá
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </ListView>
  );
};

/** FE-17 for the clinic administrator: every licence on staff, the ones expiring within 60 days first. */
export const ClinicLicenses = () => {
  const [expiring, setExpiring] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["licenses", expiring],
    queryFn: () =>
      kyInstance.get("licenses", { searchParams: expiring ? { expiring: "true" } : {} }).json<License[]>(),
  });
  const rows = data ?? [];
  return (
    <ListView>
      <ListViewHeader
        resource="licenses"
        title="Chứng chỉ hành nghề"
        description="Chứng chỉ hành nghề của nhân viên tại cơ sở; sắp hết hạn là còn tối đa 60 ngày."
        canCreate={false}
      />
      <div className="flex gap-1">
        <Button size="sm" variant={expiring ? "outline" : "default"} onClick={() => setExpiring(false)}>
          Tất cả
        </Button>
        <Button size="sm" variant={expiring ? "default" : "outline"} onClick={() => setExpiring(true)}>
          Sắp hết hạn / hết hạn
        </Button>
      </div>
      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nhân viên</TableHead>
              <TableHead>Chứng chỉ hành nghề</TableHead>
              <TableHead>Số hiệu</TableHead>
              <TableHead>Hết hạn</TableHead>
              <TableHead>Hiệu lực</TableHead>
              <TableHead className="text-right">Bản scan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                  Không có chứng chỉ hành nghề nào.
                </TableCell>
              </TableRow>
            )}
            {rows.map((l) => (
              <TableRow key={l.id} data-testid={`clinic-license-${l.id}`}>
                <TableCell>{l.holderName ?? "—"}</TableCell>
                <TableCell>
                  {l.title}
                  <span className="text-muted-foreground block text-xs">{LICENSE_KIND_LABELS[l.kind]}</span>
                </TableCell>
                <TableCell className="tabular-nums">{l.licenseNumber}</TableCell>
                <TableCell className="tabular-nums">{l.expiresOn ? formatLocalDate(l.expiresOn) : "Không thời hạn"}</TableCell>
                <TableCell>
                  <Badge variant={VALIDITY_VARIANTS[l.validity]}>{VALIDITY_LABELS[l.validity]}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {l.hasFile ? (
                    <Button size="sm" variant="outline" onClick={() => void download(`licenses/${l.id}/file`, l.fileName ?? "giay-phep")}>
                      Tải
                    </Button>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </ListView>
  );
};
