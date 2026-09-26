import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Dual mounting guarantees Vite proxy hits the route handler
app.use('/api', routes);
app.use('/', routes);

// Only listen locally. Vercel imports this app directly as a serverless handler.
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;