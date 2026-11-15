import { ArrowLeftIcon, EyeIcon } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
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
import { LicenseScan } from "./license-scan";

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

export const ClinicLicenseShow = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { open: notify } = useNotification();
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["licenses"],
    queryFn: () => kyInstance.get("licenses").json<License[]>(),
  });
  const selected = data?.find((license) => String(license.id) === id);
  const downloadScan = async () => {
    if (!selected) return;
    try { await download(`licenses/${selected.id}/file`, selected.fileName ?? "chung-chi"); }
    catch { notify?.({ type: "error", message: "Không tải được bản scan. Vui lòng thử lại." }); }
  };
  return <ListView>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Quay lại danh sách" title="Quay lại danh sách" onClick={() => navigate("/licenses")}><ArrowLeftIcon className="size-5" /></Button>
        <h1 className="text-2xl font-semibold">Chi tiết chứng chỉ hành nghề</h1>
      </div>
      <Button variant="outline" disabled={isFetching} onClick={() => void refetch()}>Làm mới</Button>
    </div>
    <Card className="p-6 sm:p-8">
      {isLoading ? <p role="status">Đang tải chứng chỉ...</p> : isError ? <p role="alert">Không tải được chứng chỉ. Vui lòng thử lại.</p> : !selected ? <p role="alert">Không tìm thấy chứng chỉ hoặc bạn không có quyền xem chứng chỉ này.</p> : <>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-5">
          <h2 className="text-xl font-semibold">{selected.title}</h2>
          <Badge variant={VALIDITY_VARIANTS[selected.validity]}>{VALIDITY_LABELS[selected.validity]}</Badge>
        </div>
        <dl className="grid gap-x-8 gap-y-6 py-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Người sở hữu", selected.holderName ?? "—"],
            ["Loại chứng chỉ", LICENSE_KIND_LABELS[selected.kind]],
            ["Số hiệu", selected.licenseNumber],
            ["Nơi cấp", selected.issuer],
            ["Ngày cấp", formatLocalDate(selected.issuedOn)],
            ["Ngày hết hạn", selected.expiresOn ? formatLocalDate(selected.expiresOn) : "Không thời hạn"],
            ["Bản scan", selected.fileName ?? "Chưa có bản scan"],
          ].map(([label, value]) => <div key={label}><dt className="mb-2 text-sm text-muted-foreground">{label}</dt><dd className="break-words font-medium">{value}</dd></div>)}
        </dl>
        <p className="text-sm text-muted-foreground">Chứng chỉ sắp hết hạn khi còn tối đa 60 ngày.</p>
        {selected.hasFile && <div className="flex flex-wrap gap-2 border-t pt-5"><LicenseScan url={`licenses/${selected.id}/file`} name={selected.fileName} /><Button size="sm" variant="outline" onClick={() => void downloadScan()}>Tải bản scan</Button></div>}
      </>}
    </Card>
  </ListView>;
};

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
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["my_licenses"] });
    void queryClient.invalidateQueries({ queryKey: ["licenses"] });
  };
  const save = useMutation({
    mutationFn: () => {
      const body = { ...draft, expiresOn: draft.expiresOn || null, issuedOn: draft.issuedOn || null };
      return editing === "new" ? send("post", "my_licenses", body) : send("put", `my_licenses/${editing}`, body);
    },
    onSuccess: () => {
      notify?.({ type: "success", message: "Đã lưu chứng chỉ" });
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
      notify?.({ type: "success", message: "Đã xoá chứng chỉ" });
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
      <Label htmlFor={`license-${name}`}>{label}{name !== "expiresOn" && <span className="text-destructive"> *</span>}</Label>
      <Input
        id={`license-${name}`}
        type={type}
        required={name !== "expiresOn"}
        placeholder={type === "text" ? `Nhập ${label.toLowerCase()}` : undefined}
        maxLength={name === "licenseNumber" ? 64 : type === "text" ? 255 : undefined}
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
        title="Chứng chỉ của tôi"
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
              Thêm chứng chỉ
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
            {field("title", "Tên chứng chỉ")}
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
            <Button disabled={save.isPending} onClick={() => {
              if (!draft.title.trim() || !draft.licenseNumber.trim() || !draft.issuer.trim() || !draft.issuedOn) {
                setError("Vui lòng nhập đầy đủ tên chứng chỉ, số hiệu, nơi cấp và ngày cấp.");
                return;
              }
              setError(null);
              save.mutate();
            }}>
              Lưu
            </Button>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Huỷ
            </Button>
          </div>
        </Card>
      )}
      {!isLoading && rows.length === 0 && editing == null ? (
        <Card className="text-muted-foreground px-6 py-8 text-center text-sm">Bạn chưa thêm chứng chỉ nào.</Card>
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
                {l.hasFile && <LicenseScan url={`my_licenses/${l.id}/file`} name={l.fileName} />}
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


/** Clinic administrators inspect certificates submitted by staff, without editing them. */
export const ClinicLicenses = () => {
  const [search, setSearch] = useState("");
  const [validity, setValidity] = useState("all");
  const [kind, setKind] = useState("all");
  const [scan, setScan] = useState("all");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["licenses"],
    queryFn: () => kyInstance.get("licenses").json<License[]>(),
  });
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
  const term = normalize(search.trim());
  const rows = (data ?? []).filter((l) =>
    (!term || normalize([l.holderName, l.title, l.licenseNumber, l.issuer].join(" ")).includes(term)) &&
    (validity === "all" || l.validity === validity) && (kind === "all" || l.kind === kind) &&
    (scan === "all" || l.hasFile === (scan === "yes")));
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  const currentPage = Math.min(page, pages);
  const visible = rows.slice((currentPage - 1) * 10, currentPage * 10);
  const filter = (value: string, change: (v: string) => void) => { change(value); setPage(1); };
  return (
    <ListView>
      <ListViewHeader resource="licenses" title="Chứng chỉ hành nghề" canCreate={false}
        description="Danh sách chứng chỉ do bác sĩ khai báo tại cơ sở. Tìm kiếm, theo dõi hiệu lực và xem hồ sơ chứng chỉ."
        actions={<Button variant="outline" disabled={isFetching} onClick={() => void refetch()}>Làm mới</Button>} />
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap gap-3 p-4">
          <Input className="min-w-64 flex-1" aria-label="Tìm chứng chỉ" placeholder="Tìm theo tên bác sĩ, chứng chỉ, số hiệu hoặc nơi cấp..." value={search} onChange={(e) => filter(e.target.value, setSearch)} />
          <Select value={validity} onValueChange={(v) => filter(v, setValidity)}><SelectTrigger aria-label="Hiệu lực" className="w-44"><SelectValue /></SelectTrigger><SelectContent>
            <SelectItem value="all">Tất cả hiệu lực</SelectItem>
            {Object.entries(VALIDITY_LABELS).map(([v, label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}
          </SelectContent></Select>
          <Select value={kind} onValueChange={(v) => filter(v, setKind)}><SelectTrigger aria-label="Loại chứng chỉ" className="w-52"><SelectValue /></SelectTrigger><SelectContent>
            <SelectItem value="all">Tất cả loại chứng chỉ</SelectItem>
            {Object.entries(LICENSE_KIND_LABELS).map(([v, label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}
          </SelectContent></Select>
          <Select value={scan} onValueChange={(v) => filter(v, setScan)}><SelectTrigger aria-label="Bản scan" className="w-44"><SelectValue /></SelectTrigger><SelectContent>
            <SelectItem value="all">Tất cả bản scan</SelectItem><SelectItem value="yes">Có bản scan</SelectItem><SelectItem value="no">Chưa có bản scan</SelectItem>
          </SelectContent></Select>
          {(search || validity !== "all" || kind !== "all" || scan !== "all") && <Button variant="ghost" onClick={() => { setSearch(""); setValidity("all"); setKind("all"); setScan("all"); setPage(1); }}>Xóa bộ lọc</Button>}
        </div>
        <Table><TableHeader><TableRow>
          <TableHead>Người sở hữu</TableHead><TableHead>Chứng chỉ</TableHead><TableHead>Số hiệu</TableHead><TableHead>Nơi cấp</TableHead><TableHead>Hết hạn</TableHead><TableHead>Hiệu lực</TableHead><TableHead>Bản scan</TableHead><TableHead>Thao tác</TableHead>
        </TableRow></TableHeader><TableBody>
          {isLoading || isError ? <TableRow><TableCell colSpan={8} className="py-8 text-center"><span role={isError ? "alert" : "status"}>{isError ? "Không tải được danh sách chứng chỉ. Vui lòng bấm Làm mới để thử lại." : "Đang tải chứng chỉ..."}</span></TableCell></TableRow> : visible.length === 0 ? <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Không có chứng chỉ phù hợp.</TableCell></TableRow> : visible.map((l) => <TableRow key={l.id}>
            <TableCell>{l.holderName ?? "—"}</TableCell><TableCell><span className="block max-w-64 whitespace-normal">{l.title}</span><span className="text-xs text-muted-foreground">{LICENSE_KIND_LABELS[l.kind]}</span></TableCell>
            <TableCell>{l.licenseNumber}</TableCell><TableCell>{l.issuer}</TableCell><TableCell>{l.expiresOn ? formatLocalDate(l.expiresOn) : "Không thời hạn"}</TableCell>
            <TableCell><Badge variant={VALIDITY_VARIANTS[l.validity]}>{VALIDITY_LABELS[l.validity]}</Badge></TableCell><TableCell>{l.hasFile ? "Đã tải lên" : "Chưa có"}</TableCell>
            <TableCell><Button variant="ghost" size="icon-sm" aria-label={`Xem chi tiết chứng chỉ ${l.licenseNumber}`} title="Xem chi tiết" onClick={() => navigate(`/licenses/show/${l.id}`)}><EyeIcon /></Button></TableCell>
          </TableRow>)}
        </TableBody></Table>
        {!isLoading && !isError && <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-sm"><span>{rows.length} chứng chỉ · Trang {currentPage}/{pages}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Trước</Button><Button variant="outline" size="sm" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>Sau</Button></div></div>}
      </Card>

    </ListView>
  );
};
