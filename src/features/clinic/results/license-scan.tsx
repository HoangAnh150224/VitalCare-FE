import { useEffect, useState } from "react";
import { kyInstance } from "@/shared/api/data";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/ui/dialog";

/** Fetch through the authenticated API; never expose a token in a file URL. */
export function LicenseScan({ url, name }: { url: string; name: string | null }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<{ url: string; type: string } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!open) return;
    let disposed = false;
    let objectUrl: string | undefined;
    const controller = new AbortController();
    setFile(null);
    setError(false);
    kyInstance.get(url, { signal: controller.signal }).blob().then((blob) => {
      if (disposed) return;
      if (!["application/pdf", "image/png", "image/jpeg"].includes(blob.type)) {
        setError(true);
        return;
      }
      objectUrl = URL.createObjectURL(blob);
      setFile({ url: objectUrl, type: blob.type });
    }).catch(() => { if (!disposed) setError(true); });
    return () => {
      disposed = true;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, url]);
  return <>
    <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Xem bản scan</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="flex h-[90vh] flex-col sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Bản scan chứng chỉ</DialogTitle>
          <DialogDescription className="break-all">{name ?? "File chứng chỉ hành nghề"}</DialogDescription>
        </DialogHeader>
        {error ? <p role="alert">Không mở được bản scan. Vui lòng đóng và thử lại hoặc tải file về máy.</p> : !file ? <p role="status">Đang tải bản scan...</p> : <>
          <div className="min-h-0 flex-1 overflow-auto rounded border">
            {file.type === "application/pdf" ? <iframe src={file.url} title="Bản scan chứng chỉ PDF" className="h-full w-full" /> : <img src={file.url} alt={name ?? "Bản scan chứng chỉ"} className="mx-auto h-full max-w-full object-contain" />}
          </div>
          <Button variant="outline" asChild><a href={file.url} download={name ?? "chung-chi"}>Tải bản scan</a></Button>
        </>}
      </DialogContent>
    </Dialog>
  </>;
}
