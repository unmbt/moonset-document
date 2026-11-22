import { useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';
import { resolveRelativeDocSlug, slugifyHeading } from '../lib/markdown';

interface MarkdownRendererProps {
  content: string;
  currentRepoPath: string;
  onNavigate: (route: string, hash?: string) => void;
}

function extractText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractText).join('');
  }
  if (node && typeof node === 'object' && 'props' in node) {
    const props = (node as { props?: { children?: ReactNode } }).props;
    return extractText(props?.children);
  }
  return '';
}

function CodeBlock({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const rawCode = extractText(children).replace(/\n$/, '');
  const langMatch = /language-([\w-]+)/.exec(className ?? '');
  const lang = langMatch ? langMatch[1] : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="group relative my-5 overflow-hidden rounded-xl border border-slate-900/[0.08] bg-[#F4F5FA] dark:border-white/[0.08] dark:bg-[#0C0E16]">
      <div className="flex items-center justify-between border-b border-slate-900/[0.06] px-4 py-2 text-[11px] text-slate-500 dark:border-white/[0.06] dark:text-slate-400">
        <span className="font-mono">{lang || 'text'}</span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="复制代码块"
          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-slate-500 transition-colors hover:bg-slate-900/[0.05] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.07] dark:hover:text-white"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <span>已复制</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>复制</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-[1.65] text-slate-800 dark:text-slate-200">
        <code>{rawCode}</code>
      </pre>
    </div>
  );
}

export function MarkdownRenderer({
  content,
  currentRepoPath,
  onNavigate,
}: MarkdownRendererProps) {
  // Maintain deterministic heading ID deduplication per render pass
  const headingCounts = new Map<string, number>();

  const nextHeadingId = (text: string) => {
    const base = slugifyHeading(text) || 'section';
    const seen = headingCounts.get(base) ?? 0;
    headingCounts.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen}`;
  };

  // Strip GitHub [!NOTE]/[!IMPORTANT] marker syntax cleanly into bold labels
  const normalizedContent = content.replace(
    /^>\s*\[!(NOTE|IMPORTANT|TIP|WARNING|CAUTION)\]\s*$/gm,
    (_, kind: string) => {
      const labelMap: Record<string, string> = {
        NOTE: '说明',
        IMPORTANT: '重要提示',
        TIP: '提示',
        WARNING: '注意',
        CAUTION: '警告',
      };
      return `> **${labelMap[kind] ?? kind}**`;
    },
  );

  return (
    <div className="moonset-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2({ children }) {
            const id = nextHeadingId(extractText(children));
            return <h2 id={id}>{children}</h2>;
          },
          h3({ children }) {
            const id = nextHeadingId(extractText(children));
            return <h3 id={id}>{children}</h3>;
          },
          a({ href, children }) {
            const target = href ?? '';
            const resolved = resolveRelativeDocSlug(currentRepoPath, target);
            if (resolved) {
              return (
                <a
                  href={resolved.route ? `#${resolved.route}` : `#${resolved.hash ?? ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    if (resolved.route) {
                      onNavigate(resolved.route, resolved.hash);
                    } else if (resolved.hash) {
                      const el = document.getElementById(resolved.hash);
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  {children}
                </a>
              );
            }
            const isExternal = target.startsWith('http://') || target.startsWith('https://');
            return (
              <a
                href={target}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noreferrer' : undefined}
              >
                {children}
              </a>
            );
          },
          pre({ children }) {
            const child = Array.isArray(children) ? children[0] : children;
            if (
              child &&
              typeof child === 'object' &&
              'props' in child &&
              (child as { props?: { className?: string; children?: ReactNode } }).props
            ) {
              const props = (
                child as { props: { className?: string; children?: ReactNode } }
              ).props;
              return <CodeBlock className={props.className}>{props.children}</CodeBlock>;
            }
            return <CodeBlock>{children}</CodeBlock>;
          },
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}
