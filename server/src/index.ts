import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { chatRouter } from './routes/chat.js';
import { conversationsRouter } from './routes/conversations.js';
import { agentConfigRouter } from './routes/agent-config.js';

const app = express();

// Enable CORS for Vite dev server (port 8080 or 5173) and Looker host domains
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Generous payload limits for multi-modal base64 images and large JSON datasets
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Mount routes
app.use('/api/chat', chatRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/agent', agentConfigRouter);

// Root healthcheck
app.get('/', (_req, res) => {
  res.json({
    name: 'Gemini Agent Backend Service',
    status: 'running',
    model: config.defaultModel,
  });
});

app.listen(config.port, () => {
  console.log(`🚀 Gemini Agent Backend Service running at http://localhost:${config.port}`);
  console.log(`📡 SSE Chat endpoint: http://localhost:${config.port}/api/chat/stream`);
});
