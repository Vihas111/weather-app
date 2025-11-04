import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());           // allow http://localhost:3000
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ uptime: process.uptime(), timestamp: Date.now() });
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`✅ API running at http://localhost:${PORT}`);
});
