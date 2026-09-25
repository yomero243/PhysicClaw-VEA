#!/usr/bin/env node
// Build-time environment verification to prevent accidental exposure of secrets.

const PUBLIC_ENV_ALLOWLIST = new Set([
  'VITE_PORT',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_OPENCLAW_API_URL',
  'VITE_OPENCLAW_MODEL',
  'VITE_CONTROL_POLL_MS',
]);

const SECRET_NAME_PATTERN = /(SECRET|TOKEN|PASSWORD|PRIVATE|SERVICE_ROLE|API_KEY|ACCESS_KEY)/i;
const forbiddenAlways = ['SUPABASE_SERVICE_ROLE_KEY', 'VITE_OPENCLAW_TOKEN'];
const forbiddenPresent = forbiddenAlways.filter((key) => Boolean(process.env[key]));

const suspiciousPublicVars = Object.keys(process.env)
  .filter((key) => key.startsWith('VITE_'))
  .filter((key) => !PUBLIC_ENV_ALLOWLIST.has(key))
  .filter((key) => SECRET_NAME_PATTERN.test(key));

const failures = [...forbiddenPresent, ...suspiciousPublicVars];

// A deployed build without these still succeeds, but ships a site whose login
// can never work (the client falls back to http://localhost:54321, which a
// phone reports as "Load failed"). Vercel sets VERCEL=1 while building.
const REQUIRED_WHEN_DEPLOYING = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
const missingRequired = process.env.VERCEL === '1'
  ? REQUIRED_WHEN_DEPLOYING.filter((key) => !process.env[key])
  : [];

if (missingRequired.length > 0) {
  // The Supabase <-> Vercel integration adds unprefixed names that Vite never
  // exposes to the browser. Name them, never print their values.
  const lookalikes = ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
    .filter((key) => Boolean(process.env[key]));
  console.error(
    `Build blocked: ${missingRequired.join(', ')} not set. Add them in Vercel -> Settings -> ` +
      'Environment Variables (Production and Preview), then redeploy.' +
      (lookalikes.length > 0
        ? ` Found ${lookalikes.join(', ')}: Vite only exposes VITE_* variables, so copy those values into the VITE_ names.`
        : ''),
  );
  process.exit(1);
}

if (failures.length > 0) {
  console.error(
    `Build blocked: potentially sensitive environment variables would be exposed or misused: ${[
      ...new Set(failures),
    ].join(', ')}`,
  );
  process.exit(1);
}

process.exit(0);
