-- Ensure the journal-assets bucket exists with strict owner-only access.

do $$
begin
    if not exists (select 1 from storage.buckets where id = 'journal-assets') then
        insert into storage.buckets (id, name, public)
        values ('journal-assets', 'Journal Assets', false);
    end if;
end
$$;

do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and polname = 'journal_assets_owner_access'
    ) then
        execute $policy$
            create policy "journal_assets_owner_access"
                on storage.objects
                for all
                using (
                    bucket_id = 'journal-assets'
                    and (auth.uid() = owner or coalesce(auth.jwt()->> 'role', '') = 'admin')
                )
                with check (
                    bucket_id = 'journal-assets'
                    and (auth.uid() = owner or coalesce(auth.jwt()->> 'role', '') = 'admin')
                );
        $policy$;
    end if;
end
$$;
