"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_ATTACHMENTS, MAX_FILE_MB, MAX_EXTRACTED_CHARS, SPREADSHEET_EXTENSIONS, PDF_EXTENSIONS, DOCX_EXTENSIONS, TEXT_FILE_EXTENSIONS } from "@/lib/types";

interface Attachment {
  id: string;
  file: File;
  name: string;
  type: string;
  size: number;
  kind: "image" | "text" | "other";
  previewUrl?: string;
  textContent?: string;
  uploadedUrl?: string;
  status: "reading" | "uploading" | "ready" | "error";
  error?: string;
}

async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    if (width > maxDim || height > maxDim) {
      const ratio = Math.min(maxDim / width, maxDim / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) return file;
    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch {
    // if compression fails for any reason, fall back to the original file
    return file;
  }
}

function extOf(name: string) {
  return name.split(".").pop()?.toLowerCase() || "";
}

export default function Composer({
  onSend,
  disabled,
  uploadFile,
}: {
  onSend: (text: string, images?: string[]) => void;
  disabled?: boolean;
  uploadFile: (file: File) => Promise<{ url: string; name: string; type: string; size: number }>;
}) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [value]);

  const busy = attachments.some((a) => a.status === "reading" || a.status === "uploading");

   const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|heic|heif|bmp|avif)$/i;

  const addFiles = async (files: FileList | null, forceImage = false) => {
    if (!files || files.length === 0) return;
    const room = MAX_ATTACHMENTS - attachments.length;
    const picked = Array.from(files).slice(0, Math.max(room, 0));

    for (const rawFile of picked) {
      const id = crypto.randomUUID();
      // Some phones (notably many Android camera apps) hand back a captured
      // photo with an empty file.type, which silently broke image detection
      // here - the photo got treated as a generic attachment instead of an
      // image, so the vision model never got called. Since the camera
      // button only ever produces images, forceImage skips the unreliable
      // MIME sniffing entirely for that path; the extension check is a
      // second fallback for the regular file picker.
      const isImage =
        forceImage || rawFile.type.startsWith("image/") || IMAGE_EXT_RE.test(rawFile.name);
      // Phone camera photos are often 5-15MB at full resolution, which
      // exceeds Vercel's ~4.5MB request body limit and used to crash with
      // a raw non-JSON error. Shrinking images client-side first fixes
      // that at the source instead of just rejecting most real photos.
      const file = isImage ? await compressImage(rawFile) : rawFile;

      const ext = extOf(file.name);
      const isSpreadsheet = SPREADSHEET_EXTENSIONS.includes(ext);
      const isPdf = PDF_EXTENSIONS.includes(ext);
      const isDocx = DOCX_EXTENSIONS.includes(ext);
      const isText = TEXT_FILE_EXTENSIONS.includes(ext);
      const extractable = isSpreadsheet || isPdf || isDocx || isText;
      const kind: Attachment["kind"] = isImage ? "image" : extractable ? "text" : "other";

      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        setAttachments((prev) => [
          ...prev,
          {
            id,
            file,
            name: file.name,
            type: file.type,
            size: file.size,
            kind,
            status: "error",
            error: `Over ${MAX_FILE_MB}MB`,
          },
        ]);
        continue;
      }

      const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
      setAttachments((prev) => [
        ...prev,
        { id, file, name: file.name, type: file.type, size: file.size, kind, previewUrl, status: "reading" },
      ]);

      if (extractable) {
        try {
          let raw = "";
          if (isSpreadsheet) {
            const XLSX = await import("xlsx");
            const buf = await file.arrayBuffer();
            const workbook = XLSX.read(buf, { type: "array" });
            for (const sheetName of workbook.SheetNames) {
              raw += `-- Sheet: ${sheetName} --\n${XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName])}\n\n`;
            }
          } else if (isPdf) {
            const pdfjsLib = await import("pdfjs-dist");
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
            const buf = await file.arrayBuffer();
            const doc = await pdfjsLib.getDocument({ data: buf }).promise;
            for (let i = 1; i <= doc.numPages; i++) {
              const page = await doc.getPage(i);
              const text = await page.getTextContent();
              raw += text.items.map((it: any) => ("str" in it ? it.str : "")).join(" ") + "\n\n";
              if (raw.length > MAX_EXTRACTED_CHARS) break;
            }
          } else if (isDocx) {
            const mammoth = await import("mammoth");
            const buf = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer: buf });
            raw = result.value;
          } else {
            raw = await file.text();
          }

          const truncated = raw.length > MAX_EXTRACTED_CHARS;
          const text = raw.slice(0, MAX_EXTRACTED_CHARS) + (truncated ? "\n… (truncated)" : "");
          setAttachments((prev) =>
            prev.map((a) => (a.id === id ? { ...a, textContent: text } : a))
          );
        } catch (e) {
          setAttachments((prev) =>
            prev.map((a) =>
              a.id === id ? { ...a, error: "Couldn't read file content, uploading as-is" } : a
            )
          );
        }
      }
      setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "uploading" } : a)));
      try {
        const result = await uploadFile(file);
        setAttachments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, uploadedUrl: result.url, status: "ready" } : a))
        );
      } catch (e) {
        setAttachments((prev) =>
          prev.map((a) =>
            a.id === id
              ? { ...a, status: "error", error: e instanceof Error ? e.message : "Upload failed" }
              : a
          )
        );
      }
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  };

  const submit = () => {
    const text = value.trim();
    const ready = attachments.filter((a) => a.status === "ready");
    if ((!text && ready.length === 0) || disabled || busy) return;

    let finalText = text;
    const images: string[] = [];

    for (const a of ready) {
      if (a.kind === "image" && a.uploadedUrl) {
        finalText += `\n\n![${a.name}](${a.uploadedUrl})`;
        images.push(a.uploadedUrl);
      } else if (a.kind === "text" && a.textContent) {
        finalText += `\n\n[[[ATTACH name="${a.name}"]]]\n${a.textContent}\n[[[/ATTACH]]]`;
      } else if (a.uploadedUrl) {
        finalText += `\n\n📎 [${a.name}](${a.uploadedUrl}) _(attached — content not readable by the model)_`;
      }
    }

    onSend(finalText.trim(), images.length ? images : undefined);
    setValue("");
    attachments.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl));
    setAttachments([]);
  };

  return (
    <div className="border-t border-hairline bg-panel/80 px-3 py-3 backdrop-blur sm:px-4 md:px-8">
      {attachments.length > 0 && (
        <div className="mx-auto mb-2 flex max-w-3xl flex-wrap gap-2">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 rounded-lg border border-hairline bg-raised py-1.5 pl-1.5 pr-2 text-xs"
            >
              {a.kind === "image" && a.previewUrl ? (
                <img src={a.previewUrl} alt={a.name} className="h-7 w-7 rounded object-cover" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded bg-panel text-faint">
                  📄
                </div>
              )}
              <span className="max-w-[120px] truncate text-muted">{a.name}</span>
              {a.status === "reading" || a.status === "uploading" ? (
                <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-faint border-t-accent" />
              ) : a.status === "error" ? (
                <span className="shrink-0 text-[10px] text-danger">{a.error}</span>
              ) : (
                <span className="shrink-0 text-teal">✓</span>
              )}
              <button
                onClick={() => removeAttachment(a.id)}
                className="shrink-0 text-faint hover:text-danger"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        className={`mx-auto flex max-w-3xl items-end gap-1.5 rounded-2xl border bg-raised px-2 py-2 transition sm:gap-2 sm:px-3 ${
          disabled ? "border-hairline opacity-70" : "border-hairline focus-within:border-accent/60 focus-within:shadow-glow"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files, true);
            e.target.value = "";
          }}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || attachments.length >= MAX_ATTACHMENTS}
          title="Attach file"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-hairline hover:text-ink disabled:opacity-30"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path d="M21.44 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.19-9.19a3.5 3.5 0 014.95 4.95l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled || attachments.length >= MAX_ATTACHMENTS}
          title="Camera"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-hairline hover:text-ink disabled:opacity-30"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            <circle cx="12" cy="13.5" r="3.2" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        </button>

        <textarea
          ref={ref}
          rows={1}
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ask Nemo to write, explain, or debug some code…"
          className="max-h-[200px] flex-1 resize-none bg-transparent py-1.5 text-base text-ink placeholder:text-faint outline-none md:text-sm"
        />
        <button
          onClick={submit}
          disabled={disabled || busy || (!value.trim() && attachments.every((a) => a.status !== "ready"))}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-white transition enabled:hover:bg-accent-bright disabled:opacity-30"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <p className="mx-auto mt-1.5 max-w-3xl text-center font-mono text-[10px] text-faint">
        Enter to send · Shift+Enter for a new line · images up to {MAX_FILE_MB}MB
      </p>
    </div>
  );
}