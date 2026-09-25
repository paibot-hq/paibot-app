import type { ReactNode } from "react";
import styles from "./tool-layout.module.css";

type ToolLayoutProps = {
  title: string;
  children?: ReactNode;
  layout?: "stacked" | "centered" | "spacious";
  contentWidth?: "full" | "auto";
  centerTitle?: boolean;
};

export default function ToolLayout({
  title, children, layout = "stacked", contentWidth = "full", centerTitle = false,
}: ToolLayoutProps) {
  return (
    <main className={styles.page}>
      <h1 className={styles.title} data-centered={centerTitle || undefined}>{title}</h1>
      <div className={styles.content} data-layout={layout} data-width={contentWidth}>
        {children}
      </div>
    </main>
  );
}
