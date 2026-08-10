import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

/**
 * Renders post Markdown.
 *
 * Security: `rehype-raw` is deliberately NOT enabled, so any raw HTML in post
 * content is escaped and rendered as literal text rather than executed. Do not
 * add it without a sanitizer.
 */

function isExternal(href: string | undefined): boolean {
  return Boolean(href && /^https?:\/\//i.test(href));
}

const components: Components = {
  h1: ({ children }) => (
    <h2 className="font-display mt-12 mb-4 text-2xl font-semibold leading-tight text-white sm:text-3xl">
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h2 className="font-display mt-12 mb-4 text-xl font-semibold leading-tight text-white sm:text-2xl">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-display mt-8 mb-3 text-lg font-semibold leading-snug text-white">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="font-display mt-6 mb-2 text-base font-semibold text-white">{children}</h4>
  ),
  p: ({ children }) => <p className="mb-5 leading-relaxed text-muted">{children}</p>,
  a: ({ href, children }) =>
    isExternal(href) ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="text-accent underline underline-offset-4 transition-colors hover:text-white"
      >
        {children}
      </a>
    ) : (
      <a
        href={href}
        className="text-accent underline underline-offset-4 transition-colors hover:text-white"
      >
        {children}
      </a>
    ),
  ul: ({ children }) => (
    <ul className="mb-5 list-disc space-y-2 pl-6 text-muted marker:text-muted-soft">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-5 list-decimal space-y-2 pl-6 text-muted marker:text-muted-soft">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mb-5 border-l-2 border-accent/60 bg-white/[0.03] py-2 pl-5 text-muted italic">
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    // react-markdown gives fenced blocks a `language-*` class; bare inline code
    // has none.
    const isBlock = Boolean(className);
    if (isBlock) {
      return (
        <code className="font-mono text-sm leading-relaxed text-white/90">{children}</code>
      );
    }
    return (
      <code className="rounded-sm border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[0.85em] text-white">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-6 overflow-x-auto rounded-sm border border-white/10 bg-[#0a0a0a] p-4">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-10 border-white/10" />,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  // GFM tables — wrapped so a wide table scrolls instead of breaking the page.
  table: ({ children }) => (
    <div className="mb-6 overflow-x-auto rounded-sm border border-white/10">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-white/[0.06]">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-white/10 px-4 py-2.5 font-semibold text-white">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-b border-white/5 px-4 py-2.5 text-muted">{children}</td>
  ),
  img: ({ src, alt }) =>
    typeof src === "string" ? (
      // eslint-disable-next-line @next/next/no-img-element -- author-supplied host is unknown at build time
      <img
        src={src}
        alt={alt ?? ""}
        loading="lazy"
        className="mb-6 w-full rounded-sm border border-white/10"
      />
    ) : null,
};

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="text-base sm:text-lg">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </Markdown>
    </div>
  );
}
