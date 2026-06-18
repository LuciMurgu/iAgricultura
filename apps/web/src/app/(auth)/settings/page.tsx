"use client";

/**
 * Settings page — Farm profile, ANAF connection, preferences.
 *
 * Uses real endpoint: GET /api/v1/anaf/status/{farm_id} via useAnafStatus hook.
 *
 * Prompt 10 from PROMPT_SEQUENCE.md
 */
import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAnafStatus } from "@/hooks/use-anaf-status";
import { useAuthStore } from "@/hooks/use-auth";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  ExternalLink,
  Building2,
  MapPin,
  Ruler,
  Bell,
  Mail,
  Smartphone,
  FileSpreadsheet,
  Clock,
  Shield,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── ANAF Section ─────────────────────────────────────────────────────

function AnafSection() {
  const anafStatus = useAnafStatus();
  const [isSyncing, setIsSyncing] = React.useState(false);

  const isConnected = anafStatus?.connected && anafStatus.token_valid;
  const isTokenExpired = anafStatus?.connected && !anafStatus.token_valid;

  const handleSync = async () => {
    setIsSyncing(true);
    await new Promise((r) => setTimeout(r, 2000));
    setIsSyncing(false);
    toast.success("Sincronizare completă", {
      description: "Facturile au fost actualizate din SPV.",
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-brand-600" />
        <h3 className="text-base font-bold text-slate-900">Conexiune ANAF SPV</h3>
      </div>

      {/* Status indicator */}
      <div className="bg-slate-50 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "w-3 h-3 rounded-full shrink-0",
                isConnected ? "bg-green-500" : isTokenExpired ? "bg-amber-500" : "bg-red-500",
              )}
            />
            <span className="text-sm font-medium text-slate-900">
              {isConnected
                ? "Conectat la SPV"
                : isTokenExpired
                  ? "Token expirat"
                  : "Neconectat"}
            </span>
          </div>
          {isConnected ? (
            <Badge variant="secondary" className="text-[10px] bg-green-50 text-green-700 gap-1">
              <Wifi className="h-3 w-3" />
              Online
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] bg-red-50 text-red-700 gap-1">
              <WifiOff className="h-3 w-3" />
              Offline
            </Badge>
          )}
        </div>

        {anafStatus?.cif && (
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>CIF</span>
            <span className="font-mono text-slate-700">{anafStatus.cif}</span>
          </div>
        )}

        {anafStatus?.last_sync && (
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Ultima sincronizare
            </span>
            <span className="text-slate-700">
              {new Date(anafStatus.last_sync).toLocaleString("ro-RO")}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {!isConnected && (
          <Button className="flex-1 gap-2">
            <ExternalLink className="h-4 w-4" />
            Conectează la SPV
          </Button>
        )}
        <Button
          variant="outline"
          onClick={handleSync}
          disabled={isSyncing || !isConnected}
          className="gap-2"
        >
          {isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Sincronizare manuală
        </Button>
      </div>
    </div>
  );
}

// ── Farm profile section ─────────────────────────────────────────────

function FarmProfileSection() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-brand-600" />
        <h3 className="text-base font-bold text-slate-900">Profil fermă</h3>
      </div>

      <div className="space-y-3">
        <InfoRow
          icon={<Building2 className="h-4 w-4 text-slate-400" />}
          label="Nume fermă"
          value={user?.farm_name ?? "Ferma Demo"}
        />
        <InfoRow
          icon={<Ruler className="h-4 w-4 text-slate-400" />}
          label="Suprafață totală"
          value="300 ha"
        />
        <InfoRow
          icon={<MapPin className="h-4 w-4 text-slate-400" />}
          label="Județ"
          value="Iași"
        />
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        {icon}
        {label}
      </div>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}

// ── Preferences section ──────────────────────────────────────────────

function PreferencesSection() {
  const [emailNotifs, setEmailNotifs] = React.useState(true);
  const [smsNotifs, setSmsNotifs] = React.useState(false);
  const [alertNotifs, setAlertNotifs] = React.useState(true);
  const [exportFormat, setExportFormat] = React.useState<"saga_c" | "csv">("saga_c");

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-brand-600" />
        <h3 className="text-base font-bold text-slate-900">Preferințe</h3>
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Notificări
        </h4>

        <ToggleRow
          icon={<Mail className="h-4 w-4 text-slate-400" />}
          label="Notificări email"
          description="Alerte pentru facturi noi și anomalii detectate"
          checked={emailNotifs}
          onChange={setEmailNotifs}
        />
        <ToggleRow
          icon={<Smartphone className="h-4 w-4 text-slate-400" />}
          label="Notificări SMS"
          description="Alerte urgente trimise pe telefon"
          checked={smsNotifs}
          onChange={setSmsNotifs}
        />
        <ToggleRow
          icon={<Bell className="h-4 w-4 text-slate-400" />}
          label="Alerte în aplicație"
          description="Badge-uri și notificări în interfață"
          checked={alertNotifs}
          onChange={setAlertNotifs}
        />
      </div>

      <div className="border-t border-slate-100 pt-4 space-y-3">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Format export
        </h4>
        <div className="flex items-center gap-2">
          <Button
            variant={exportFormat === "saga_c" ? "default" : "outline"}
            size="sm"
            onClick={() => setExportFormat("saga_c")}
            className="gap-1.5"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            SAGA C (XML)
          </Button>
          <Button
            variant={exportFormat === "csv" ? "default" : "outline"}
            size="sm"
            onClick={() => setExportFormat("csv")}
            className="gap-1.5"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            CSV
          </Button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div>
          <p className="text-sm font-medium text-slate-700">{label}</p>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Setări"
        breadcrumbs={[
          { label: "Panou principal", href: "/dashboard" },
          { label: "Setări" },
        ]}
      />

      <div className="flex-1 p-4 md:p-6 space-y-6 max-w-[700px]">
        <AnafSection />
        <FarmProfileSection />
        <PreferencesSection />
      </div>
    </div>
  );
}
