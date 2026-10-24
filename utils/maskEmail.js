// FA-75 / FA-84: email addresses are PII and do not belong in
// application logs in full. maskEmail keeps the first character and
// the domain (enough to correlate a support report with a log line)
// and drops the rest of the local part.
exports.maskEmail = (email) => {
  const s = String(email || "");
  const at = s.indexOf("@");
  if (at <= 0) return "***";
  return `${s[0]}***@${s.slice(at + 1)}`;
};
