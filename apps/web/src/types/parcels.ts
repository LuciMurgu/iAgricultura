/**
 * Parcel + sensor Zod schemas.
 * Gate: MOCK — no backend endpoint yet.
 * Source: MOCK_STRATEGY.md + PROMPT_SEQUENCE.md Prompt 08
 */
import { z } from "zod";

// ── Sensor Reading ────────────────────────────────────────────────────

export const SensorReadingSchema = z.object({
  type: z.enum(["moisture", "nutrient", "compaction"]),
  label: z.string(),
  value: z.number(),
  unit: z.string(),
  depth_cm: z.number().nullable(),
  status: z.enum(["ok", "warning", "danger"]),
  confidence: z.number(),
  last_updated: z.string().datetime(),
});
export type SensorReading = z.infer<typeof SensorReadingSchema>;

// ── Weather Forecast ──────────────────────────────────────────────────

export const WeatherForecastSchema = z.object({
  date: z.string(),
  temp_min: z.number(),
  temp_max: z.number(),
  precipitation_mm: z.number(),
  wind_kmh: z.number(),
  condition: z.string(),
  work_recommendation: z.enum(["go", "caution", "no_go"]),
});
export type WeatherForecast = z.infer<typeof WeatherForecastSchema>;

// ── APIA Compliance ───────────────────────────────────────────────────

export const ApiaComplianceSchema = z.object({
  registered: z.boolean(),
  geotag_photos: z.number().int(),
  photos_required: z.number().int(),
  culture_verified: z.boolean(),
  declaration_submitted: z.boolean(),
});
export type ApiaCompliance = z.infer<typeof ApiaComplianceSchema>;

// ── Parcel ────────────────────────────────────────────────────────────

export const ParcelSchema = z.object({
  id: z.string(),
  name: z.string(),
  area_ha: z.number(),
  crop: z.string(),
  commune: z.string(),
  village: z.string(),
  ndvi: z.number(),
  moisture_pct: z.number(),
  status: z.enum(["ok", "warning", "danger"]),
  last_satellite_update: z.string().datetime(),
  sensors: z.array(SensorReadingSchema),
  weather_forecast: z.array(WeatherForecastSchema),
  apia: ApiaComplianceSchema,
});
export type Parcel = z.infer<typeof ParcelSchema>;

// ── Parcel List ───────────────────────────────────────────────────────

export const ParcelListSchema = z.array(ParcelSchema);
export type ParcelList = z.infer<typeof ParcelListSchema>;
