import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { config } from './config/env.js';
import { initializeDatabase } from './db/database.js';
import { dashboardsRouter } from './routes/dashboards.js';
import { dataSourcesRouter } from './routes/datasources.js';
import { credentialsRouter } from './routes/credentials.js';
import { widgetsRouter } from './routes/widgets.js';
import { layoutRouter } from './routes/layout.js';
import { proxyRouter } from './routes/proxy.js';
import { summaryRouter } from './routes/summary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

initializeDatabase();

app.use('/api/v1/dashboards', dashboardsRouter);
app.use('/api/v1/datasources', dataSourcesRouter);
app.use('/api/v1/credentials', credentialsRouter);
app.use('/api/v1/widgets', widgetsRouter);
app.use('/api/v1/layout', layoutRouter);
app.use('/api/v1/proxy', proxyRouter);
app.use('/api/v1/summary', summaryRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static frontend files in production
// In container: files are at /app/backend/dist/public
// In dev with manual build: files might be at ../frontend/dist
const staticPath = existsSync(join(__dirname, 'public'))
  ? join(__dirname, 'public')
  : join(__dirname, '../../frontend/dist');

if (config.nodeEnv === 'production' && existsSync(staticPath)) {
  app.use(express.static(staticPath));

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(join(staticPath, 'index.html'));
  });

  console.log(`Serving static files from ${staticPath}`);
}

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port} (${config.nodeEnv})`);
});

export default app;
