"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="msg-prose">
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
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function CodeBlock({ language, children }: { language: string; children: string }) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

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
    <div className="my-2 overflow-hidden rounded-lg border border-hairline">
      <div className="flex items-center justify-between bg-raised px-3 py-1.5">
        <span className="font-mono text-[11px] text-faint">{language || "text"}</span>
        <div className="flex items-center gap-3">
          <button
            onClick={share}
            className="font-mono text-[11px] text-faint transition hover:text-accent-bright"
          >
            {shared ? "shared ✓" : "share"}
          </button>
          <button
            onClick={copy}
            className="font-mono text-[11px] text-faint transition hover:text-teal"
          >
            {copied ? "copied ✓" : "copy"}
          </button>
        </div>
      </div>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: "12px 14px",
          background: "#0d1117",
          fontSize: "0.82rem",
        }}
        wrapLongLines
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}
