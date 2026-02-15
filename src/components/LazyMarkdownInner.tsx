"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { LazyMarkdownProps } from "./LazyMarkdown";

export function LazyMarkdownInner(props: LazyMarkdownProps) {
  return <ReactMarkdown {...props} remarkPlugins={[remarkGfm]} />;
}
