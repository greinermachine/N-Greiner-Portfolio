-- Run only after review. This is separate from the older community ledger.
begin;

create schema if not exists portfolio_counter_private;
revoke all on schema portfolio_counter_private from public, anon, authenticated;

create table if not exists portfolio_counter_private.real_person_total (
    id boolean primary key default true check (id),
    total bigint not null default 0 check (total >= 0),
    last_cleanup date not null default current_date
);
create table if not exists portfolio_counter_private.real_person_claims (
    person_id uuid primary key,
    created_at timestamptz not null default now()
);
create table if not exists portfolio_counter_private.guestbook_names (
    id bigint generated always as identity primary key,
    display_name text not null check (char_length(display_name) between 1 and 24),
    created_at timestamptz not null default now()
);
create index if not exists real_person_claims_created_at_idx
    on portfolio_counter_private.real_person_claims (created_at);
alter table portfolio_counter_private.real_person_total enable row level security;
alter table portfolio_counter_private.real_person_claims enable row level security;
alter table portfolio_counter_private.guestbook_names enable row level security;
revoke all on portfolio_counter_private.real_person_total, portfolio_counter_private.real_person_claims, portfolio_counter_private.guestbook_names from public, anon, authenticated;
revoke all on sequence portfolio_counter_private.guestbook_names_id_seq from public, anon, authenticated;

insert into portfolio_counter_private.real_person_total (id) values (true) on conflict (id) do nothing;

-- Reading the counter does not record a person.
create or replace function public.get_real_person_count()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
    select total from portfolio_counter_private.real_person_total where id = true;
$$;

-- Public names are read-only through this function, in signing order.
create or replace function public.get_guestbook_names()
returns table (display_name text)
language sql
stable
security definer
set search_path = ''
as $$
    select names.display_name from portfolio_counter_private.guestbook_names as names order by names.id;
$$;

-- Only an explicit button click calls this function. Names are optional.
create or replace function public.sign_real_person_guestbook(p_person_id uuid, p_display_name text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
    inserted integer;
    count_value bigint;
    cleanup_due boolean;
    clean_name text := nullif(btrim(p_display_name), '');
begin
    if p_person_id is null then
        raise exception 'person_id required';
    end if;
    if clean_name is not null and (char_length(clean_name) > 24 or clean_name ~ '[[:cntrl:]]') then
        raise exception 'name must be 24 characters or fewer and contain no control characters';
    end if;

    insert into portfolio_counter_private.real_person_claims (person_id)
    values (p_person_id)
    on conflict (person_id) do nothing;
    get diagnostics inserted = row_count;

    if inserted = 1 and clean_name is not null then
        insert into portfolio_counter_private.guestbook_names (display_name) values (clean_name);
    end if;

    update portfolio_counter_private.real_person_total
    set total = total + inserted
    where id = true
    returning total into count_value;

    -- Browser-side state remembers successful clicks; short-lived IDs support retries.
    update portfolio_counter_private.real_person_total
    set last_cleanup = current_date
    where id = true and last_cleanup < current_date
    returning true into cleanup_due;
    if cleanup_due then
        delete from portfolio_counter_private.real_person_claims
        where created_at < now() - interval '2 days';
    end if;
    return count_value;
end;
$$;

revoke all on function public.get_real_person_count() from public;
revoke all on function public.get_guestbook_names() from public;
revoke all on function public.sign_real_person_guestbook(uuid, text) from public;
grant execute on function public.get_real_person_count() to anon, authenticated;
grant execute on function public.get_guestbook_names() to anon, authenticated;
grant execute on function public.sign_real_person_guestbook(uuid, text) to anon, authenticated;
commit;
