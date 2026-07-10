const bcrypt = require("bcryptjs");
const { createSupabase } = require("./supabase");
const { getAdminSeedConfig } = require("./config");

/**
 * Ensures the privileged admin account exists in Supabase `users`.
 * Admin credentials must be provided through private environment variables.
 */
async function seedAdminUser() {
  const supabase = createSupabase();
  const { username, password, email } = getAdminSeedConfig();

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

  const password_hash = await bcrypt.hash(password, 10);

  if (existing) {
    // Keep admin role and refresh the password from the private environment.
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
