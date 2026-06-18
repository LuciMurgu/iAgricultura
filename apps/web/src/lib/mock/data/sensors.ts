/**
 * Mock sensor readings — re-exports from parcels.
 * Sensor data is embedded in each parcel. This module provides
 * aggregated access for the sensor dashboard view.
 */
import { mockParcels } from "./parcels";
import type { SensorReading } from "@/types/parcels";

export interface SensorSummary {
  parcel_id: string;
  parcel_name: string;
  readings: SensorReading[];
}

export const mockSensors = {
  /** All sensor readings across all parcels */
  listAll: (): SensorSummary[] =>
    mockParcels.list().map((p) => ({
      parcel_id: p.id,
      parcel_name: p.name,
      readings: p.sensors,
    })),

  /** Sensor readings for a specific parcel */
  getByParcelId: (parcelId: string): SensorReading[] => {
    const parcel = mockParcels.getById(parcelId);
    return parcel?.sensors ?? [];
  },
};
