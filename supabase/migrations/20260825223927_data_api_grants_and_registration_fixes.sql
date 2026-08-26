-- ============================================================
-- NADIDOVE STAFF REGISTRATION
-- Data API grants, schema convergence, storage policies
-- ============================================================
--
-- The initial schema created the tables but never granted the Data API roles
-- access to them. Supabase no longer does that automatically for new tables in
-- `public` (see `auto_expose_new_tables` in supabase/config.toml), so every
-- query from the application answered:
--
--     42501  permission denied for table staff_members
--
-- That is the single reason the registration backend could not read or write
-- anything. This migration grants the access the portal needs, and no more.
--
-- Safe to run more than once.


-- ============================================================
-- 1. DATA API GRANTS
-- ============================================================
--
-- `service_role` is the only role that gets access. It is used exclusively from
-- server-side code in `lib/supabase/admin.ts`, holding the secret key that
-- never reaches the browser.
--
-- `anon` and `authenticated` are explicitly revoked. Row level security is
-- already on with no policies attached, so those roles could not read a row
-- even with table privileges — revoking as well means a policy added later by
-- accident cannot silently expose banking or identity data.

grant usage on schema public to service_role;

grant all privileges on table public.agreements to service_role;
grant all privileges on table public.staff_members to service_role;
grant all privileges on table public.staff_agreement_acceptances to service_role;

revoke all privileges on table public.agreements from anon, authenticated;
revoke all privileges on table public.staff_members from anon, authenticated;
revoke all privileges on table public.staff_agreement_acceptances
    from anon, authenticated;

-- Tables added by future migrations in this schema follow the same rule.
alter default privileges in schema public
    grant all privileges on tables to service_role;


-- ============================================================
-- 2. SCHEMA CONVERGENCE
-- ============================================================
--
-- Earlier iterations of this system wrote a single `full_name` column. The
-- current schema splits the name into three columns, which is what the
-- registration form collects. If a `full_name` column is still present from an
-- earlier iteration, it is made nullable rather than dropped — dropping it
-- would discard data from any registration captured before the split.

do $$
begin
    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'staff_members'
          and column_name = 'full_name'
          and is_nullable = 'NO'
    ) then
        alter table public.staff_members
            alter column full_name drop not null;
    end if;
end
$$;


-- Every column the submit route writes. All of these are in the initial
-- schema; the guards make this migration safe against a database that was set
-- up by hand at some point during the earlier iterations.

alter table public.staff_members
    add column if not exists middle_name text,
    add column if not exists education_other text,
    add column if not exists passport_file_path text,
    add column if not exists government_id_file_path text,
    add column if not exists signature_file_path text,
    add column if not exists signature_date date,
    add column if not exists registration_submitted_at timestamptz,
    add column if not exists completed_at timestamptz,
    add column if not exists completed_pdf_file_path text;


-- ============================================================
-- 3. STORAGE
-- ============================================================
--
-- Both buckets stay private. Uploads and downloads run through the service key,
-- and documents are only ever handed to a browser as a short-lived signed URL,
-- so no storage policies for `anon` or `authenticated` are wanted here.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
    (
        'staff-documents',
        'staff-documents',
        false,
        10485760, -- 10MB, matched by MAX_UPLOAD_BYTES in lib/staff/registration.ts
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    ),
    (
        'completed-agreements',
        'completed-agreements',
        false,
        20971520, -- 20MB: the generated PDF can embed an ID scan
        array['application/pdf']
    )
on conflict (id) do update
set
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;


-- ============================================================
-- 4. LOOKUP SUPPORT
-- ============================================================
--
-- The staff records screen lists registrations newest first.

create index if not exists staff_members_created_at_idx
    on public.staff_members (created_at desc);
