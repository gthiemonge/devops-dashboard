import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { initializeDatabase } from './db/database.js';
import { dashboardsRouter } from './routes/dashboards.js';
import { dataSourcesRouter } from './routes/datasources.js';
import { credentialsRouter } from './routes/credentials.js';
import { widgetsRouter } from './routes/widgets.js';
import { layoutRouter } from './routes/layout.js';
import { proxyRouter } from './routes/proxy.js';
import { summaryRouter } from './routes/summary.js';

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

app.listen(config.port, () => {
  console.log(`Backend server running on http://localhost:${config.port}`);
});

export default app;
