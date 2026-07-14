import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownBodyProps = {
  markdown: string;
  className?: string;
};

export function MarkdownBody({ markdown, className = "" }: MarkdownBodyProps) {
  return (
    <div className={`text-sm leading-6 text-foreground ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-3 mt-4 text-xl font-semibold text-foreground first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-4 text-lg font-semibold text-foreground first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-3 text-base font-semibold text-foreground first:mt-0">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="mb-1 mt-3 text-sm font-semibold text-foreground first:mt-0">{children}</h4>
          ),
          p: ({ children }) => <p className="mb-2 text-sm leading-6 text-muted-foreground last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 text-muted-foreground">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 text-muted-foreground">{children}</ol>,
          li: ({ children }) => <li className="leading-6">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-2 border-l-2 border-border pl-3 text-muted-foreground">{children}</blockquote>
          ),
          hr: () => <hr className="my-4 border-border" />,
          code: ({ className: codeClassName, children }) => {
            const inline = !codeClassName;
            if (inline) {
              return (
                <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">{children}</code>
              );
            }
            return (
              <code className={`block overflow-x-auto rounded-md bg-muted p-3 text-xs ${codeClassName ?? ""}`}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="mb-3 overflow-x-auto rounded-md bg-muted p-0">{children}</pre>,
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-left text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted/40">{children}</thead>,
          th: ({ children }) => (
            <th className="border border-border px-2 py-1.5 font-semibold text-foreground">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-2 py-1.5 align-top text-muted-foreground">{children}</td>
          ),
          tr: ({ children }) => <tr>{children}</tr>
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
