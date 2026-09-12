CREATE INDEX users_active_role_idx ON users(is_active, role);
CREATE INDEX time_entries_status_date_idx ON time_entries(status, work_date DESC);
CREATE INDEX time_entries_processed_idx ON time_entries(processed_at) WHERE processed_at IS NOT NULL;
