-- Bucket (privat)
select storage.create_bucket('tender-docs', public := false);

-- RLS policies for metadata-tabellen
alter table public.tender_documents enable row level security;

create policy "tender_documents_insert_own"
  on public.tender_documents for insert
  with check (created_by = auth.uid());

create policy "tender_documents_select_own"
  on public.tender_documents for select
  using (created_by = auth.uid());

create policy "tender_documents_delete_own"
  on public.tender_documents for delete
  using (created_by = auth.uid());

-- Stram storage-objekt-permission (vi bruger signed URLs)
revoke all on storage.objects from anon, authenticated;

-- Trigger: default created_by = auth.uid()
create or replace function public.set_created_by()
returns trigger language plpgsql as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end $$;

drop trigger if exists trg_set_created_by on public.tender_documents;

create trigger trg_set_created_by
  before insert on public.tender_documents
  for each row execute procedure public.set_created_by();
