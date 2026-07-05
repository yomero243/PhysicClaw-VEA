-- 011_rate_limits.sql
-- Durable rate limiting shared across Edge Function isolates.
-- Replaces the per-isolate in-memory Map in supabase/functions/chat
-- (README "Known gaps": in-memory rate limiting is per-isolate and
-- resets on cold start).
--
-- Access model: only the service role touches this table/function.
-- RLS is enabled with NO policies, so anon/authenticated get nothing;
-- the function is security definer and EXECUTE is revoked from clients.

create table if not exists public.rate_limits (
    key          text primary key,
    count        integer not null default 0,
    window_start timestamptz not null default now()
);

create index if not exists rate_limits_window_start_idx
    on public.rate_limits (window_start);

alter table public.rate_limits enable row level security;

create or replace function public.consume_rate_limit(
    p_key text,
    p_limit integer,
    p_window_ms integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    v_now    timestamptz := now();
    v_window interval;
    v_row    public.rate_limits;
begin
    if p_key is null or p_key = '' then
        raise exception 'consume_rate_limit: p_key must be non-empty';
    end if;
    if p_limit is null or p_limit <= 0 then
        raise exception 'consume_rate_limit: p_limit must be > 0 (got %)', p_limit;
    end if;
    if p_window_ms is null or p_window_ms <= 0 then
        raise exception 'consume_rate_limit: p_window_ms must be > 0 (got %)', p_window_ms;
    end if;
    v_window := make_interval(secs => p_window_ms / 1000.0);

    -- Opportunistic cleanup: drop keys idle for 2+ windows.
    -- Probabilistic (~1% of calls) so the hot path stays an indexed upsert.
    if random() < 0.01 then
        delete from public.rate_limits
         where window_start < v_now - (v_window * 2);
    end if;

    insert into public.rate_limits as rl (key, count, window_start)
    values (p_key, 1, v_now)
    on conflict (key) do update
        set count = case
                when rl.window_start < v_now - v_window then 1
                else rl.count + 1
            end,
            window_start = case
                when rl.window_start < v_now - v_window then v_now
                else rl.window_start
            end
    returning * into v_row;

    allowed := v_row.count <= p_limit;
    retry_after_seconds := case
        when allowed then 0
        else greatest(
            1,
            ceil(extract(epoch from (v_row.window_start + v_window - v_now)))::integer
        )
    end;
    return next;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer)
    from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer)
    to service_role;
