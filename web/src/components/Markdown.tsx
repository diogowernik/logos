"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ content }: { content: string }) {
  const readingContent = content.replace(/<a\s+id=["']epub-[a-f0-9]+["']\s*>\s*<\/a>/gi, "");
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{readingContent}</ReactMarkdown>
    </div>
  );
}
