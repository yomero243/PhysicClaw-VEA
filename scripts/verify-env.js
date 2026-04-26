#!/usr/bin/env node
// Simple build-time env verification to prevent accidental exposure of secrets
const forbiddenInProd = ['VITE_OPENCLAW_TOKEN', 'SUPABASE_SERVICE_ROLE_KEY'];
const present = forbiddenInProd.filter(k => Boolean(process.env[k]));

if (process.env.NODE_ENV === 'production' && present.length > 0) {
  console.error(`Build blocked: forbidden environment variables present in production: ${present.join(', ')}`);
  process.exit(1);
}

if (process.env.VITE_OPENCLAW_TOKEN) {
  console.warn('Warning: VITE_OPENCLAW_TOKEN is set. This variable is exposed to the client bundle. Remove or rename it to a server-side env (no VITE_ prefix).');
}

process.exit(0);
