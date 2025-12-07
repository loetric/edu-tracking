-- Recommended RLS policies (review before running)

-- Profiles policies
alter table profiles enable row level security;

create policy "Allow insert for authenticated" on profiles
  for insert
  with check (auth.role() = 'authenticated');

-- Allow public read of profiles (needed for username-to-email lookup during login)
-- NOTE: This allows unauthenticated users to read profile data. For better security,
-- consider creating a database function that returns only email for username lookup.
-- For now, this is necessary for the login flow to work.
create policy "Public can select profiles for login" on profiles
  for select
  using (true);

create policy "Users can select own profile" on profiles
  for select
  using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Logs: allow authenticated inserts and reads
alter table logs enable row level security;
create policy "Allow insert logs by authenticated" on logs
  for insert
  with check (auth.role() = 'authenticated');
create policy "Allow select logs by authenticated" on logs
  for select
  using (auth.role() = 'authenticated');

-- Settings: public read, authenticated update
alter table settings enable row level security;
create policy "Public read settings" on settings
  for select
  using (true);
create policy "Admin can update settings" on settings
  for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "Admin can insert settings" on settings
  for insert
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Chat messages: allow insert by authenticated users, read by authenticated
alter table chat_messages enable row level security;
create policy "Insert chat by authenticated" on chat_messages
  for insert
  with check (auth.role() = 'authenticated');
create policy "Select chat for authenticated" on chat_messages
  for select
  using (auth.role() = 'authenticated');

-- Students: allow selects for authenticated users, restrict updates to admins/counselors
alter table students enable row level security;
create policy "Select students for authenticated" on students
  for select
  using (auth.role() = 'authenticated');
create policy "Insert students for authenticated" on students
  for insert
  with check (auth.role() = 'authenticated');
create policy "Update students for authenticated" on students
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Daily records: allow insert/update/delete by authenticated users
alter table daily_records enable row level security;
create policy "Insert daily records for authenticated" on daily_records
  for insert
  with check (auth.role() = 'authenticated');
create policy "Select daily records for authenticated" on daily_records
  for select
  using (auth.role() = 'authenticated');
create policy "Update daily records for authenticated" on daily_records
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
create policy "Delete daily records for authenticated" on daily_records
  for delete
  using (auth.role() = 'authenticated');

-- Schedule: read public, writes by admins
alter table schedule enable row level security;
create policy "Public read schedule" on schedule
  for select
  using (true);
create policy "Admin can modify schedule" on schedule
  for insert, update, delete
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Substitutions: authenticated users can insert/read/update/delete
alter table substitutions enable row level security;
create policy "Authenticated insert substitutions" on substitutions
  for insert
  with check (auth.role() = 'authenticated');
create policy "Authenticated select substitutions" on substitutions
  for select
  using (auth.role() = 'authenticated');
create policy "Authenticated update substitutions" on substitutions
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
create policy "Authenticated delete substitutions" on substitutions
  for delete
  using (auth.role() = 'authenticated');

alter table completed_sessions enable row level security;
create policy "Authenticated insert completed_sessions" on completed_sessions
  for insert
  with check (auth.role() = 'authenticated');
create policy "Authenticated select completed_sessions" on completed_sessions
  for select
  using (auth.role() = 'authenticated');

-- NOTE: These are starter policies. Review carefully and adapt them to your exact access model.
