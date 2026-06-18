/**
 * ParcelMap — SVG-based parcel map with satellite imagery backgrounds.
 *
 * Each parcel polygon is clipped to show an aerial satellite image of the crop,
 * with a status-colored border (green = ok, amber = warning, red = danger).
 * Labels overlay the imagery with a subtle backdrop for readability.
 */
import { cn } from "@/lib/utils";
import type { Parcel } from "@/types/parcels";

interface ParcelMapProps {
  parcels: Parcel[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const STATUS_STROKES: Record<string, string> = {
  ok: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
};

// Image path per parcel ID
const PARCEL_IMAGES: Record<string, string> = {
  "P-01": "/images/parcels/p01-wheat-healthy.png",
  "P-02": "/images/parcels/p02-corn-bare.png",
  "P-03": "/images/parcels/p03-rapeseed.png",
  "P-04": "/images/parcels/p04-wheat-stressed.png",
  "P-05": "/images/parcels/p05-sunflower-bare.png",
  "P-06": "/images/parcels/p06-wheat-moderate.png",
};

// Polygon shapes and bounding boxes for image placement
const POLYGON_LAYOUTS: {
  points: string;
  labelX: number;
  labelY: number;
  // Bounding box for the image
  imgX: number;
  imgY: number;
  imgW: number;
  imgH: number;
}[] = [
  { points: "20,20 180,15 190,100 25,110", labelX: 100, labelY: 60, imgX: 20, imgY: 15, imgW: 170, imgH: 95 },
  { points: "200,15 380,20 375,105 195,100", labelX: 285, labelY: 58, imgX: 195, imgY: 15, imgW: 185, imgH: 90 },
  { points: "395,18 560,25 555,108 390,102", labelX: 475, labelY: 60, imgX: 390, imgY: 18, imgW: 170, imgH: 90 },
  { points: "22,130 185,125 190,210 28,220", labelX: 103, labelY: 170, imgX: 22, imgY: 125, imgW: 168, imgH: 95 },
  { points: "198,123 378,128 372,215 192,210", labelX: 283, labelY: 168, imgX: 192, imgY: 123, imgW: 186, imgH: 92 },
  { points: "392,126 558,130 552,218 388,212", labelX: 473, labelY: 170, imgX: 388, imgY: 126, imgW: 170, imgH: 92 },
];

export function ParcelMap({ parcels, selectedId, onSelect }: ParcelMapProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5">
      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-3">
        Hartă parcele — Iași
      </p>
      <svg
        viewBox="0 0 580 240"
        className="w-full h-auto max-h-[280px]"
        role="img"
        aria-label="Harta parcelelor agricole"
      >
        {/* Definitions: clip paths for each parcel */}
        <defs>
          {parcels.map((parcel, i) => {
            const layout = POLYGON_LAYOUTS[i];
            if (!layout) return null;
            return (
              <clipPath key={`clip-${parcel.id}`} id={`clip-${parcel.id}`}>
                <polygon points={layout.points} />
              </clipPath>
            );
          })}
          {/* Drop shadow filter for text readability */}
          <filter id="text-bg" x="-10%" y="-10%" width="120%" height="120%">
            <feFlood floodColor="rgba(0,0,0,0.55)" result="bg" />
            <feMerge>
              <feMergeNode in="bg" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width="580" height="240" fill="#f0f4f0" rx="8" />

        {parcels.map((parcel, i) => {
          const layout = POLYGON_LAYOUTS[i];
          if (!layout) return null;
          const stroke = STATUS_STROKES[parcel.status] ?? STATUS_STROKES.ok;
          const isSelected = selectedId === parcel.id;
          const imageSrc = PARCEL_IMAGES[parcel.id];

          return (
            <g
              key={parcel.id}
              className="cursor-pointer"
              onClick={() => onSelect(parcel.id)}
              role="button"
              tabIndex={0}
              aria-label={`${parcel.name} — ${parcel.area_ha} ha — ${parcel.crop}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelect(parcel.id);
              }}
            >
              {/* Satellite image clipped to polygon shape */}
              {imageSrc && (
                <image
                  href={imageSrc}
                  x={layout.imgX}
                  y={layout.imgY}
                  width={layout.imgW}
                  height={layout.imgH}
                  preserveAspectRatio="xMidYMid slice"
                  clipPath={`url(#clip-${parcel.id})`}
                  className="transition-opacity duration-200"
                  opacity={isSelected ? 1 : 0.88}
                />
              )}

              {/* Polygon border */}
              <polygon
                points={layout.points}
                fill="none"
                stroke={isSelected ? "#0f766e" : stroke}
                strokeWidth={isSelected ? 3 : 2}
                className="transition-all duration-200"
              />

              {/* Selection glow effect */}
              {isSelected && (
                <polygon
                  points={layout.points}
                  fill="none"
                  stroke="#0f766e"
                  strokeWidth={5}
                  opacity={0.25}
                  className="pointer-events-none"
                />
              )}

              {/* Label backdrop (semi-transparent rounded rect) */}
              <rect
                x={layout.labelX - 62}
                y={layout.labelY - 24}
                width={124}
                height={42}
                rx={6}
                fill="rgba(15, 23, 42, 0.65)"
                className="pointer-events-none"
              />

              {/* Parcel label */}
              <text
                x={layout.labelX}
                y={layout.labelY - 10}
                textAnchor="middle"
                className="text-[10px] font-bold fill-white pointer-events-none"
              >
                {parcel.id}
              </text>
              <text
                x={layout.labelX}
                y={layout.labelY + 2}
                textAnchor="middle"
                className="text-[8px] fill-slate-200 pointer-events-none"
              >
                {parcel.area_ha} ha · {parcel.crop}
              </text>
              <text
                x={layout.labelX}
                y={layout.labelY + 14}
                textAnchor="middle"
                className="text-[7px] fill-slate-300 pointer-events-none"
              >
                NDVI: {parcel.ndvi.toFixed(2)} · H₂O: {parcel.moisture_pct}%
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-green-100 border border-green-500" />
          Sănătos
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-500" />
          Atenție
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-red-100 border border-red-500" />
          Pericol
        </span>
      </div>
    </div>
  );
}
