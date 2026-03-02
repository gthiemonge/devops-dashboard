-- Migration: Add multi-dashboard support
-- Run with: sqlite3 backend/data/dashboard.db < backend/src/db/migrate-to-dashboards.sql

-- 1. Create dashboards table
CREATE TABLE IF NOT EXISTS dashboards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT 'Dashboard',
    position INTEGER NOT NULL DEFAULT 0,
    layout TEXT NOT NULL DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 2. Create default dashboard with existing layout
INSERT INTO dashboards (id, name, position, layout)
SELECT 1, 'Main', 0, COALESCE((SELECT items FROM layouts WHERE id = 1), '[]')
WHERE NOT EXISTS (SELECT 1 FROM dashboards WHERE id = 1);

-- 3. Add dashboard_id column to widgets if it doesn't exist
-- SQLite doesn't have IF NOT EXISTS for ALTER TABLE, so we use a trick
CREATE TABLE IF NOT EXISTS _migration_check (id INTEGER);
INSERT OR IGNORE INTO _migration_check VALUES (1);

-- Check if column exists by trying to select it
SELECT dashboard_id FROM widgets LIMIT 0;
-- If the above fails, the column doesn't exist. Run this manually:
-- ALTER TABLE widgets ADD COLUMN dashboard_id INTEGER NOT NULL DEFAULT 1 REFERENCES dashboards(id) ON DELETE CASCADE;

-- 4. Add IRC data source if not exists
INSERT OR IGNORE INTO data_sources (name, type, base_url)
VALUES ('OpenDev IRC Logs', 'irc', 'https://meetings.opendev.org/irclogs');

-- 5. Add missing widget types
INSERT OR IGNORE INTO widget_types (name, display_name, description, supported_source_types, default_config)
VALUES ('gerrit_user_changes', "User's Gerrit Changes", "Shows another user's open changes", '["gerrit"]', '{"owner": "", "limit": 10}');

INSERT OR IGNORE INTO widget_types (name, display_name, description, supported_source_types, default_config)
VALUES ('irc_recent_messages', 'IRC Recent Messages', 'Shows recent IRC messages from a channel', '["irc"]', '{"channel": "openstack-lbaas", "limit": 20}');

-- 6. Create index for dashboard lookups
CREATE INDEX IF NOT EXISTS idx_widgets_dashboard ON widgets(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_dashboards_position ON dashboards(position);

-- Cleanup
DROP TABLE IF EXISTS _migration_check;
