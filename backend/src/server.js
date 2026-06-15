import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import './database.js';
import authRoutes from './routes/auth.js';
import overtimeRoutes from './routes/overtime.js';
import approvalRoutes from './routes/approval.js';
import leaveRoutes from './routes/leave.js';
import statsRoutes from './routes/stats.js';
import adminRoutes from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/overtime', overtimeRoutes);
app.use('/api/approval', approvalRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);

const frontendDist = join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(join(frontendDist, 'index.html'));
});

app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Frontend served from: ${frontendDist}`);
});
