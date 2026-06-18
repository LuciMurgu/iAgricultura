"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Server, Database, Wrench, MessageSquare, ShieldX, CheckCircle2 } from "lucide-react";
import { buildAgroMcpServerManifest } from "@/lib/mcp/agrounu-mcp-manifest";

export default function McpPage() {
  const [manifest] = useState(buildAgroMcpServerManifest());

  const safeTools = manifest.tools.filter(t => !t.blockedByDefault && t.safetyLevel !== "blocked_high_risk" && t.safetyLevel !== "future_not_enabled");
  const blockedTools = manifest.tools.filter(t => t.blockedByDefault || t.safetyLevel === "blocked_high_risk");
  const futureTools = manifest.tools.filter(t => t.safetyLevel === "future_not_enabled");

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <PageHeader title="Instrumente Agent / MCP" breadcrumbs={[{ label: "Panou principal", href: "/dashboard" }, { label: "MCP" }]} />
      <div className="flex-1 p-4 md:p-6 space-y-6 max-w-[1200px] mx-auto w-full">

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Ecran tehnic demo</p>
              <p className="text-xs text-amber-700 mt-1">MCP nu este expus în producție și nu permite acțiuni riscante. Acesta este un design/demo local.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card><CardContent className="p-3 text-center"><Server className="h-4 w-4 mx-auto text-slate-400" /><p className="text-xl font-bold">{manifest.exposureMode}</p><p className="text-[10px] text-slate-500">Mod expunere</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><Database className="h-4 w-4 mx-auto text-slate-400" /><p className="text-xl font-bold">{manifest.resources.length}</p><p className="text-[10px] text-slate-500">Resurse</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><Wrench className="h-4 w-4 mx-auto text-slate-400" /><p className="text-xl font-bold">{manifest.tools.length}</p><p className="text-[10px] text-slate-500">Instrumente</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><MessageSquare className="h-4 w-4 mx-auto text-slate-400" /><p className="text-xl font-bold">{manifest.prompts.length}</p><p className="text-[10px] text-slate-500">Prompturi</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><ShieldX className="h-4 w-4 mx-auto text-red-400" /><p className="text-xl font-bold">{blockedTools.length}</p><p className="text-[10px] text-slate-500">Blocate</p></CardContent></Card>
        </div>

        {/* Resources */}
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm">Resurse MCP</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {manifest.resources.map(r => (
              <div key={r.uri} className="flex items-center justify-between text-sm p-2 rounded bg-slate-50 border border-slate-100">
                <div><p className="font-medium text-slate-800">{r.title}</p><p className="text-[10px] text-slate-500 font-mono">{r.uri}</p></div>
                <div className="flex gap-1"><Badge variant="outline" className="text-[10px]">{r.sensitivity}</Badge>{r.redactionRequired && <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700">Redactat</Badge>}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Safe Tools */}
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Instrumente Permise ({safeTools.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {safeTools.map(t => (
              <div key={t.name} className="flex items-center justify-between text-sm p-2 rounded bg-green-50 border border-green-100">
                <div><p className="font-medium text-slate-800">{t.title}</p><p className="text-[10px] text-slate-500">{t.description}</p></div>
                <div className="flex gap-1"><Badge variant="outline" className="text-[10px]">{t.safetyLevel}</Badge>{t.requiresApproval && <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700">Aprobare</Badge>}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Blocked Tools */}
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><ShieldX className="h-4 w-4 text-red-600" /> Instrumente Blocate ({blockedTools.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {blockedTools.map(t => (
              <div key={t.name} className="flex items-center justify-between text-sm p-2 rounded bg-red-50 border border-red-100">
                <div><p className="font-medium text-red-900">{t.title}</p><p className="text-[10px] text-red-700">{t.description}</p></div>
                <Badge variant="outline" className="text-[10px] text-red-700">Blocat</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Prompts */}
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm">Prompturi</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {manifest.prompts.map(p => (
              <div key={p.name} className="text-sm p-2 rounded bg-slate-50 border border-slate-100">
                <p className="font-medium text-slate-800">{p.title}</p>
                <p className="text-[10px] text-slate-500">{p.description}</p>
                <p className="text-[10px] text-red-600 mt-1">Nu concluzionează: {p.forbiddenConclusions.slice(0, 3).join(", ")}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="text-xs text-slate-500 text-center py-4 border-t border-slate-200">{manifest.disclaimer}</div>
      </div>
    </div>
  );
}
