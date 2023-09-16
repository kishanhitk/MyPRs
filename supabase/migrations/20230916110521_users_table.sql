create table public.users (
    id uuid primary key default uuid_generate_v4 (),
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    full_name text,
    avatar_url text,
    github_username text
) tablespace pg_default;

create function public.handle_new_user() returns trigger language plpgsql security definer
set
    search_path = public as $$ begin
insert into
    public.users (id, full_name, avatar_url, github_username)
values
    (
        new.id,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url',
        new.raw_user_meta_data->>'user_name'
    );

return new;

end;

$$;

create trigger on_auth_user_created
after
insert
    on auth.users for each row execute procedure public.handle_new_user();