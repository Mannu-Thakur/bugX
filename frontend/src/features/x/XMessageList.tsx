import React, { useEffect, useRef, useState } from "react";
import { Copy, Check, RefreshCw, Wand2, Edit3 } from "lucide-react";
import { type XMessage } from "./XContext";
import { useToast } from "../../shared/ui/toast/ToastProvider";
import hljs from "highlight.js/lib/core";
import cpp from "highlight.js/lib/languages/cpp";
import python from "highlight.js/lib/languages/python";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import "highlight.js/styles/atom-one-dark.css";
import katex from "katex";

hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("c", cpp);
hljs.registerLanguage("python", python);
hljs.registerLanguage("py", python);
hljs.registerLanguage("java", java);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);

function renderMath(src: string, displayMode: boolean): string {
  try {
    return katex.renderToString(src, { displayMode, throwOnError: false, output: "html" });
  } catch {
    return src;
  }
}

function parseMarkdown(text: string): string {
  const store: string[] = [];
  const PH = "\x00M\x00";

  const withMath = text
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, s) => { store.push(`<span class="x-math-display">${renderMath(s.trim(), true)}</span>`); return PH + (store.length - 1) + PH; })
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, s) => { store.push(`<span class="x-math-display">${renderMath(s.trim(), true)}</span>`); return PH + (store.length - 1) + PH; })
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, s) => { store.push(renderMath(s.trim(), false)); return PH + (store.length - 1) + PH; })
    .replace(/(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g, (_, s) => { store.push(renderMath(s.trim(), false)); return PH + (store.length - 1) + PH; });

  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const fmt = (s: string) => esc(s)
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code class="x-inline-code">$1</code>')
    .replace(/~~(.+?)~~/g, "<del>$1</del>");

  const lines = withMath.split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const t = raw.trim();

    if (!t) { out.push('<div class="x-spacer"></div>'); i++; continue; }

    const hm = t.match(/^(#{1,3})\s+(.+)/);
    if (hm) {
      const cls = hm[1].length <= 2 ? "x-h2" : "x-h3";
      out.push(`<h3 class="${cls}">${fmt(hm[2])}</h3>`);
      i++; continue;
    }

    if (/^---+$/.test(t)) { out.push('<hr class="x-hr" />'); i++; continue; }

    if (t.startsWith(">")) {
      const bq: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        bq.push(fmt(lines[i].trim().replace(/^>\s?/, ""))); i++;
      }
      out.push(`<blockquote class="x-blockquote">${bq.join("<br />")}</blockquote>`);
      continue;
    }

    if (/^\d+[.)]\s/.test(t)) {
      const items: string[] = [];
      while (i < lines.length) {
        const l = lines[i]; const tt = l.trim();
        if (/^\d+[.)]\s/.test(tt)) { items.push(`<li class="x-li-num">${fmt(tt.replace(/^\d+[.)]\s/, ""))}</li>`); i++; }
        else if (/^[ \t]{2,}/.test(l) && tt) { items.push(`<li class="x-li-nested">${fmt(tt.replace(/^[-*\d.)]+\s*/, "") || tt)}</li>`); i++; }
        else break;
      }
      out.push(`<ol class="x-ol">${items.join("")}</ol>`); continue;
    }

    if (/^[-*+]\s/.test(t)) {
      const items: string[] = [];
      while (i < lines.length) {
        const l = lines[i]; const tt = l.trim();
        if (/^[-*+]\s/.test(tt)) { items.push(`<li class="x-li">${fmt(tt.replace(/^[-*+]\s/, ""))}</li>`); i++; }
        else if (/^[ \t]{2,}[-*+]\s/.test(l)) { items.push(`<li class="x-li-nested">${fmt(tt.replace(/^[-*+]\s/, ""))}</li>`); i++; }
        else break;
      }
      out.push(`<ul class="x-ul">${items.join("")}</ul>`); continue;
    }

    const para: string[] = [];
    while (i < lines.length) {
      const tt = lines[i].trim();
      if (!tt) break;
      if (/^#{1,3}\s/.test(tt) || /^[-*+]\s/.test(tt) || /^\d+[.)]\s/.test(tt) || tt.startsWith(">") || /^---+$/.test(tt)) break;
      para.push(fmt(lines[i])); i++;
    }
    if (para.length) out.push(`<p class="x-p">${para.join("<br />")}</p>`);
  }

  let html = out.join("\n");
  html = html.replace(new RegExp(PH.replace(/\x00/g, "\\x00") + "(\\d+)" + PH.replace(/\x00/g, "\\x00"), "g"), (_, idx) => store[Number(idx)] ?? "");
  return html;
}

interface ParsedBlock { type: "text" | "code"; content: string; language?: string; }

function parseBlocks(text: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const re = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0; let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) blocks.push({ type: "text", content: text.slice(last, m.index) });
    blocks.push({ type: "code", language: m[1] || "text", content: m[2].trim() });
    last = m.index + m[0].length;
  }
  if (last < text.length) blocks.push({ type: "text", content: text.slice(last) });
  return blocks;
}

interface CodeBlockProps { code: string; language: string; onRegenerate?: () => void; isStreaming?: boolean; }

const CodeBlock: React.FC<CodeBlockProps> = React.memo(({ code, language, onRegenerate, isStreaming }) => {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.removeAttribute("data-highlighted");
      if (!isStreaming) hljs.highlightElement(codeRef.current);
    }
  }, [code, language, isStreaming]);

  const handleCopy = async () => {
    if (!code?.trim()) { toast.error("No code content to copy."); return; }
    await navigator.clipboard.writeText(code);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (!code?.trim()) { toast.error("No valid code block content found to apply."); return; }
    type CW = Window & { bugxActiveEditor?: unknown };
    if (!(window as unknown as CW).bugxActiveEditor) { toast.error("No active editor instance is available."); return; }
    window.dispatchEvent(new CustomEvent("x-apply-code-to-editor", { detail: { code, mode: "replace" } }));
  };

  const hljsLang = (language || "").toLowerCase().replace("c++", "cpp");

  return (
    <div className="x-code-block rounded-xl overflow-hidden border border-white/[0.07] my-3">
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.04] border-b border-white/[0.05]">
        <span className="text-[11px] font-mono font-semibold text-gray-500 uppercase tracking-widest">{language || "code"}</span>
        <div className="flex items-center gap-1.5">
          <button onClick={handleCopy} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer" title="Copy">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
          <button onClick={handleApply} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 transition-all cursor-pointer" title="Apply to Editor">
            <Wand2 className="w-3.5 h-3.5" /><span>Apply Code</span>
          </button>
          {onRegenerate && (
            <button onClick={onRegenerate} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer" title="Regenerate">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <pre className="x-code-content px-5 py-4 overflow-x-auto text-[13px] font-mono leading-[1.7] bg-[#0e0e10] !m-0">
        <code ref={codeRef} className={hljsLang ? `language-${hljsLang}` : ""}>{code}</code>
      </pre>
    </div>
  );
}, (p, n) => p.code === n.code && p.language === n.language && p.isStreaming === n.isStreaming);

interface XMessageBubbleProps { message: XMessage; onRegenerate?: () => void; onEditMessage?: (id: string, c: string) => void; }

const XMessageBubble: React.FC<XMessageBubbleProps> = ({ message, onRegenerate, onEditMessage }) => {
  const isUser = message.role === "user";
  const blocks = parseBlocks(message.content);
  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal] = useState(message.content);
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { if (!message.content) return; navigator.clipboard.writeText(message.content); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  if (isUser) {
    if (isEditing) return (
      <div className="flex flex-col items-end mb-4 w-full">
        <div className="w-[85%] bg-[#161618] border border-white/[0.08] rounded-xl p-2.5 flex flex-col gap-2">
          <textarea value={editVal} onChange={(e) => setEditVal(e.target.value)} className="w-full bg-transparent text-[13px] text-gray-200 outline-none resize-none min-h-[60px] leading-relaxed" autoFocus />
          <div className="flex justify-end gap-2 text-[10px]">
            <button onClick={() => { setIsEditing(false); setEditVal(message.content); }} className="px-2.5 py-1 rounded bg-[#252526] hover:bg-[#2d2d30] text-gray-400 hover:text-white transition-colors cursor-pointer border border-white/[0.04]">Cancel</button>
            <button onClick={() => { if (editVal.trim() && onEditMessage) { setIsEditing(false); onEditMessage(message.id, editVal.trim()); } }} disabled={!editVal.trim()} className="px-3 py-1 rounded bg-orange-600 hover:bg-orange-500 text-white transition-colors cursor-pointer disabled:opacity-40 font-bold">Save &amp; Submit</button>
          </div>
        </div>
      </div>
    );
    return (
      <div className="flex flex-col items-end mb-3">
        <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-tr-sm text-[13px] text-white leading-relaxed whitespace-pre-wrap break-words" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {message.content}
        </div>
        <div className="flex items-center gap-2 mt-1 px-1">
          <button onClick={handleCopy} className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors cursor-pointer flex items-center gap-1 bg-transparent border-0 p-0" title="Copy">
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}<span>{copied ? "Copied" : "Copy"}</span>
          </button>
          {onEditMessage && (<><span className="text-gray-700 text-[10px] select-none">·</span>
            <button onClick={() => { setEditVal(message.content); setIsEditing(true); }} className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors cursor-pointer flex items-center gap-1 bg-transparent border-0 p-0" title="Edit">
              <Edit3 className="w-3 h-3" /><span>Edit</span>
            </button></>)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 mb-5">
      <div className="w-6 h-6 flex items-center justify-center shrink-0 mt-0.5"><span className="text-[13px] font-black tracking-wider text-gray-400">X</span></div>
      <div className="flex-1 min-w-0">
        {message.isStreaming && message.content === "" && (
          <div className="flex items-center gap-1.5 py-2">
            <span className="x-thinking-dot" style={{ animationDelay: "0ms" }} />
            <span className="x-thinking-dot" style={{ animationDelay: "150ms" }} />
            <span className="x-thinking-dot" style={{ animationDelay: "300ms" }} />
          </div>
        )}
        {blocks.map((block, idx) =>
          block.type === "code"
            ? <CodeBlock key={idx} code={block.content} language={block.language || ""} onRegenerate={onRegenerate} isStreaming={message.isStreaming} />
            : <div key={idx} className="x-text-block" dangerouslySetInnerHTML={{ __html: parseMarkdown(block.content) }} />
        )}
        {message.isStreaming && message.content !== "" && <span className="x-cursor inline-block ml-0.5" />}
        {message.error && !message.isStreaming && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-medium">
            ⚠️ {message.error}
          </div>
        )}
        {!message.isStreaming && (
          <div className="flex items-center gap-3 mt-2.5 px-0.5 text-[10px]">
            {message.content && (
              <button onClick={handleCopy} className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer flex items-center gap-1 bg-transparent border-0 p-0" title="Copy response">
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}<span>{copied ? "Copied" : "Copy"}</span>
              </button>
            )}
            {onRegenerate && (
              <button onClick={onRegenerate} className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer flex items-center gap-1 bg-transparent border-0 p-0" title="Retry">
                <RefreshCw className="w-3 h-3" /><span>Retry</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface XMessageListProps { messages: XMessage[]; onRegenerate?: () => void; onEditMessage?: (id: string, c: string) => void; }

export const XMessageList: React.FC<XMessageListProps> = ({ messages, onRegenerate, onEditMessage }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "auto" }); }, [messages]);
  return (
    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
      {messages.map((msg, idx) => {
        const last = idx === messages.length - 1;
        return <XMessageBubble key={msg.id} message={msg} onRegenerate={last && msg.role === "assistant" ? onRegenerate : undefined} onEditMessage={onEditMessage} />;
      })}
      <div ref={bottomRef} />
    </div>
  );
};
