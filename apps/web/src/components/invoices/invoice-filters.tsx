"use client";

/**
 * Invoice filter bar — status dropdown + date range (future) + supplier search.
 */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface InvoiceFiltersProps {
  statusFilter: string;
  onStatusChange: (status: string) => void;
  supplierSearch: string;
  onSupplierSearchChange: (value: string) => void;
}

const STATUS_OPTIONS = [
  { value: "all", label: "Toate" },
  { value: "completed", label: "Sincronizate" },
  { value: "needs_review", label: "Necesită revizuire" },
  { value: "pending", label: "În așteptare" },
  { value: "processing", label: "Se procesează" },
  { value: "error", label: "Eroare" },
] as const;

export function InvoiceFilters({
  statusFilter,
  onStatusChange,
  supplierSearch,
  onSupplierSearchChange,
}: InvoiceFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-[200px] h-9 text-sm">
          <SelectValue placeholder="Filtru status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative w-full sm:w-[260px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          type="text"
          placeholder="Caută furnizor..."
          value={supplierSearch}
          onChange={(e) => onSupplierSearchChange(e.target.value)}
          className="pl-8 h-9 text-sm"
        />
      </div>
    </div>
  );
}
