#!/usr/bin/env node
/**
 * Audit farmer-pilot safe language.
 * FOP18 — scans src/ and docs/ for unsafe phrases.
 *
 * Usage: node scripts/audit-farmer-pilot-safe-language.mjs
 *
 * Ignores:
 * - test files (*test*, *spec*)
 * - safe-language helper files (safe-language.ts)
 * - doc sections listing unsafe phrases (lines containing "do not use", "unsafe", "never use")
 */
import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const UNSAFE_EN = [
  "ai recommendation", "automatic decision", "diagnosis confirmed",
  "prescribed treatment", "apply fertilizer now", "spray now", "irrigate now",
  "buy now", "sell now", "best supplier", "guaranteed price", "guaranteed savings",
  "eligibility confirmed", "grant approved", "contract ready", "contract signed",
  "payment ready", "payment sent", "invoice issued", "quality certified",
  "gdpr compliant", "official approval", "official answer",
  "legal advice", "tax advice", "financial advice",
  "official registration", "official declaration",
  "apia submitted", "anaf submitted", "afir submitted",
  "verified legally", "cadastral proof", "compliance confirmed",
  "document approved", "diagnosis", "prescription",
  "apply now", "contract created", "payment triggered",
  "production consent stored", "legal compliance guaranteed",
  "ask anything", "chatbot decides", "best option", "optimal action",
  "diagnose", "prescribe", "guaranteed result",
];

const UNSAFE_RO = [
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

const ALL_UNSAFE = [...UNSAFE_EN, ...UNSAFE_RO];

const SCAN_DIRS = ["src", "docs"];
const ALLOWED_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".md", ".mdx"]);
const IGNORE_PATTERNS = [
  /\.test\./i, /\.spec\./i, /__tests__/i,
  /safe-language\.ts$/i, /safe-language\.mjs$/i,
  /audit-farmer-pilot/i,
];
const IGNORE_LINE_PATTERNS = [
  /do not use/i, /never use/i, /unsafe phrase/i, /unsafe copy/i,
  /nu folosi/i, /nu se folosesc/i, /evită/i,
  /^[\s]*\/\//, /^[\s]*\*/, // comment lines
  /UNSAFE_EN|UNSAFE_RO|ALL_UNSAFE/,
];

async function* walkDir(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
        yield* walkDir(full);
      } else if (ALLOWED_EXTS.has(extname(entry.name))) {
        yield full;
      }
    }
  } catch { /* skip */ }
}

async function main() {
  const findings = [];
  const root = process.cwd();

  for (const scanDir of SCAN_DIRS) {
    for await (const filePath of walkDir(join(root, scanDir))) {
      const relPath = filePath.replace(root + "/", "");
      if (IGNORE_PATTERNS.some((p) => p.test(relPath))) continue;

      const content = await readFile(filePath, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (IGNORE_LINE_PATTERNS.some((p) => p.test(line))) continue;
        const lower = line.toLowerCase();
        for (const phrase of ALL_UNSAFE) {
          if (lower.includes(phrase)) {
            findings.push({ file: relPath, line: i + 1, phrase, context: line.trim().slice(0, 120) });
          }
        }
      }
    }
  }

  console.log(`\n🔍 Farmer Pilot Safe-Language Audit`);
  console.log(`   Scanned: ${SCAN_DIRS.join(", ")}`);
  console.log(`   Unsafe phrases checked: ${ALL_UNSAFE.length}\n`);

  if (findings.length === 0) {
    console.log("✅ No unsafe phrases found.\n");
  } else {
    console.log(`⚠️  ${findings.length} finding(s):\n`);
    for (const f of findings) {
      console.log(`  ${f.file}:${f.line}`);
      console.log(`    phrase: "${f.phrase}"`);
      console.log(`    context: ${f.context}\n`);
    }
  }

  process.exit(findings.length > 0 ? 1 : 0);
}

main();
