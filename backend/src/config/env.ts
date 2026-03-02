export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  cacheTtl: parseInt(process.env.CACHE_TTL || '300', 10),
};

export default config;
