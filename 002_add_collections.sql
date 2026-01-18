-- Create collections table
create table public.collections (
  id uuid not null default gen_random_uuid (),
  classroom_id uuid not null,
  title text not null,
  created_at timestamp with time zone not null default now(),
  constraint collections_pkey primary key (id),
  constraint collections_classroom_id_fkey foreign key (classroom_id) references classrooms (id) on delete cascade
) tablespace pg_default;

-- Add collection_id and order_index to assignments
alter table assignments
add column collection_id uuid references public.collections (id) on delete set null,
add column order_index integer default 0;

-- Index for performance
create index idx_assignments_collection_id on public.assignments (collection_id);
create index idx_collections_classroom_id on public.collections (classroom_id);
