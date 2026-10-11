import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

import attendanceRouter from './routes/attendance';
import studentsRouter from './routes/students';
import classesRouter from './routes/classes';
import authRouter from './routes/auth';
import reportsRouter from './routes/reports';

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Mount routers under /api prefix (frontend proxy expects this)
app.use('/api/attendance', attendanceRouter);
app.use('/api/students', studentsRouter);
app.use('/api/classes', classesRouter);
app.use('/api/auth', authRouter);
app.use('/api/reports', reportsRouter);

const PORT = process.env.PORT ?? 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend listening on http://localhost:${PORT}`);
});
