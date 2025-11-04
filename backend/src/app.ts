import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// root + health (enough for Story 0.1)
app.get('/', (_req, res) => res.json({ name: 'RTWAPT API', status: 'ok' }));
app.get('/health', (_req, res) =>
  res.json({ uptime: process.uptime(), timestamp: Date.now() })
);

// versioned namespace placeholder
app.get('/api/v1/hello', (_req, res) => res.json({ message: 'Hello from v1' }));

export default app;
