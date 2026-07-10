const bcrypt = require("bcryptjs");
const { createSupabase } = require("./supabase");
const {
  adminUsername,
  adminPassword,
  adminEmail,
} = require("./config");

/**
 * Ensures the privileged admin account exists in Supabase `users`.
 * Default: username admin / password admin123
 */
async function seedAdminUser() {
  const supabase = createSupabase();
  const username = String(adminUsername).trim().toLowerCase();
  const email = String(adminEmail).trim().toLowerCase();

  const { data: existing, error: findError } = await supabase
    .from("users")
    .select("id, username, role")
    .eq("username", username)
    .maybeSingle();

  if (findError) {
    console.error("Could not read users table:", findError.message);
    console.error("Run supabase/schema.sql (includes users table), then restart.");
    throw findError;
  }

  const password_hash = await bcrypt.hash(adminPassword, 10);

  if (existing) {
    // Keep admin role and refresh password from env (so admin123 stays in sync)
    const { error } = await supabase
      .from("users")
      .update({
        role: "admin",
        password_hash,
        email,
        full_name: "Site Administrator",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw error;
    console.log(`Admin user ready: ${username} (password from ADMIN_PASSWORD)`);
    return;
  }

  const { error } = await supabase.from("users").insert({
    username,
    email,
    full_name: "Site Administrator",
    password_hash,
    role: "admin",
  });

  if (error) throw error;
  console.log(`Seeded admin user: ${username} / (ADMIN_PASSWORD)`);
}

module.exports = { seedAdminUser };
