import fs from "node:fs";

const htmlPath = "kompendium.html";
let html = fs.readFileSync(htmlPath, "utf8");
const before = html;

let count = 0;
let missing = 0;

html = html.replace(/<div class="tool-mats">([\s\S]*?)<\/div>/g, (block) => {
  if (!block.includes("openClinicianHandout(this.closest('details.card').id)")) {
    return block;
  }

  const idMatch =
    block.match(/openHandout\('([^']+)'\)/) ||
    block.match(/openHandout\("([^"]+)"\)/) ||
    block.match(/downloadStandaloneHandout\('([^']+)'\)/) ||
    block.match(/openSOS\('([^']+)'\)/);

  if (!idMatch) {
    missing++;
    return block;
  }

  count++;
  return block.replace(
    "openClinicianHandout(this.closest('details.card').id)",
    `openClinicianHandout('${idMatch[1]}')`
  );
});

if (count === 0) {
  console.error("No replacements made");
  process.exit(1);
}

fs.writeFileSync(htmlPath, html, "utf8");
console.log(`Patched ${count} therapist handout buttons in kompendium.html`);
if (missing) console.warn(`Skipped ${missing} blocks without a card id`);
