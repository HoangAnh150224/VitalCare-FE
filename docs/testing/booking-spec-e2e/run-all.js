// The whole end-to-end suite in order on a fresh test DB; prints each UC's checks and a final table.
const { spawnSync } = require("child_process");
const fs = require("fs");
const dir = "C:/Users/MSI/.claude/jobs/890c0789/tmp/";
const order = [["UC04", "uc04.js"], ["UC01", "uc01.js"], ["UC02", "uc02.js"], ["UC03", "uc03.js"], ["UC03c", "uc03c.js"], ["UC05-extra", "uc05.js"]];
const rows = [];
for (const [uc, file] of order) {
  const t0 = Date.now();
  const r = spawnSync("node", [dir + file], { cwd: dir, encoding: "utf8" });
  process.stdout.write(`\n##### ${uc} (${((Date.now() - t0) / 1000).toFixed(0)}s)\n` + r.stdout + (r.stderr ? "\nSTDERR: " + r.stderr.slice(-1500) : ""));
  const res = fs.existsSync(`${dir}${uc}.json`) ? JSON.parse(fs.readFileSync(`${dir}${uc}.json`, "utf8")) : [];
  rows.push([uc, res.length, res.filter((x) => x.ok).length, r.status]);
}
console.log("\n=== SUMMARY ===");
for (const [uc, n, p, code] of rows) console.log(`${uc.padEnd(11)} ${p}/${n} PASS${code ? "  (exit " + code + ")" : ""}`);
const total = rows.reduce((a, r) => [a[0] + r[1], a[1] + r[2]], [0, 0]);
console.log(`TOTAL       ${total[1]}/${total[0]} PASS`);
