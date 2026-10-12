begin;
-- Existing users without the marker retain access. User-editable metadata and
-- stale JWT claims cannot bypass the authoritative Auth app-metadata check.
create or replace function public.portal_access(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select coalesce(public.portal_admin() or (
    public.portal_role() in ('client','staff')
    and exists(select 1 from auth.users u where u.id=auth.uid()
      and coalesce(u.raw_app_meta_data->>'portal_password_change_required','false') <> 'true')
    and exists (
      select 1 from public.portal_memberships m join public.portal_clients c on c.id=m.client_id
      where m.user_id=auth.uid() and m.client_id=target and c.status='active'
    )),false)
$$;
insert into public.portal_schema_releases(version) values('202610130001');
commit;
