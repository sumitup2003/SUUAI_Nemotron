"use client";

import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface CodeFile {
  name: string;
  lang: string;
  code: string;
}

const COLLAPSED_HEIGHT = 420;

export default function CodeFileViewer({ files }: { files: CodeFile[] }) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const file = files[Math.min(active, files.length - 1)];

  const copy = async () => {
    await navigator.clipboard.writeText(file.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const download = () => {
    const blob = new Blob([file.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name.split("/").pop() || "file.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!file) return null;
  const lineCount = file.code.split("\n").length;

  return (
    // w-full + min-w-0 is what actually makes the horizontal scroll below
    // stay contained: without an explicit width, a block element sizes to
    // fit very long code lines instead of the space it's given, which is
    // what let code spill straight past the screen edge before.
    <div className="my-2 w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-hairline/70">
      {files.length > 1 && (
        <div className="flex items-center gap-1 overflow-x-auto border-b border-hairline/70 bg-raised px-1.5 py-1.5">
          {files.map((f, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 font-mono text-[11px] transition ${
                i === active ? "bg-accent text-white" : "text-muted hover:bg-hairline hover:text-ink"
              }`}
            >
              {f.name.split("/").pop()}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-2 bg-raised px-3 py-1.5">
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-faint">{file.name}</span>
        <div className="flex shrink-0 items-center gap-3">
          {lineCount > 18 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="font-mono text-[11px] text-faint transition hover:text-ink"
            >
              {expanded ? "collapse" : "expand"}
            </button>
          )}
          <button onClick={download} className="font-mono text-[11px] text-faint transition hover:text-accent-bright">
            download
          </button>
          <button onClick={copy} className="font-mono text-[11px] text-faint transition hover:text-teal">
            {copied ? "copied ✓" : "copy"}
          </button>
        </div>
      </div>
      <div
        className="w-full min-w-0 max-w-full overflow-x-auto overflow-y-auto"
        style={{ maxHeight: expanded ? "none" : COLLAPSED_HEIGHT }}
      >
        <SyntaxHighlighter
          language={file.lang || "text"}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: "12px 14px",
            background: "#0d1117",
            fontSize: "0.82rem",
            whiteSpace: "pre",
          }}
        >
          {file.code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}