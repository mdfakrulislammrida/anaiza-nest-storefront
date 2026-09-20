import type { ReactNode } from "react";

export default function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="group border-b border-line py-4" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-ink">
        {title}
        <span className="text-lg text-muted transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="mt-3 text-sm leading-relaxed text-ink/80">{children}</div>
    </details>
  );
}
