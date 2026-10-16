import express from 'express';
import cors from 'cors';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes)
app.use('/sessions', sessionRoutes)

//health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});


app.use(notFound);
app.use(errorHandler);

export default app;