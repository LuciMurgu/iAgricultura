/**
 * ParcelCard — summary card for a single parcel.
 *
 * Shows: status dot, name, area, crop, NDVI (color-coded),
 * moisture (color-coded), last satellite update, APIA photo count + compliance.
 */
import { Badge } from "@/components/ui/badge";
import { RelativeTime } from "@/components/shared/relative-time";
import { Camera, CheckCircle2, XCircle, Satellite } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Parcel } from "@/types/parcels";

interface ParcelCardProps {
  parcel: Parcel;
  isSelected: boolean;
  onSelect: () => void;
}

function ndviColor(ndvi: number): string {
  if (ndvi >= 0.7) return "text-green-700 bg-green-50";
  if (ndvi >= 0.4) return "text-amber-700 bg-amber-50";
  if (ndvi > 0) return "text-red-700 bg-red-50";
  return "text-slate-400 bg-slate-50";
}

function moistureColor(pct: number): string {
  if (pct >= 25 && pct <= 35) return "text-green-700";
  if (pct >= 18 && pct < 25) return "text-amber-700";
  if (pct < 18) return "text-red-700";
  return "text-blue-700"; // over-saturated
}

const STATUS_DOT: Record<string, string> = {
  ok: "bg-green-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
};

export function ParcelCard({ parcel, isSelected, onSelect }: ParcelCardProps) {
  const apiaComplete =
    parcel.apia.registered &&
    parcel.apia.culture_verified &&
    parcel.apia.declaration_submitted &&
    parcel.apia.geotag_photos >= parcel.apia.photos_required;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left bg-white rounded-xl border border-slate-200 p-4 space-y-3 transition-all hover:shadow-sm",
        isSelected && "ring-2 ring-brand-500 ring-offset-1 border-brand-300",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", STATUS_DOT[parcel.status])} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {parcel.name}
            </p>
            <p className="text-[11px] text-slate-500">
              {parcel.area_ha} ha · {parcel.crop}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] shrink-0">
          {parcel.commune}
        </Badge>
      </div>

      {/* Indicators */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-50 rounded-lg px-3 py-2">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">NDVI</p>
          <p className={cn("text-lg font-bold", ndviColor(parcel.ndvi).split(" ")[0])}>
            {parcel.ndvi > 0 ? parcel.ndvi.toFixed(2) : "—"}
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg px-3 py-2">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Umiditate</p>
          <p className={cn("text-lg font-bold", moistureColor(parcel.moisture_pct))}>
            {parcel.moisture_pct}%
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Satellite className="h-3 w-3" />
          <RelativeTime date={parcel.last_satellite_update} className="text-[11px]" />
        </span>
        <span className="flex items-center gap-1.5">
          <Camera className="h-3 w-3" />
          <span>{parcel.apia.geotag_photos}/{parcel.apia.photos_required}</span>
          {apiaComplete ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-amber-500" />
          )}
        </span>
      </div>
    </button>
  );
}
