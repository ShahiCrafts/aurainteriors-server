// Explicit operator-supplied credentials; never provision with a fallback.
exports.getAdminCredentials = () => {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
    throw new Error("A valid ADMIN_EMAIL is required for admin provisioning");
  }
  if (password.length < 16 || password.length > 128 ||
      /^(password|admin|changeme|replace|example)/i.test(password)) {
    throw new Error("ADMIN_PASSWORD must be an explicit strong secret of 16–128 characters, not a placeholder");
  }
  return { email, password };
};
