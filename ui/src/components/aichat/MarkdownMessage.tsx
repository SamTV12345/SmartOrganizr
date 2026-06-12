import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders assistant chat text as Markdown. react-markdown escapes raw HTML by
// default, so model output cannot inject markup. Element styles are tuned for
// the dark chat bubble (Tailwind's preflight strips list/heading defaults, so
// they are restored explicitly here).
export const MarkdownMessage = ({ content }: { content: string }) => (
    <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            a: ({ children, href }) => (
                <a href={href} target="_blank" rel="noopener noreferrer"
                   className="text-blue-300 underline">
                    {children}
                </a>
            ),
            ul: ({ children }) => <ul className="mb-2 list-disc pl-5 last:mb-0">{children}</ul>,
            ol: ({ children }) => <ol className="mb-2 list-decimal pl-5 last:mb-0">{children}</ol>,
            li: ({ children }) => <li className="mb-0.5">{children}</li>,
            code: ({ children }) => (
                <code className="rounded bg-gray-800 px-1 py-0.5 font-mono text-xs">{children}</code>
            ),
            pre: ({ children }) => (
                <pre className="mb-2 overflow-x-auto rounded bg-gray-800 p-2 text-xs last:mb-0">{children}</pre>
            ),
            h1: ({ children }) => <h1 className="mb-1 font-semibold">{children}</h1>,
            h2: ({ children }) => <h2 className="mb-1 font-semibold">{children}</h2>,
            h3: ({ children }) => <h3 className="mb-1 font-semibold">{children}</h3>,
        }}
    >
        {content}
    </Markdown>
);
