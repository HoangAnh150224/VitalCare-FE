// Shared test harness: a browser, RULE-tagged checks, SQL against the test DB, OTPs from the BE log.
const { chromium } = require("C:/Users/MSI/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core");
const { execFileSync } = require("child_process");
const fs = require("fs");

const BASE = "http://localhost:5176";
const API = "http://localhost:8080/api";
const PSQL = "C:/Program Files/PostgreSQL/18/bin/psql.exe";
const BE_LOG = "C:/Users/MSI/.claude/jobs/890c0789/tmp/be.log";
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok: Boolean(ok), detail: String(detail).replace(/\s+/g, " ").slice(0, 220) });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${!ok && detail ? " — " + String(detail).replace(/\s+/g, " ").slice(0, 220) : ""}`);
}

/** One SQL query on vitalcare_spec, rows as arrays of strings. */
function sql(query) {
  const out = execFileSync(PSQL, ["-h", "localhost", "-U", "postgres", "-d", "vitalcare_spec", "-tA", "-F", "|", "-c", query],
    { env: { ...process.env, PGPASSWORD: "1234" }, encoding: "utf8" });
  return out.trim() ? out.trim().split(/\r?\n/).map((l) => l.split("|")) : [];
}

/** The newest code LoggingOtpSender logged for a number (E.164 or masked). */
function lastOtp(phoneTail) {
  const lines = fs.readFileSync(BE_LOG, "utf8").split(/\r?\n/).filter((l) => /code/i.test(l) && l.includes(phoneTail));
  const m = lines.length ? lines[lines.length - 1].match(/(\d{6})(?!.*\d{6})/) : null;
  return m ? m[1] : null;
}

async function api(method, path, body, token) {
  const r = await fetch(API + path, {
    method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  return { status: r.status, body: text ? JSON.parse(text) : null };
}

async function token(phone, password) {
  return (await api("POST", "/auth/login", { phone, password })).body.accessToken;
}

async function browser() {
  let b;
  try { b = await chromium.launch({ channel: "chrome", headless: true }); }
  catch { b = await chromium.launch({ headless: true }); }
  return b;
}

/** Signs in through the login page. */
async function signIn(page, phone, password) {
  await page.goto(BASE + "/login");
  await page.locator("#phone").fill(phone);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /Đăng nhập/ }).first().click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 });
}

function summary(uc) {
  const pass = results.filter((r) => r.ok).length;
  console.log(`\n== ${uc}: ${pass}/${results.length} PASS`);
  fs.writeFileSync(`C:/Users/MSI/.claude/jobs/890c0789/tmp/${uc}.json`, JSON.stringify(results, null, 1));
}

module.exports = { BASE, API, check, sql, lastOtp, api, token, browser, signIn, summary, results };
