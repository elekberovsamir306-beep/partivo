// In-process Postgres (PGlite) that mimics the parts of Supabase our migrations rely on:
// the anon / authenticated / service_role roles, auth.users + auth.uid(), and storage buckets/objects.
// Every migration in supabase/migrations is applied verbatim, so these tests exercise the real schema,
// RLS policies, grants and functions.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

const SUPABASE_STUB = `
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create schema if not exists extensions;
grant usage on schema public, extensions to anon, authenticated, service_role;

-- Supabase grants broad defaults on public; our security migration revokes them explicitly.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone text,
  phone_confirmed_at timestamptz,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create function auth.role() returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claim.role', true), '')
$$;
grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;

create schema storage;
grant usage on schema storage to anon, authenticated, service_role;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null,
  owner uuid,
  created_at timestamptz default now(),
  unique (bucket_id, name)
);
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;
grant select on storage.buckets to anon, authenticated, service_role;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:greatest(cardinality(string_to_array(name, '/')) - 1, 0)]
$$;
grant execute on function storage.foldername(text) to anon, authenticated, service_role;
`;

export type Role = "anon" | "authenticated" | "service_role";

export interface TestDb {
  pg: PGlite;
  /** Runs fn inside a transaction as the given role / user, then rolls back the role switch. */
  as<T>(role: Role, userId: string | null, fn: (tx: Transaction) => Promise<T>): Promise<T>;
  createUser(opts?: { email?: string; displayName?: string; phone?: string }): Promise<string>;
  close(): Promise<void>;
}

export async function createTestDb(): Promise<TestDb> {
  const pg = new PGlite({ extensions: { pg_trgm } });
  await pg.exec(SUPABASE_STUB);

  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    try {
      await pg.exec(sql);
    } catch (error) {
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
    }
  }

  return {
    pg,
    async as(role, userId, fn) {
      return pg.transaction(async (tx) => {
        await tx.query(`select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', $2, true)`, [
          userId ?? "",
          role,
        ]);
        await tx.exec(`set local role ${role}`);
        return fn(tx);
      });
    },
    async createUser(opts = {}) {
      const id = randomUUID();
      await pg.query(
        `insert into auth.users (id, email, phone, raw_user_meta_data) values ($1, $2, $3, $4)`,
        [id, opts.email ?? `${id.slice(0, 8)}@example.test`, opts.phone ?? null, { display_name: opts.displayName ?? "Test İstifadəçi" }],
      );
      return id;
    },
    close: () => pg.close(),
  };
}
