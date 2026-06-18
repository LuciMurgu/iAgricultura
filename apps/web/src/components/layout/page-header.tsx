"use client";

import { type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  /** Optional status indicator next to title (e.g. "Sincronizat", "Neprocesat") */
  statusPill?: ReactNode;
  /** CTA buttons or other actions — rendered right-aligned */
  actions?: ReactNode;
  className?: string;
}

/**
 * Standardized page header.
 * Renders: breadcrumb > title + optional status pill + optional actions.
 * Designed to be placed at the top of each (auth) page's main content.
 */
export function PageHeader({
  title,
  breadcrumbs,
  statusPill,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-200 bg-white",
        className,
      )}
    >
      <div className="min-w-0">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-1">
            <ol className="flex items-center gap-1 text-xs text-slate-500">
              {breadcrumbs.map((crumb, i) => (
                <li key={i} className="flex items-center gap-1">
                  {i > 0 && (
                    <ChevronRight size={12} className="text-slate-300" aria-hidden="true" />
                  )}
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="hover:text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 rounded"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="text-slate-700 font-medium">
                      {crumb.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Title row */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl font-semibold text-slate-900 leading-tight truncate">
            {title}
          </h1>
          {statusPill}
        </div>
      </div>

      {/* Actions */}
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
      )}
    </header>
  );
}
