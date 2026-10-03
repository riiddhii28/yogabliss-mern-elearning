// Pure configuration validation: safe to test without connecting or seeding.
export function seedAccounts(env) {
  const accounts = [
    ["ADMIN", "admin", "Local admin"],
    ["LEARNER", "user", "Local learner"],
  ].map(([prefix, role, fallback]) => {
    const email = (env[`SEED_${prefix}_EMAIL`] || "").trim().toLowerCase();
    const password = env[`SEED_${prefix}_PASSWORD`] || "";
    const name = (env[`SEED_${prefix}_NAME`] || fallback).trim();
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 12 || !name || name.length > 80) {
      throw new Error(`Configure SEED_${prefix}_EMAIL, SEED_${prefix}_PASSWORD (12+ characters), and an optional name of 1–80 characters.`);
    }
    return { name, email, password, role };
  });
  if (accounts[0].email === accounts[1].email) {
    throw new Error("Local seed admin and learner email addresses must differ.");
  }
  return accounts;
}
