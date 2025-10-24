import { ReactNode } from "react";

export interface InsightItem {
  id: string;
  heading: string;
  detail?: string;
  tag?: string;
}

interface InsightPanelProps {
  title: string;
  subtitle?: string;
  items: InsightItem[];
  footer?: ReactNode;
  onSelect?: (item: InsightItem) => void;
  selectedId?: string | null;
}

export function InsightPanel({
  title,
  subtitle,
  items,
  footer,
  onSelect,
  selectedId,
}: InsightPanelProps) {
  const interactive = typeof onSelect === "function";

  return (
    <section className="flex flex-col gap-5 rounded-3xl border border-slate-200/40 bg-white/80 p-6 text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.15)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-100">
      <header className="flex flex-col gap-1">
        <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>
        )}
      </header>
      <div className="flex flex-col gap-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nothing to show here yet.
          </p>
        ) : (
          items.map((item) => {
            const isActive = selectedId === item.id;
            const baseClasses =
              "rounded-2xl border border-slate-200/40 bg-white/70 p-4 text-left shadow-sm transition dark:border-white/10 dark:bg-white/5";
            const interactiveClasses = interactive
              ? "hover:border-slate-300/70 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 dark:hover:border-white/20 dark:hover:bg-slate-900/40"
              : "";
            const activeClasses = isActive
              ? "border-slate-900/50 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.18)] dark:border-slate-200/20 dark:bg-slate-900/60"
              : "";
            const itemClasses = [
              baseClasses,
              interactive ? "w-full" : "",
              interactiveClasses,
              activeClasses,
            ]
              .filter(Boolean)
              .join(" ");

            const inner = (
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {item.heading}
                  </p>
                  {item.detail && (
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {item.detail}
                    </p>
                  )}
                </div>
                {item.tag && (
                  <span className="rounded-full bg-slate-900/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white dark:bg-slate-200/20 dark:text-slate-100">
                    {item.tag}
                  </span>
                )}
              </div>
            );

            if (interactive) {
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onSelect?.(item)}
                  className={itemClasses}
                >
                  {inner}
                </button>
              );
            }

            return (
              <div key={item.id} className={itemClasses}>
                {inner}
              </div>
            );
          })
        )}
      </div>
      {footer && <div className="pt-2 text-xs text-slate-500 dark:text-slate-400">{footer}</div>}
    </section>
  );
}
