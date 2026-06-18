/**
 * Farmer Pilot Safe Language tests.
 * FOP18 — central safe-language module with all EN + RO unsafe phrases.
 */
import { describe, it, expect } from "vitest";
import {
  assertSafeLanguage, assertSafeLanguageEN, assertSafeLanguageRO,
  getUnsafePhrases,
} from "@/lib/safe-language";

describe("Central safe-language — EN", () => {
  const cases = [
    "AI recommendation", "automatic decision", "diagnosis confirmed",
    "prescribed treatment", "apply fertilizer now", "spray now", "irrigate now",
    "buy now", "sell now", "best supplier", "guaranteed price", "guaranteed savings",
    "eligibility confirmed", "grant approved", "contract ready", "contract signed",
    "payment ready", "payment sent", "invoice issued", "quality certified",
    "GDPR compliant", "official approval", "official answer",
    "legal advice", "tax advice", "financial advice",
    "official registration", "official declaration", "APIA submitted",
    "ANAF submitted", "AFIR submitted", "verified legally", "cadastral proof",
    "compliance confirmed", "document approved", "diagnosis", "prescription",
    "apply now", "contract created", "payment triggered",
    "production consent stored", "legal compliance guaranteed",
    "ask anything", "chatbot decides", "best option", "optimal action",
    "diagnose", "prescribe", "guaranteed result",
  ];
  for (const phrase of cases) {
    it(`detects unsafe EN: "${phrase}"`, () => {
      expect(assertSafeLanguageEN(phrase).safe).toBe(false);
    });
    it(`detects via central: "${phrase}"`, () => {
      expect(assertSafeLanguage(phrase).safe).toBe(false);
    });
  }
});

describe("Central safe-language — RO", () => {
  const cases = [
    "recomandare ai", "decizie automată", "diagnostic confirmat",
    "tratament prescris", "aplică îngrășământ acum", "stropește acum", "irigă acum",
    "cumpără acum", "vinde acum", "cel mai bun furnizor",
    "preț garantat", "economii garantate", "eligibilitate confirmată",
    "grant aprobat", "contract pregătit", "contract semnat",
    "plată pregătită", "plată trimisă", "factură emisă",
    "calitate certificată", "conform gdpr",
    "aprobare oficială", "răspuns oficial",
    "consultanță juridică", "consultanță fiscală", "consultanță financiară",
    "înregistrare oficială", "declarație oficială",
    "depus la apia", "depus la anaf", "depus la afir",
    "verificat juridic", "dovadă cadastrală",
    "conformitate confirmată", "document aprobat",
    "diagnostic", "prescripție", "aplică acum",
    "contract creat", "plată declanșată",
    "consimțământ de producție stocat",
    "conformitate juridică garantată",
    "întreabă orice", "chatbotul decide",
    "cea mai bună opțiune", "acțiune optimă", "rezultat garantat",
  ];
  for (const phrase of cases) {
    it(`detects unsafe RO: "${phrase}"`, () => {
      expect(assertSafeLanguageRO(phrase).safe).toBe(false);
    });
    it(`detects via central: "${phrase}"`, () => {
      expect(assertSafeLanguage(phrase).safe).toBe(false);
    });
  }
});

describe("Central safe-language — safe phrases", () => {
  const safePhrases = [
    "întrebare ghidată", "semnal pentru verificare", "dovezi", "date lipsă",
    "necesită specialist", "necesită verificare umană", "verificare manuală",
    "nu se emite automat", "demo/local",
    "guided question", "signal for review", "missing data",
  ];
  for (const phrase of safePhrases) {
    it(`allows safe: "${phrase}"`, () => {
      expect(assertSafeLanguage(phrase).safe).toBe(true);
    });
  }
});

describe("Central safe-language — phrase inventory", () => {
  it("has EN phrases", () => {
    const { en } = getUnsafePhrases();
    expect(en.length).toBeGreaterThan(20);
  });

  it("has RO phrases", () => {
    const { ro } = getUnsafePhrases();
    expect(ro.length).toBeGreaterThan(20);
  });

  it("all array is EN + RO", () => {
    const { en, ro, all } = getUnsafePhrases();
    expect(all.length).toBe(en.length + ro.length);
  });

  it("can scan nested pilot summaries", () => {
    const text = `
      Fermierul vede ce merită verificat.
      AgroUnu arată ce lipsește.
      Necesită verificare umană.
      Semnale pentru verificare.
    `;
    expect(assertSafeLanguage(text).safe).toBe(true);
  });
});
