// FA-42: evaluates an `npm audit --json` report file and turns it into
// DISTINCT exit codes, so a scan that could not run can never look
// like a scan that passed:
//   0 - audit ran, no high/critical vulnerabilities
//   1 - audit ran and FOUND high/critical vulnerabilities
//   2 - audit could not run (registry unreachable, blocked, or the
//       output was not a parseable audit report)
// Usage: node scripts/audit-gate.js <path-to-npm-audit-json>
const fs = require("fs");

let parsed;
try {
  parsed = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
} catch {
  console.error("AUDIT COULD NOT RUN: npm audit produced no parseable report (registry unreachable or blocked?).");
  process.exit(2);
}
if (!parsed || parsed.error || !parsed.metadata || !parsed.metadata.vulnerabilities) {
  console.error("AUDIT COULD NOT RUN:", (parsed && parsed.error && parsed.error.message) || "unexpected npm audit output shape.");
  process.exit(2);
}
const v = parsed.metadata.vulnerabilities;
const critical = v.critical || 0;
const high = v.high || 0;
if (critical + high > 0) {
  console.error(`AUDIT FOUND ISSUES: ${critical} critical, ${high} high vulnerabilities.`);
  process.exit(1);
}
console.log("npm audit: no high or critical vulnerabilities.");
