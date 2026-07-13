import express from 'express';
import cors from 'cors';
import path from 'path';
import { router } from './routes/api.routes';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos en /uploads
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// API Rutas
app.use('/', router);

export default app;
