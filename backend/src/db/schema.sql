-- Data Sources (Gerrit, Zuul instances)
CREATE TABLE IF NOT EXISTS data_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('gerrit', 'zuul', 'github', 'jira', 'launchpad')),
    base_url TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Credentials for data sources (optional)
CREATE TABLE IF NOT EXISTS credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_source_id INTEGER NOT NULL UNIQUE,
    username TEXT NOT NULL,
    password TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (data_source_id) REFERENCES data_sources(id) ON DELETE CASCADE
);

-- Widget types registry
CREATE TABLE IF NOT EXISTS widget_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    supported_source_types TEXT NOT NULL,  -- JSON array of supported data source types
    default_config TEXT,  -- JSON default configuration
    created_at TEXT DEFAULT (datetime('now'))
);

-- Widget instances
CREATE TABLE IF NOT EXISTS widgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    data_source_id INTEGER NOT NULL,
    config TEXT DEFAULT '{}',  -- JSON configuration
    refresh_interval INTEGER DEFAULT 300,  -- seconds
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (data_source_id) REFERENCES data_sources(id) ON DELETE CASCADE
);

-- Dashboard layouts (react-grid-layout positions)
CREATE TABLE IF NOT EXISTS layouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT 'default',
    items TEXT NOT NULL DEFAULT '[]',  -- JSON array of layout items
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_widgets_type ON widgets(type);
CREATE INDEX IF NOT EXISTS idx_widgets_data_source ON widgets(data_source_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_type ON data_sources(type);

-- Seed default data sources
INSERT OR IGNORE INTO data_sources (name, type, base_url) VALUES
    ('OpenDev Gerrit', 'gerrit', 'https://review.opendev.org'),
    ('OpenStack Zuul', 'zuul', 'https://zuul.openstack.org');

-- Seed widget types
INSERT OR IGNORE INTO widget_types (name, display_name, description, supported_source_types, default_config) VALUES
    ('gerrit_recent_changes', 'Recent Gerrit Changes', 'Shows recent changes for a project', '["gerrit"]', '{"project": "openstack/octavia", "limit": 10}'),
    ('gerrit_my_changes', 'My Gerrit Changes', 'Shows your changes needing attention', '["gerrit"]', '{"limit": 10}'),
    ('zuul_periodic_jobs', 'Failed Periodic Jobs', 'Shows failed periodic Zuul jobs', '["zuul"]', '{"project": "openstack/octavia", "pipeline": "periodic", "limit": 10}');

-- Seed default layout
INSERT OR IGNORE INTO layouts (id, name, items) VALUES (1, 'default', '[]');
