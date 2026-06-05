import fs from "node:fs";
import path from "node:path";

const inputPath = path.resolve("kompendium.html");
const outputDir = path.resolve("content/modules");

const html = fs.readFileSync(inputPath, "utf8");
fs.mkdirSync(outputDir, { recursive: true });

const decodeEntities = (text) =>
  text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&oacute;/g, "ó")
    .replace(/&Oacute;/g, "Ó")
    .replace(/&aogon;/g, "ą")
    .replace(/&eogon;/g, "ę")
    .replace(/&lstrok;/g, "ł")
    .replace(/&nacute;/g, "ń")
    .replace(/&sacute;/g, "ś")
    .replace(/&zacute;/g, "ź")
    .replace(/&zdot;/g, "ż");

const stripHtml = (rawHtml) => {
  return decodeEntities(
    rawHtml
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<svg[\s\S]*?<\/svg>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<div[^>]*>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<p[^>]*>/gi, "")
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<h1[^>]*>/gi, "# ")
      .replace(/<h2[^>]*>/gi, "## ")
      .replace(/<h3[^>]*>/gi, "### ")
      .replace(/<h4[^>]*>/gi, "#### ")
      .replace(/<h5[^>]*>/gi, "##### ")
      .replace(/<h6[^>]*>/gi, "###### ")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<\/li>/gi, "\n")
      .replace(/<\/ol>/gi, "\n")
      .replace(/<\/ul>/gi, "\n")
      .replace(/<strong[^>]*>/gi, "**")
      .replace(/<\/strong>/gi, "**")
      .replace(/<em[^>]*>/gi, "*")
      .replace(/<\/em>/gi, "*")
      .replace(/<[^>]+>/g, "")
      .replace(/\r/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n +/g, "\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim()
  );
};

const moduleRegex =
  /<div class="tab-content"[^>]*id="([^"]+)"[\s\S]*?(?=<div class="tab-content"|<\/body>)/g;

const modules = [...html.matchAll(moduleRegex)];
let written = 0;

for (const moduleMatch of modules) {
  const moduleId = moduleMatch[1];
  const moduleHtml = moduleMatch[0];

  const titleMatch = moduleHtml.match(
    /<div class="tab-header"[\s\S]*?<h2>([\s\S]*?)<\/h2>/
  );
  const subtitleMatch = moduleHtml.match(
    /<span class="tab-subtitle">([\s\S]*?)<\/span>/
  );

  const title = stripHtml(titleMatch?.[1] ?? moduleId);
  const subtitle = stripHtml(subtitleMatch?.[1] ?? "");

  const infoBlocks = [...moduleHtml.matchAll(/<details class="mod-info"[\s\S]*?<\/details>/g)];
  const cardBlocks = [...moduleHtml.matchAll(/<details class="card"[\s\S]*?<\/details>/g)];

  const out = [];
  out.push(`# ${title}`);
  if (subtitle) out.push(`_${subtitle}_`);
  out.push("");

  if (infoBlocks.length > 0) {
    out.push("## Informacje modułu");
    out.push("");
    for (const infoMatch of infoBlocks) {
      const infoHtml = infoMatch[0];
      const summary = stripHtml(infoHtml.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] ?? "");
      const body = stripHtml(
        infoHtml
          .replace(/<summary>[\s\S]*?<\/summary>/, "")
          .replace(/^<details class="mod-info"[^>]*>/, "")
          .replace(/<\/details>$/, "")
      );
      if (summary) out.push(`### ${summary}`);
      if (body) out.push(body);
      out.push("");
    }
  }

  out.push("## Narzędzia");
  out.push("");

  for (const cardMatch of cardBlocks) {
    const cardHtml = cardMatch[0];
    const cardId = cardHtml.match(/<details class="card"[^>]*id="([^"]+)"/)?.[1] ?? "";
    const name = stripHtml(cardHtml.match(/<span class="nm">([\s\S]*?)<\/span>/)?.[1] ?? "");
    const sub = stripHtml(cardHtml.match(/<span class="sub">([\s\S]*?)<\/span>/)?.[1] ?? "");

    const detailRaw = cardHtml
      .replace(/^[\s\S]*?<div class="card-detail">/, "")
      .replace(/<\/div>\s*<\/details>\s*$/, "");
    const detail = stripHtml(detailRaw);

    out.push(`### ${name || cardId || "Narzędzie"}`);
    if (cardId) out.push(`ID: \`${cardId}\``);
    if (sub) out.push(sub);
    if (detail) out.push(detail);
    out.push("");
  }

  const fileName = `${moduleId.replace(/^tab-/, "")}.md`;
  fs.writeFileSync(path.join(outputDir, fileName), `${out.join("\n").trim()}\n`, "utf8");
  written += 1;
}

console.log(`Extracted ${written} modules to ${outputDir}`);
