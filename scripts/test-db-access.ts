import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { createClient } from "@supabase/supabase-js";

function jwtRole(key: string): string | null {
  try {
    const payload = JSON.parse(
      Buffer.from(key.split(".")[1], "base64url").toString("utf8")
    );
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const serviceRole = jwtRole(serviceKey);
  const anonRole = anonKey ? jwtRole(anonKey) : null;

  console.log("Service key JWT role:", serviceRole ?? "unknown");
  console.log("Anon key JWT role:", anonRole ?? "unknown");
  if (serviceRole !== "service_role") {
    console.error(
      "SUPABASE_SERVICE_ROLE_KEY is not a service_role key. Copy the service_role secret from Supabase → Project Settings → API."
    );
  }
  if (anonKey && serviceKey === anonKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY matches the anon key — they must be different.");
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const table of [
    "simulation_runs",
    "campaigns",
    "agent_verdicts",
    "memes",
    "bnsentmix_samples",
  ]) {
    const res = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });
    const body = await res.text();
    console.log(`${table}: HTTP ${res.status}`, body.slice(0, 200));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
