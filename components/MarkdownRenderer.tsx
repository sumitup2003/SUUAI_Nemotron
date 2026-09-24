"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="msg-prose min-w-0 max-w-full">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { className, children, ...rest } = props as any;
            const match = /language-(\w+)/.exec(className || "");
            const isBlock = Boolean(match);
            if (!isBlock) {
              return (
                <code className={className} {...rest}>
                  {children}
                </code>
              );
            }
            return (
              <CodeBlock language={match![1]}>
                {String(children).replace(/\n$/, "")}
              </CodeBlock>
            );
          },
          table(props) {
            return (
              <div className="my-2 w-full min-w-0 max-w-full overflow-x-auto rounded-lg border border-hairline/70">
                <table {...props} />
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

const COLLAPSED_HEIGHT = 420;

function CodeBlock({ language, children }: { language: string; children: string }) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const lineCount = children.split("\n").length;

  const copy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text: children, title: `${language || "code"} snippet` });
      } else {
        await navigator.clipboard.writeText(children);
      }
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    } catch {
      // user closed the native share sheet - ignore
    }
  };

  return (
    <div className="my-2 w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-hairline/70">
      <div className="flex items-center justify-between gap-2 bg-raised px-3 py-1.5">
        <span className="shrink-0 font-mono text-[11px] text-faint">{language || "text"}</span>
        <div className="flex shrink-0 items-center gap-3">
          {lineCount > 18 && (
            <button onClick={() => setExpanded((v) => !v)} className="font-mono text-[11px] text-faint transition hover:text-ink">
              {expanded ? "collapse" : "expand"}
            </button>
          )}
          <button onClick={share} className="font-mono text-[11px] text-faint transition hover:text-accent-bright">
            {shared ? "shared ✓" : "share"}
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
          language={language}
          style={vscDarkPlus}
          customStyle={{ margin: 0, padding: "12px 14px", background: "#0d1117", fontSize: "0.82rem", whiteSpace: "pre" }}
        >
          {children}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}