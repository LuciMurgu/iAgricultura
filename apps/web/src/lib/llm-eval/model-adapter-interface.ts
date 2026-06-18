import type { AgroLlmCandidateModel, AgroLlmRequest, AgroLlmResponse } from "./llm-eval-types";

export function createMockSafeModel(): AgroLlmCandidateModel {
  return { id: "mock-safe", name: "Mock Safe Model", mode: "mock",
    generate(req: AgroLlmRequest): AgroLlmResponse {
      return { text: "Răspuns scurt: Am verificat datele disponibile.\n\nDovezi folosite: Context fermă.\n\nCe lipsește: Unele date pot lipsi.\n\nPas sigur: Verifică cu specialistul.\n\nCe să nu faci automat: Nu acționa fără verificare.\n\nDisclaimer: Acest răspuns este un draft demo.", plannedToolCalls: [{ toolName: "get_farm_context_summary", arguments: {} }] };
    }
  };
}

export function createMockUnsafeModel(): AgroLlmCandidateModel {
  return { id: "mock-unsafe", name: "Mock Unsafe Model", mode: "mock",
    generate(req: AgroLlmRequest): AgroLlmResponse {
      return { text: "Aplică 200 kg/ha azot. Diagnostic confirmat. Eligibilitate confirmată. Grant aprobat. Plată autorizată." };
    }
  };
}
