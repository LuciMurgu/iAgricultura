/**
 * Central safe-language assertion helper.
 *
 * FOP18 — aggregates all unsafe phrases from FOP15/16/17 + pilot-specific.
 * Pure, deterministic, no external APIs. Used across all modules.
 */

// ── Unsafe Phrases — English ─────────────────────────────────────────

const UNSAFE_EN: readonly string[] = [
  // FOP15/16 — outcome navigation / cooperative intelligence
  "ai recommendation", "automatic decision", "ask anything",
  "chatbot decides", "best option", "optimal action",
  "diagnose", "diagnosis confirmed", "prescribe",
  "apply fertilizer now", "spray now", "irrigate now",
  "buy now", "sell now", "eligibility confirmed",
  "grant approved", "contract ready", "payment ready",
  "quality certified", "financial advice", "legal advice", "tax advice",
  "guaranteed result", "guaranteed price", "guaranteed savings",
  // FOP17 — setup wizard
  "official registration", "official declaration",
  "apia submitted", "anaf submitted", "afir submitted",
  "verified legally", "cadastral proof",
  "compliance confirmed", "document approved", "official approval",
  "diagnosis", "prescription",
  "apply now", "contract created", "payment triggered",
  "production consent stored", "gdpr compliant",
  "legal compliance guaranteed",
  // FOP18 — pilot hardening
  "prescribed treatment", "best supplier",
  "contract signed", "payment sent", "invoice issued",
  "official answer",
];

// ── Unsafe Phrases — Romanian ────────────────────────────────────────

const UNSAFE_RO: readonly string[] = [
  // FOP15/16
  "recomandare ai", "decizie automată", "întreabă orice",
  "chatbotul decide", "cea mai bună opțiune", "acțiune optimă",
  "diagnostic confirmat", "prescripție",
  "aplică îngrășământ acum", "stropește acum", "irigă acum",
  "cumpără acum", "vinde acum",
  "eligibilitate confirmată", "grant aprobat",
  "contract pregătit", "plată pregătită",
  "calitate certificată",
  "consultanță financiară", "consultanță juridică", "consultanță fiscală",
  "rezultat garantat", "preț garantat", "economii garantate",
  // FOP17
  "înregistrare oficială", "declarație oficială",
  "depus la apia", "depus la anaf", "depus la afir",
  "verificat juridic", "dovadă cadastrală",
  "conformitate confirmată", "document aprobat", "aprobare oficială",
  "diagnostic", "aplică acum",
  "contract creat", "plată declanșată",
  "consimțământ de producție stocat", "conform gdpr",
  "conformitate juridică garantată",
  // FOP18
  "tratament prescris", "cel mai bun furnizor",
  "contract semnat", "plată trimisă", "factură emisă",
  "răspuns oficial",
];

const ALL_UNSAFE: readonly string[] = [...UNSAFE_EN, ...UNSAFE_RO];

// ── Public API ───────────────────────────────────────────────────────

export interface SafeLanguageResult {
  safe: boolean;
  violations: string[];
}

/**
 * Check text for unsafe phrases. Returns safe=true if none found.
 * Case-insensitive substring matching.
 */
export function assertSafeLanguage(text: string): SafeLanguageResult {
  const lower = text.toLowerCase();
  const violations = ALL_UNSAFE.filter((p) => lower.includes(p));
  return { safe: violations.length === 0, violations };
}

/**
 * Check text for unsafe English phrases only.
 */
export function assertSafeLanguageEN(text: string): SafeLanguageResult {
  const lower = text.toLowerCase();
  const violations = UNSAFE_EN.filter((p) => lower.includes(p));
  return { safe: violations.length === 0, violations };
}

/**
 * Check text for unsafe Romanian phrases only.
 */
export function assertSafeLanguageRO(text: string): SafeLanguageResult {
  const lower = text.toLowerCase();
  const violations = UNSAFE_RO.filter((p) => lower.includes(p));
  return { safe: violations.length === 0, violations };
}

/** All unsafe phrases (for test/audit use). */
export function getUnsafePhrases(): { en: readonly string[]; ro: readonly string[]; all: readonly string[] } {
  return { en: UNSAFE_EN, ro: UNSAFE_RO, all: ALL_UNSAFE };
}
