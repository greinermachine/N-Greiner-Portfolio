begin;

create table if not exists public.portfolio_metrics (
    metric_key text primary key,
    metric_value bigint not null default 0 check (metric_value >= 0),
    updated_at timestamptz not null default now()
);

insert into public.portfolio_metrics (metric_key, metric_value)
values ('trail_visits', 0)
on conflict (metric_key) do nothing;

create table if not exists public.guestbook_messages (
    id bigint generated always as identity primary key,
    nickname text not null default 'Anonymous Scout'
        check (char_length(nickname) between 1 and 24),
    body text not null
        check (char_length(body) between 1 and 280)
        check (body !~* '(https?://|www\.)'),
    created_at timestamptz not null default now(),
    is_visible boolean not null default true
);

create index if not exists guestbook_messages_visible_created_idx
    on public.guestbook_messages (created_at desc)
    where is_visible = true;

create table if not exists public.guestbook_rate_limits (
    actor_hash char(64) not null,
    bucket_start timestamptz not null,
    request_count smallint not null default 1 check (request_count > 0),
    primary key (actor_hash, bucket_start)
);

alter table public.portfolio_metrics enable row level security;
alter table public.guestbook_messages enable row level security;
alter table public.guestbook_rate_limits enable row level security;

revoke all on table public.portfolio_metrics from anon, authenticated;
revoke all on table public.guestbook_messages from anon, authenticated;
revoke all on table public.guestbook_rate_limits from anon, authenticated;
revoke all on sequence public.guestbook_messages_id_seq from anon, authenticated;

create or replace function public.increment_portfolio_visit()
returns bigint
language sql
security definer
set search_path = public, pg_temp
as $$
    insert into public.portfolio_metrics (metric_key, metric_value, updated_at)
    values ('trail_visits', 1, now())
    on conflict (metric_key)
    do update set
        metric_value = public.portfolio_metrics.metric_value + 1,
        updated_at = now()
    returning metric_value;
$$;

create or replace function public.submit_guestbook_message(
    p_actor_hash text,
    p_nickname text,
    p_body text
)
returns setof public.guestbook_messages
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_bucket timestamptz := date_trunc('minute', now());
    v_request_count smallint;
    v_nickname text := coalesce(nullif(btrim(p_nickname), ''), 'Anonymous Scout');
    v_body text := btrim(p_body);
    v_row public.guestbook_messages%rowtype;
begin
    if p_actor_hash is null or p_actor_hash !~ '^[0-9a-f]{64}$' then
        raise exception 'guestbook_invalid_actor';
    end if;

    if char_length(v_nickname) > 24 then
        raise exception 'guestbook_invalid_nickname';
    end if;

    if lower(v_nickname) in ('nicholas', 'nicholas greiner', 'nick', 'nick greiner', 'greinermachine', 'admin', 'moderator', 'site owner') then
        raise exception 'guestbook_reserved_nickname';
    end if;

    if char_length(v_body) < 1 or char_length(v_body) > 280 then
        raise exception 'guestbook_invalid_body';
    end if;

    if v_body ~* '(https?://|www\.|\y[a-z0-9-]+\.(com|net|org|io|gg|dev|app|co)\y)' then
        raise exception 'guestbook_links_disabled';
    end if;

    insert into public.guestbook_rate_limits (actor_hash, bucket_start, request_count)
    values (p_actor_hash, v_bucket, 1)
    on conflict (actor_hash, bucket_start)
    do update set request_count = public.guestbook_rate_limits.request_count + 1
    returning request_count into v_request_count;

    if v_request_count > 3 then
        raise exception 'guestbook_rate_limited';
    end if;

    insert into public.guestbook_messages (nickname, body)
    values (v_nickname, v_body)
    returning * into v_row;

    delete from public.guestbook_rate_limits
    where bucket_start < now() - interval '2 days';

    return next v_row;
end;
$$;

revoke all on function public.increment_portfolio_visit() from public, anon, authenticated;
revoke all on function public.submit_guestbook_message(text, text, text) from public, anon, authenticated;
grant execute on function public.increment_portfolio_visit() to service_role;
grant execute on function public.submit_guestbook_message(text, text, text) to service_role;

commit;
