"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type ReactMarkdownType from "react-markdown";

export type LazyMarkdownProps = Omit<ComponentProps<typeof ReactMarkdownType>, "remarkPlugins">;

/**
 * Lazily loads react-markdown + remark-gfm to keep them out of the initial bundle (~16 KB gzipped).
 * Use this anywhere you would use `<ReactMarkdown remarkPlugins={[remarkGfm]}>`.
 */
export const LazyMarkdown = dynamic<LazyMarkdownProps>(
  () =>
    import("./LazyMarkdownInner").then((mod) => mod.LazyMarkdownInner),
  { ssr: false, loading: () => null }
);
