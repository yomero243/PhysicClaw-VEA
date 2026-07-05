-- 012_agent_tokens.sql
-- Per-user agent tokens for the production control channel.
-- The plaintext secret is shown once in the UI; only its SHA-256 hex
-- lands here. RLS follows the 010 convention: single owner policy,
-- (select auth.uid()) evaluated per statement, scoped to authenticated.

create table if not exists public.agent_tokens (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null references auth.users (id) on delete cascade,
    name         text not null check (char_length(name) between 1 and 60),
    token_hash   text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
    created_at   timestamptz not null default now(),
    last_used_at timestamptz,
    revoked      boolean not null default false
);

create index if not exists agent_tokens_user_id_idx
    on public.agent_tokens (user_id);

alter table public.agent_tokens enable row level security;

drop policy if exists agent_tokens_owner on public.agent_tokens;
create policy agent_tokens_owner on public.agent_tokens
    for all to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

-- Realtime Authorization for the private control channel.
-- Owners may RECEIVE broadcast messages on their own topic only.
-- There is intentionally NO insert policy: clients cannot publish
-- into control channels; only the control Edge Function (service
-- role, bypasses RLS) broadcasts.
drop policy if exists control_channel_receive on realtime.messages;
create policy control_channel_receive on realtime.messages
    for select to authenticated
    using (
        realtime.messages.extension = 'broadcast'
        and realtime.topic() = 'control:' || (select auth.uid())::text
    );
