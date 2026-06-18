"use client";

/**
 * SensorPanel — detailed sensor readings for a selected parcel.
 *
 * CRITICAL: Every sensor value shows AILabel with PINNs explanation.
 * Sections: Moisture (depth-based), Nutrients (N-P-K), Compaction (Go/No-Go),
 * Weather (3-day forecast), APIA compliance checklist.
 */
import { AILabel } from "@/components/shared/ai-label";
import { RelativeTime } from "@/components/shared/relative-time";
import { Badge } from "@/components/ui/badge";
import {
  Droplets,
  FlaskConical,
  Tractor,
  CloudSun,
  Sun,
  CloudRain,
  Cloud,
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Parcel, SensorReading, WeatherForecast } from "@/types/parcels";

const PINNS_REASONING =
  "Estimare bazată pe: date satelitare Sentinel-2 + model meteo + hartă pedologică.";

interface SensorPanelProps {
  parcel: Parcel;
}

// ── Status indicator ─────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  ok: { bg: "bg-green-50", text: "text-green-700", label: "OK" },
  warning: { bg: "bg-amber-50", text: "text-amber-700", label: "Atenție" },
  danger: { bg: "bg-red-50", text: "text-red-700", label: "Pericol" },
};

function SensorRow({ sensor }: { sensor: SensorReading }) {
  const status = STATUS_STYLES[sensor.status] ?? STATUS_STYLES.ok;

  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-700 truncate">{sensor.label}</p>
        {sensor.depth_cm && (
          <p className="text-[10px] text-slate-400">Profunzime: {sensor.depth_cm}cm</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={cn("text-sm font-bold", status.text)}>
          {sensor.type === "compaction"
            ? sensor.value <= 0.3
              ? "Go"
              : sensor.value <= 0.5
                ? "Precauție"
                : "No-Go"
            : `${sensor.value}${sensor.unit ? ` ${sensor.unit}` : ""}`}
        </span>
        <Badge variant="secondary" className={cn("text-[9px] px-1 py-0", status.bg, status.text)}>
          {status.label}
        </Badge>
        <AILabel
          source="PINNs"
          confidence={sensor.confidence}
          reasoning={`${PINNS_REASONING} Ultima actualizare satelit: ${new Date(sensor.last_updated).toLocaleDateString("ro-RO")}.`}
        />
      </div>
    </div>
  );
}

// ── Weather forecast ─────────────────────────────────────────────────

const WORK_REC: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  go: { label: "Go", color: "text-green-700 bg-green-50", icon: <Sun className="h-3.5 w-3.5" /> },
  caution: { label: "Precauție", color: "text-amber-700 bg-amber-50", icon: <Cloud className="h-3.5 w-3.5" /> },
  no_go: { label: "No-Go", color: "text-red-700 bg-red-50", icon: <CloudRain className="h-3.5 w-3.5" /> },
};

function WeatherRow({ forecast }: { forecast: WeatherForecast }) {
  const rec = WORK_REC[forecast.work_recommendation] ?? WORK_REC.caution;
  const date = new Date(forecast.date);
  const dayName = date.toLocaleDateString("ro-RO", { weekday: "short" });

  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-2">
        <CloudSun className="h-4 w-4 text-slate-400" />
        <div>
          <p className="text-sm text-slate-700 capitalize">{dayName} {date.getDate()}</p>
          <p className="text-[10px] text-slate-400">{forecast.condition}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="text-slate-500">
          {forecast.temp_min}°/{forecast.temp_max}°
        </span>
        {forecast.precipitation_mm > 0 && (
          <span className="text-blue-600">{forecast.precipitation_mm}mm</span>
        )}
        <Badge variant="secondary" className={cn("text-[10px] gap-1 px-1.5", rec.color)}>
          {rec.icon}
          {rec.label}
        </Badge>
      </div>
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────

export function SensorPanel({ parcel }: SensorPanelProps) {
  const moistureSensors = parcel.sensors.filter((s) => s.type === "moisture");
  const nutrientSensors = parcel.sensors.filter((s) => s.type === "nutrient");
  const compactionSensors = parcel.sensors.filter((s) => s.type === "compaction");

  const apiaComplete =
    parcel.apia.registered &&
    parcel.apia.culture_verified &&
    parcel.apia.declaration_submitted &&
    parcel.apia.geotag_photos >= parcel.apia.photos_required;

  return (
    <div className="space-y-5">
      {/* ── Moisture ──────────────────────────────────── */}
      {moistureSensors.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Droplets className="h-4 w-4 text-blue-500" />
            <h4 className="text-sm font-semibold text-slate-900">VS-Moisture — Umiditate sol</h4>
          </div>
          {moistureSensors.map((s, i) => (
            <SensorRow key={i} sensor={s} />
          ))}
        </div>
      )}

      {/* ── Nutrients ─────────────────────────────────── */}
      {nutrientSensors.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical className="h-4 w-4 text-violet-500" />
            <h4 className="text-sm font-semibold text-slate-900">VS-Nutrients — N-P-K estimat</h4>
          </div>
          {nutrientSensors.map((s, i) => (
            <SensorRow key={i} sensor={s} />
          ))}
        </div>
      )}

      {/* ── Compaction ────────────────────────────────── */}
      {compactionSensors.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Tractor className="h-4 w-4 text-orange-500" />
            <h4 className="text-sm font-semibold text-slate-900">Risc tasare — Go/No-Go</h4>
          </div>
          {compactionSensors.map((s, i) => (
            <SensorRow key={i} sensor={s} />
          ))}
        </div>
      )}

      {/* ── Weather ───────────────────────────────────── */}
      {parcel.weather_forecast.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CloudSun className="h-4 w-4 text-sky-500" />
            <h4 className="text-sm font-semibold text-slate-900">Prognoză 3 zile + recomandări</h4>
          </div>
          {parcel.weather_forecast.map((f, i) => (
            <WeatherRow key={i} forecast={f} />
          ))}
        </div>
      )}

      {/* ── APIA Compliance ───────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Camera className="h-4 w-4 text-teal-500" />
          <h4 className="text-sm font-semibold text-slate-900">Conformitate APIA</h4>
          {apiaComplete ? (
            <Badge variant="secondary" className="text-[10px] bg-green-50 text-green-700">Complet</Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700">Incomplet</Badge>
          )}
        </div>

        <div className="space-y-2">
          <ComplianceRow
            label="Parcelă înregistrată APIA"
            done={parcel.apia.registered}
          />
          <ComplianceRow
            label={`Fotografii geoetichetate (${parcel.apia.geotag_photos}/${parcel.apia.photos_required})`}
            done={parcel.apia.geotag_photos >= parcel.apia.photos_required}
          />
          <ComplianceRow
            label="Cultură verificată"
            done={parcel.apia.culture_verified}
          />
          <ComplianceRow
            label="Declarație unică depusă"
            done={parcel.apia.declaration_submitted}
          />
        </div>
      </div>

      {/* Source attribution */}
      <p className="text-[10px] text-slate-400 text-center px-4">
        Date simulate prin PINNs (Physics-Informed Neural Networks).
        Ultima actualizare satelit:{" "}
        <RelativeTime date={parcel.last_satellite_update} className="text-[10px]" />
      </p>
    </div>
  );
}

function ComplianceRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-slate-700">{label}</span>
      {done ? (
        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-amber-500 shrink-0" />
      )}
    </div>
  );
}
