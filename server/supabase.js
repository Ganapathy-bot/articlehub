const { createClient } = require("@supabase/supabase-js");
const { supabaseUrl, supabaseKey } = require("./config");

function assertConfig() {
  if (!supabaseUrl || !supabaseKey) {
    console.error("\n❌ Missing Supabase credentials.");
    console.error("Add these to a .env file at the project root:\n");
    console.error("  SUPABASE_URL=https://YOUR_PROJECT.supabase.co");
    console.error("  SUPABASE_ANON_KEY=your_anon_key");
    console.error("  # optional but recommended for seeding:");
    console.error("  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key\n");
    console.error("Get them from Supabase → Project Settings → API.\n");
    process.exit(1);
  }
}

function createSupabase() {
  assertConfig();
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

module.exports = { createSupabase, assertConfig };
