import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const source = fs.readFileSync(path.join(root, "kompendium.html"), "utf8");
const handoutIndex = eval(
  "(" + source.match(/window\.HANDOUT_INDEX = (\{[\s\S]*?\});/)[1] + ")"
);

const PRINT_HANDOUT_FILE_ALIASES = {
  "czym-bdd": "bdd-czym-jest",
  "dieta-dep": "jedzenie-nastroj"
};

const TOKEN_SYNONYMS = {
  dieta: ["jedzenie", "odzywianie"],
  odzywianie: ["jedzenie", "dieta"],
  jedzenie: ["odzywianie", "dieta"],
  nastroj: ["mood"]
};

function normalizeToken(value) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function meaningfulIdTokens(id, mod) {
  const modTokens = new Set([mod, ...mod.split("-")]);
  return id.split("-").filter((token) => token && !modTokens.has(token));
}

function titleWords(title) {
  return title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4);
}

function expandToken(token) {
  const normalized = normalizeToken(token);
  const variants = new Set([normalized]);
  for (const synonym of TOKEN_SYNONYMS[normalized] || []) {
    variants.add(normalizeToken(synonym));
  }
  return [...variants];
}

function scorePrintCandidate(id, mod, base, cardTitle) {
  const baseLower = normalizeToken(base);
  const meaningful = meaningfulIdTokens(id, mod);
  let score = 0;
  let contentMatches = 0;

  if (base === id) {
    score += 50;
    contentMatches++;
  }

  for (const token of meaningful) {
    for (const variant of expandToken(token)) {
      if (baseLower.includes(variant)) {
        score += 15;
        contentMatches++;
        break;
      }
    }
  }

  if (cardTitle) {
    for (const word of titleWords(cardTitle)) {
      let matched = false;
      if (baseLower.includes(word)) {
        score += 12;
        contentMatches++;
        matched = true;
      }
      if (!matched) {
        for (const variant of expandToken(word)) {
          if (baseLower.includes(variant)) {
            score += 12;
            contentMatches++;
            break;
          }
        }
      }
    }
  }

  const modPrefix = mod.split("-")[0]?.toLowerCase();
  if (modPrefix && baseLower.startsWith(`${modPrefix}-`) && contentMatches > 0) {
    score += 5;
  }

  if (/\(\d+\)/.test(base)) score -= 20;
  if (contentMatches === 0) return -1;

  return score;
}

const cardTitles = {};
for (const match of source.matchAll(
  /<details class="card" id="([^"]+)"[\s\S]*?<span class="nm">([^<]+)</g
)) {
  cardTitles[match[1]] = match[2].trim();
}

for (const id of ["dieta-dep", "czym-bdd"]) {
  const mod = handoutIndex[id];
  const alias = PRINT_HANDOUT_FILE_ALIASES[id];
  const basenames = [
    ...new Set(
      fs
        .readdirSync(path.join(root, "public/handouts/print", mod))
        .map((f) => f.replace(/\.(pdf|html)$/, ""))
    )
  ];

  if (alias && basenames.includes(alias)) {
    console.log(id, "->", alias, "(alias)");
    continue;
  }

  let best = null;
  let bestScore = -1;
  for (const base of basenames) {
    const score = scorePrintCandidate(id, mod, base, cardTitles[id]);
    if (score > bestScore) {
      bestScore = score;
      best = base;
    }
  }
  console.log(id, "->", best, bestScore, "| title:", cardTitles[id]);
  console.log(
    "  akceptacja:",
    scorePrintCandidate(id, mod, "dep-akceptacja-smutku", cardTitles[id])
  );
  console.log(
    "  jedzenie:",
    scorePrintCandidate(id, mod, "jedzenie-nastroj", cardTitles[id])
  );
}
