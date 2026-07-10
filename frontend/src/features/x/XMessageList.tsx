import React, { useEffect, useRef, useState } from 'react';
import { Copy, Check, RefreshCw, Wand2 } from 'lucide-react';
import { type XMessage } from './XContext';
import { useToast } from '../../shared/ui/toast/ToastProvider';
import hljs from 'highlight.js/lib/core';
import cpp from 'highlight.js/lib/languages/cpp';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import 'highlight.js/styles/atom-one-dark.css';

// Register languages
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('c', cpp);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('java', java);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);

// Simple markdown-to-html converter (no external deps needed)
function parseMarkdown(text: string): string {
  const html = text
    // escape HTML first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="x-inline-code">$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="x-h3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="x-h2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="x-h1">$1</h1>')
    // Lists
    .replace(/^- (.+)$/gm, '<li class="x-li">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="x-li-num">$1</li>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="x-hr" />')
    // Line breaks
    .replace(/\n/g, '<br />');
  return html;
}

// Extract code blocks before markdown parsing
interface ParsedBlock {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

function parseBlocks(text: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    blocks.push({ type: 'code', language: match[1] || 'text', content: match[2].trim() });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    blocks.push({ type: 'text', content: text.slice(lastIndex) });
  }
  return blocks;
}

interface CodeBlockProps {
  code: string;
  language: string;
  onRegenerate?: () => void;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, onRegenerate }) => {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);
  const toast = useToast();

  // Syntax highlighting
  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.removeAttribute('data-highlighted');
      hljs.highlightElement(codeRef.current);
    }
  }, [code, language]);

  const handleCopy = async () => {
    if (!code || code.trim() === '') {
      toast.error('No code content to copy.');
      return;
    }
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (!code || code.trim() === '') {
      toast.error('No valid code block content found to apply.');
      return;
    }

    type CustomWindow = Window & {
      bugxActiveEditor?: unknown;
    };
    const editor = (window as unknown as CustomWindow).bugxActiveEditor;
    if (!editor) {
      toast.error('No active editor instance is available.');
      return;
    }

    window.dispatchEvent(new CustomEvent('x-apply-code-to-editor', { detail: { code, mode: 'replace' } }));
  };

  // Map common language aliases for hljs
  const hljsLang = (language || '').toLowerCase().replace('c++', 'cpp');

  return (
    <div className="x-code-block rounded-lg overflow-hidden border border-white/[0.07] my-2">
      {/* Code block header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.04]">
        <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider">
          {language || 'code'}
        </span>
        <div className="flex items-center gap-1">
          {/* Copy */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold text-gray-500 hover:text-white hover:bg-white/[0.07] transition-all cursor-pointer"
            title="Copy"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Apply to Editor */}
          <button
            onClick={handleApply}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 transition-all cursor-pointer"
            title="Apply to Editor"
          >
            <Wand2 className="w-3 h-3" />
            <span>Apply</span>
          </button>

          {/* Regenerate */}
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold text-gray-500 hover:text-white hover:bg-white/[0.07] transition-all cursor-pointer"
              title="Regenerate"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Code content — syntax highlighted */}
      <pre className="x-code-content px-4 py-3 overflow-x-auto text-[12px] font-mono leading-relaxed bg-[#0e0e10] !m-0">
        <code ref={codeRef} className={hljsLang ? `language-${hljsLang}` : ''}>{code}</code>
      </pre>
    </div>
  );
};

interface XMessageBubbleProps {
  message: XMessage;
  onRegenerate?: () => void;
}

const XMessageBubble: React.FC<XMessageBubbleProps> = ({ message, onRegenerate }) => {
  const isUser = message.role === 'user';
  const blocks = parseBlocks(message.content);

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div
          className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-tr-sm text-[13px] text-white leading-relaxed"
          style={{ background: 'rgba(249, 115, 22, 0.15)', border: '1px solid rgba(249, 115, 22, 0.25)' }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex gap-2.5 mb-4">
      {/* X avatar */}
      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-600/40 to-amber-600/25 border border-orange-500/20 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-[11px] font-black text-white">X</span>
      </div>

      <div className="flex-1 min-w-0">
        {/* Thinking / streaming indicator */}
        {message.isStreaming && message.content === '' && (
          <div className="flex items-center gap-1.5 py-2">
            <span className="x-thinking-dot" style={{ animationDelay: '0ms' }} />
            <span className="x-thinking-dot" style={{ animationDelay: '150ms' }} />
            <span className="x-thinking-dot" style={{ animationDelay: '300ms' }} />
          </div>
        )}

        {/* Message blocks */}
        {blocks.map((block, i) => {
          if (block.type === 'code') {
            return (
              <CodeBlock
                key={i}
                code={block.content}
                language={block.language || ''}
                onRegenerate={onRegenerate}
              />
            );
          }
          const html = parseMarkdown(block.content);
          return (
            <div
              key={i}
              className="x-text-block text-[13px] text-gray-200 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        })}

        {/* Streaming cursor */}
        {message.isStreaming && message.content !== '' && (
          <span className="x-cursor inline-block ml-0.5" />
        )}

        {/* Error state */}
        {message.error && !message.isStreaming && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-medium">
            ⚠️ {message.error}
          </div>
        )}
      </div>
    </div>
  );
};

interface XMessageListProps {
  messages: XMessage[];
  onRegenerate?: () => void;
}

export const XMessageList: React.FC<XMessageListProps> = ({ messages, onRegenerate }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
      {messages.map((msg) => (
        <XMessageBubble
          key={msg.id}
          message={msg}
          onRegenerate={onRegenerate}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
};
