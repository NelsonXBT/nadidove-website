-- ============================================================
-- NADIDOVE TEAM REGISTRATION & AGREEMENT SYSTEM
-- Initial Database Schema
-- ============================================================

create extension if not exists "pgcrypto";


-- ============================================================
-- AGREEMENTS
-- ============================================================

create table public.agreements (
    id uuid primary key default gen_random_uuid(),

    title text not null,
    version text not null unique,
    content text not null,

    is_active boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================================
-- STAFF MEMBERS
-- ============================================================

create table public.staff_members (
    id uuid primary key default gen_random_uuid(),

    -- Personal information
    first_name text not null,
    middle_name text,
    last_name text not null,
    date_of_birth date not null,
    phone_number text not null,
    email text not null,

    -- Location
    state_of_origin text not null,
    current_state text not null,
    current_city text not null,

    -- Banking
    bank_name text not null,
    account_number text not null,
    account_name text not null,

    -- Nadidove role
    role text not null,

    -- Education
    education text not null
        check (
            education in (
                'Graduate',
                'SSCE Holder',
                'Undergraduate',
                'Other'
            )
        ),

    education_other text,

    -- Uploaded document references
    passport_file_path text,
    government_id_file_path text,
    signature_file_path text,

    -- Signature
    signature_date date,

    -- Registration status
    submission_status text not null default 'draft'
        check (
            submission_status in (
                'draft',
                'submitted',
                'completed'
            )
        ),

    -- Important timestamps
    registration_submitted_at timestamptz,
    completed_at timestamptz,

    -- Generated completed PDF
    completed_pdf_file_path text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    -- If "Other" education is selected, specification is required
    constraint education_other_required
        check (
            education <> 'Other'
            or education_other is not null
            and length(trim(education_other)) > 0
        )
);


-- ============================================================
-- AGREEMENT ACCEPTANCES
-- ============================================================
-- One staff member can accept multiple agreements.
-- We preserve the exact version accepted and the acceptance time.

create table public.staff_agreement_acceptances (
    id uuid primary key default gen_random_uuid(),

    staff_member_id uuid not null
        references public.staff_members(id)
        on delete cascade,

    agreement_id uuid not null
        references public.agreements(id)
        on delete restrict,

    agreement_version text not null,

    accepted_at timestamptz not null default now(),

    created_at timestamptz not null default now(),

    unique (staff_member_id, agreement_id)
);


-- ============================================================
-- INDEXES
-- ============================================================

create index staff_members_email_idx
    on public.staff_members(email);

create index staff_members_submission_status_idx
    on public.staff_members(submission_status);

create index staff_agreement_acceptances_staff_idx
    on public.staff_agreement_acceptances(staff_member_id);

create index staff_agreement_acceptances_agreement_idx
    on public.staff_agreement_acceptances(agreement_id);


-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;


create trigger agreements_updated_at
before update on public.agreements
for each row
execute function public.update_updated_at_column();


create trigger staff_members_updated_at
before update on public.staff_members
for each row
execute function public.update_updated_at_column();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.agreements enable row level security;
alter table public.staff_members enable row level security;
alter table public.staff_agreement_acceptances enable row level security;


-- No public/anonymous policies.
--
-- Sensitive registration records will be accessed through
-- server-side Next.js operations using secure Supabase credentials.
--
-- This prevents browser clients from directly querying
-- personal, banking, identity and agreement records.


-- ============================================================
-- PRIVATE STORAGE BUCKETS
-- ============================================================

insert into storage.buckets (id, name, public)
values
    ('staff-documents', 'staff-documents', false),
    ('completed-agreements', 'completed-agreements', false)
on conflict (id) do nothing;