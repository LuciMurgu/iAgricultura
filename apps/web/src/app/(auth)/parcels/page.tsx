"use client";

/**
 * Parcels page — Senzori virtuali.
 *
 * SVG parcel map + parcel cards + sensor detail panel.
 * ALL DATA IS MOCKED — but the UX feels completely real.
 * Every sensor value shows AILabel with "Simulat prin PINNs" explanation.
 *
 * Prompt 08 from PROMPT_SEQUENCE.md
 */
import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ParcelMap } from "@/components/parcels/parcel-map";
import { ParcelCard } from "@/components/parcels/parcel-card";
import { SensorPanel } from "@/components/parcels/sensor-panel";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useParcels } from "@/hooks/use-parcels";
import { Map } from "lucide-react";

function ParcelsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[200px] w-full rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-2.5 w-2.5 rounded-full" />
              <Skeleton className="h-4 w-32 rounded" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-14 rounded-lg" />
              <Skeleton className="h-14 rounded-lg" />
            </div>
            <Skeleton className="h-3 w-24 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ParcelsPage() {
  const { data: parcels, isLoading } = useParcels();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const selectedParcel = parcels?.find((p) => p.id === selectedId) ?? null;
  const totalArea = parcels?.reduce((sum, p) => sum + p.area_ha, 0) ?? 0;

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Parcele — Senzori virtuali"
        breadcrumbs={[
          { label: "Panou principal", href: "/dashboard" },
          { label: "Parcele" },
        ]}
        statusPill={
          <Badge variant="secondary" className="text-[11px] bg-amber-50 text-amber-700 border-amber-200">
            Pillar II — PINNs
          </Badge>
        }
        actions={
          parcels && (
            <Badge variant="outline" className="text-[11px]">
              {parcels.length} parcele · {totalArea} ha
            </Badge>
          )
        }
      />

      <div className="flex-1 p-4 md:p-6 max-w-[1400px]">
        {isLoading ? (
          <ParcelsSkeleton />
        ) : !parcels || parcels.length === 0 ? (
          <EmptyState
            icon={Map}
            title="Nicio parcelă înregistrată"
            description="Adăugați parcele pentru a activa senzorii virtuali și monitorizarea satelitară."
          />
        ) : (
          <div className="space-y-6">
            {/* SVG Map */}
            <ParcelMap
              parcels={parcels}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
            />

            {/* Content: cards + optional sensor panel */}
            <div className={selectedParcel ? "grid grid-cols-1 lg:grid-cols-5 gap-6" : ""}>
              {/* Parcel cards */}
              <div className={selectedParcel ? "lg:col-span-2" : ""}>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
                  Detalii parcele ({parcels.length})
                </h3>
                <div className={selectedParcel
                  ? "space-y-2"
                  : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
                }>
                  {parcels.map((parcel) => (
                    <ParcelCard
                      key={parcel.id}
                      parcel={parcel}
                      isSelected={parcel.id === selectedId}
                      onSelect={() =>
                        setSelectedId(parcel.id === selectedId ? null : parcel.id)
                      }
                    />
                  ))}
                </div>
              </div>

              {/* Sensor detail panel */}
              {selectedParcel && (
                <div className="lg:col-span-3">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
                    Senzori — {selectedParcel.name}
                  </h3>
                  <SensorPanel parcel={selectedParcel} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
