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

if (failures.length > 0) {
  console.error(
    `Build blocked: potentially sensitive environment variables would be exposed or misused: ${[
      ...new Set(failures),
    ].join(', ')}`,
  );
  process.exit(1);
}

process.exit(0);
