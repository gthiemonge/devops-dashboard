import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../../data/dashboard.db');
const db = new Database(dbPath);

console.log('Running migration to add multi-dashboard support...\n');

try {
  // 1. Create dashboards table
  console.log('1. Creating dashboards table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS dashboards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT 'Dashboard',
      position INTEGER NOT NULL DEFAULT 0,
      layout TEXT NOT NULL DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
  console.log('   Done.');

  // 2. Create default dashboard with existing layout
  console.log('2. Creating default dashboard with existing layout...');
  const existingLayout = db.prepare("SELECT items FROM layouts WHERE id = 1").get() as { items: string } | undefined;
  const layoutJson = existingLayout?.items || '[]';

  const dashboardExists = db.prepare("SELECT id FROM dashboards WHERE id = 1").get();
  if (!dashboardExists) {
    db.prepare("INSERT INTO dashboards (id, name, position, layout) VALUES (1, 'Main', 0, ?)").run(layoutJson);
    console.log('   Created "Main" dashboard with existing layout.');
  } else {
    console.log('   Dashboard already exists, skipping.');
  }

  // 3. Add dashboard_id column to widgets
  console.log('3. Adding dashboard_id column to widgets...');
  const columns = db.prepare("PRAGMA table_info(widgets)").all() as { name: string }[];
  const hasDashboardId = columns.some(col => col.name === 'dashboard_id');

  if (!hasDashboardId) {
    // SQLite doesn't allow REFERENCES with DEFAULT in ALTER TABLE, so add without constraint
    db.exec("ALTER TABLE widgets ADD COLUMN dashboard_id INTEGER DEFAULT 1;");
    // Update any NULL values to 1
    db.exec("UPDATE widgets SET dashboard_id = 1 WHERE dashboard_id IS NULL;");
    console.log('   Added dashboard_id column (all widgets assigned to dashboard 1).');
  } else {
    console.log('   Column already exists, skipping.');
  }

  // 4. Add IRC data source
  console.log('4. Adding IRC data source...');
  const ircExists = db.prepare("SELECT id FROM data_sources WHERE type = 'irc'").get();
  if (!ircExists) {
    db.prepare("INSERT INTO data_sources (name, type, base_url) VALUES ('OpenDev IRC Logs', 'irc', 'https://meetings.opendev.org/irclogs')").run();
    console.log('   Added OpenDev IRC Logs data source.');
  } else {
    console.log('   IRC data source already exists, skipping.');
  }

  // 5. Create indexes
  console.log('5. Creating indexes...');
  db.exec("CREATE INDEX IF NOT EXISTS idx_widgets_dashboard ON widgets(dashboard_id);");
  db.exec("CREATE INDEX IF NOT EXISTS idx_dashboards_position ON dashboards(position);");
  console.log('   Done.');

  console.log('\n✓ Migration completed successfully!');
  console.log('  Your existing widgets and layout have been preserved.');
  console.log('  All widgets are now in the "Main" dashboard.');

} catch (err) {
  console.error('\n✗ Migration failed:', (err as Error).message);
  process.exit(1);
} finally {
  db.close();
}
