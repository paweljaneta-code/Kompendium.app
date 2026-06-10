// Test: generuje skrypt ukrywania identycznie jak originalModules.ts
// (ten sam template), parsuje vm i sprawdza regex na realnych onclickach.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");

// dokładna kopia template literal z buildDeadButtonHiderScript
function buildScript(available) {
  return `(function () {
  var AV = new Set(${JSON.stringify(available)});
  function cidFrom(el) {
    var oc = el.getAttribute("onclick") || "";
    var m = oc.match(/(?:openHandout|downloadStandaloneHandout)\\((["'])([^"']+)\\1/);
    return m ? m[2] : null;
  }
  function hasMaterial(id) {
    if (!id) return true;
    if (AV.has(id)) return true;
    return false;
  }
  globalThis.__cidFrom = cidFrom;
  globalThis.__hasMaterial = hasMaterial;
})();`;
}

const script = buildScript(["gad-tipp", "100-zyc"]);
new vm.Script(script); // parse check
const ctx = { globalThis: {} };
vm.createContext(ctx);
vm.runInContext(script.replace(/globalThis/g, "this"), ctx);

// regex test na realnych formach onclick
const fakeEl = (onclick) => ({ getAttribute: () => onclick });
const cases = [
  ["event.stopPropagation();openHandout('gad-tipp')", "gad-tipp"],
  ['openHandout("100-zyc")', "100-zyc"],
  ["event.stopPropagation();downloadStandaloneHandout('add-cra')", "add-cra"],
  ["closeSOS()", null]
];
let pass = 0;
for (const [oc, expect] of cases) {
  const got = ctx.__cidFrom(fakeEl(oc));
  const ok = got === expect;
  if (ok) pass++;
  console.log((ok ? "✓" : "✗") + ` cidFrom(${JSON.stringify(oc)}) = ${JSON.stringify(got)}`);
}
console.log(`hasMaterial: gad-tipp=${ctx.__hasMaterial("gad-tipp")} add-cra=${ctx.__hasMaterial("add-cra")} null=${ctx.__hasMaterial(null)}`);
console.log(pass === cases.length ? "PARSE+REGEX: OK" : "FAIL");
