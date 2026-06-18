"use client";

/**
 * InvoiceTable — TanStack Table implementation for the flagship invoice list.
 *
 * Columns: #, Furnizor, Produs (inferred), Linii, Total, Data, Status, Alerte
 * Features: sortable, expandable rows, batch select, sticky header, 44px rows.
 * Mobile: card-based responsive transformation.
 */
import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ExpandedState,
  type RowSelectionState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/shared/status-pill";
import { Currency } from "@/components/shared/currency";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Check,
} from "lucide-react";
import { useRightRailStore } from "@/hooks/use-right-rail-store";
import type { InvoiceListItem } from "@/types/invoices";
import { cn } from "@/lib/utils";

// ── Mobile Card ──────────────────────────────────────────────────────

function InvoiceMobileCard({
  invoice,
  isSelected,
  onToggleSelect,
  onClick,
}: {
  invoice: InvoiceListItem;
  isSelected: boolean;
  onToggleSelect: () => void;
  onClick: () => void;
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-slate-200 p-4 space-y-2 transition-shadow",
        isSelected && "ring-2 ring-brand-500 ring-offset-1",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2" onClick={onToggleSelect}>
          <Checkbox checked={isSelected} />
          <button
            type="button"
            className="text-left flex-1 min-w-0"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
          >
            <p className="text-sm font-semibold text-slate-900 truncate">
              {invoice.supplier_name}
            </p>
            {invoice.supplier_cui && (
              <p className="text-[11px] font-mono text-slate-400">
                CUI: {invoice.supplier_cui}
              </p>
            )}
          </button>
        </div>
        <StatusPill status={invoice.status} />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="font-mono text-xs text-slate-500">
          {invoice.invoice_number}
        </span>
        <span className="font-bold text-slate-900">
          <Currency value={invoice.total_amount ?? 0} />
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString("ro-RO") : "—"}
        </span>
        <span>
          {invoice.line_item_count ?? 0} {(invoice.line_item_count ?? 0) === 1 ? "linie" : "linii"}
          {invoice.alert_count > 0 && (
            <span className="ml-2 text-amber-600 font-medium">
              <AlertTriangle className="inline h-3 w-3 mr-0.5" />
              {invoice.alert_count}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

// ── Desktop Table ────────────────────────────────────────────────────

interface InvoiceTableProps {
  data: InvoiceListItem[];
}

export function InvoiceTable({ data }: InvoiceTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "invoice_date", desc: true },
  ]);
  const [expanded, setExpanded] = React.useState<ExpandedState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  const rightRail = useRightRailStore();

  const columns: ColumnDef<InvoiceListItem>[] = React.useMemo(
    () => [
      // Checkbox
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Selectează toate"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Selectează rândul"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        size: 40,
        enableSorting: false,
      },
      // Expand
      {
        id: "expand",
        header: () => null,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              row.toggleExpanded();
            }}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label={row.getIsExpanded() ? "Restrânge" : "Extinde"}
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ),
        size: 36,
        enableSorting: false,
      },
      // Invoice #
      {
        accessorKey: "invoice_number",
        header: "#",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs text-slate-600">
            {getValue<string | null>() ?? "—"}
          </span>
        ),
        size: 130,
        enableSorting: false,
      },
      // Supplier
      {
        accessorKey: "supplier_name",
        header: "Furnizor",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {row.original.supplier_name}
            </p>
            {row.original.supplier_cui && (
              <p className="text-[10px] font-mono text-slate-400">
                CUI: {row.original.supplier_cui}
              </p>
            )}
          </div>
        ),
        size: 200,
      },
      // Line items
      {
        accessorKey: "line_item_count",
        header: "Linii",
        cell: ({ getValue }) => (
          <span className="text-sm text-slate-600">{getValue<number>()}</span>
        ),
        size: 60,
      },
      // Total
      {
        accessorKey: "total_amount",
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 hover:text-slate-700 transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Total
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        ),
        cell: ({ getValue }) => {
          const v = getValue<number | null>();
          return (
            <span className="text-sm font-bold text-slate-900 text-right block">
              {v != null ? <Currency value={v} /> : "—"}
            </span>
          );
        },
        size: 140,
      },
      // Date
      {
        accessorKey: "invoice_date",
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 hover:text-slate-700 transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Data
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        ),
        cell: ({ getValue }) => {
          const v = getValue<string | null>();
          return (
            <span className="text-sm text-slate-600">
              {v ? new Date(v).toLocaleDateString("ro-RO") : "—"}
            </span>
          );
        },
        size: 100,
      },
      // Status
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => <StatusPill status={getValue<string>()} />,
        size: 130,
      },
      // Alerts
      {
        accessorKey: "alert_count",
        header: "Alerte",
        cell: ({ getValue }) => {
          const count = getValue<number>();
          if (count === 0) {
            return (
              <span className="text-slate-300 text-xs">—</span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
              <AlertTriangle className="h-3 w-3" />
              {count}
            </span>
          );
        },
        size: 80,
      },
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, expanded, rowSelection },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    enableRowSelection: true,
  });

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="space-y-3">
      {/* Batch actions bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 bg-brand-50 rounded-lg px-4 py-2.5 border border-brand-200">
          <span className="text-sm font-medium text-brand-700">
            {selectedCount} {selectedCount === 1 ? "factură selectată" : "facturi selectate"}
          </span>
          <Button size="sm" className="h-7 text-xs gap-1">
            <Check className="h-3 w-3" />
            Aprobă selecția
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-slate-500"
            onClick={() => setRowSelection({})}
          >
            Deselectează
          </Button>
        </div>
      )}

      {/* ── Desktop table ───────────────────────────────────── */}
      <div className="hidden md:block rounded-xl border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b border-slate-200">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 h-10"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-sm text-slate-400"
                >
                  Nicio factură găsită.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow
                    className={cn(
                      "h-11 cursor-pointer transition-colors",
                      row.getIsSelected() && "bg-brand-50/50",
                      row.getIsExpanded() && "bg-slate-50",
                    )}
                    onClick={() => {
                      rightRail.open({
                        tab: "alerte",
                        itemId: row.original.id,
                      });
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="py-2"
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Expanded row detail */}
                  {row.getIsExpanded() && (
                    <TableRow className="bg-slate-50/80">
                      <TableCell
                        colSpan={columns.length}
                        className="px-6 py-4"
                      >
                        <InvoiceRowDetail invoice={row.original} />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Mobile card list ─────────────────────────────────── */}
      <div className="md:hidden space-y-2">
        {data.map((invoice, idx) => (
          <InvoiceMobileCard
            key={invoice.id}
            invoice={invoice}
            isSelected={!!rowSelection[idx]}
            onToggleSelect={() =>
              setRowSelection((prev) => ({
                ...prev,
                [idx]: !prev[idx],
              }))
            }
            onClick={() =>
              rightRail.open({ tab: "alerte", itemId: invoice.id })
            }
          />
        ))}
      </div>
    </div>
  );
}

// ── Expanded Row Detail ─────────────────────────────────────────────

function InvoiceRowDetail({ invoice }: { invoice: InvoiceListItem }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">
            Date factură
          </p>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-slate-500">Număr:</span>{" "}
              <span className="font-mono font-medium">{invoice.invoice_number}</span>
            </p>
            <p>
              <span className="text-slate-500">Furnizor:</span>{" "}
              <span className="font-medium">{invoice.supplier_name}</span>
            </p>
            {invoice.supplier_cui && (
              <p>
                <span className="text-slate-500">CUI:</span>{" "}
                <span className="font-mono">{invoice.supplier_cui}</span>
              </p>
            )}
            <p>
              <span className="text-slate-500">Data emiterii:</span>{" "}
              {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString("ro-RO") : "—"}
            </p>
            <p>
              <span className="text-slate-500">Sursă:</span>{" "}
              {(invoice.source ?? "xml_upload") === "anaf_spv" ? "ANAF SPV" : "Upload XML"}
            </p>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">
            Sumar linii
          </p>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-slate-500">Linii produs:</span>{" "}
              <span className="font-medium">{invoice.line_item_count ?? "—"}</span>
            </p>
            <p>
              <span className="text-slate-500">Total cu TVA:</span>{" "}
              <span className="font-bold">
                <Currency value={invoice.total_amount ?? 0} />
              </span>
            </p>
            {invoice.alert_count > 0 && (
              <p className="flex items-center gap-1 text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                {invoice.alert_count} {invoice.alert_count === 1 ? "alertă activă" : "alerte active"}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-200">
        <p className="text-xs text-slate-400">
          Faceți clic pe rând pentru detalii complete în panoul lateral →
        </p>
      </div>
    </div>
  );
}
