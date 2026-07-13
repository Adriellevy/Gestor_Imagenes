import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { store } from '../store/memoryStore';

const uploadsDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

export const router = Router();

// AUTH
router.post('/auth/login', (req: Request, res: Response): void => {
  const { userId } = req.body;
  const user = store.findUsuarioById(userId) || store.getUsuarios()[0];
  res.json({
    access_token: 'demo-ram-token-img-' + userId,
    user
  });
});

// USUARIOS
router.get('/usuarios', (req: Request, res: Response) => {
  res.json(store.getUsuarios());
});

// PACIENTES
router.get('/pacientes/padron', (req: Request, res: Response) => {
  res.json(store.getPadron());
});

router.get('/pacientes', (req: Request, res: Response) => {
  res.json(store.getPacientes());
});

router.post('/pacientes', (req: Request, res: Response) => {
  const creado = store.createPaciente(req.body);
  res.status(201).json(creado);
});

// INTERNACIONES
router.get('/internaciones', (req: Request, res: Response) => {
  res.json(store.getInternaciones());
});

router.post('/internaciones', (req: Request, res: Response) => {
  const creada = store.createInternacion(req.body);
  res.status(201).json(creada);
});

router.patch('/internaciones/:id/ubicacion', (req: Request, res: Response): void => {
  const { id } = req.params;
  const { cama, sector } = req.body;
  const actualizada = store.updateUbicacionInternacion(id, cama, sector);
  if (!actualizada) {
    res.status(404).json({ error: 'Internación no encontrada' });
    return;
  }
  res.json(actualizada);
});

// PEDIDOS
router.get('/pedidos/terminados', (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 6;
  res.json(store.getPedidosTerminados(page, limit));
});

router.get('/pedidos', (req: Request, res: Response) => {
  res.json(store.getPedidos());
});

router.post('/pedidos', (req: Request, res: Response) => {
  const creado = store.createPedido(req.body);
  res.status(201).json(creado);
});

router.patch('/pedidos/:id/estado', (req: Request, res: Response): void => {
  const { id } = req.params;
  const { estado, userId } = req.body;
  const actualizado = store.cambiarEstadoPedido(id, estado, userId);
  if (!actualizado) {
    res.status(404).json({ error: 'Pedido no encontrado' });
    return;
  }
  res.json(actualizado);
});

router.patch('/pedidos/:id/vista', (req: Request, res: Response): void => {
  const { id } = req.params;
  const { userId } = req.body;
  const actualizado = store.acuseReciboEmergencia(id, userId);
  if (!actualizado) {
    res.status(404).json({ error: 'Pedido no encontrado' });
    return;
  }
  res.json(actualizado);
});

router.patch('/pedidos/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const actualizado = store.updatePedido(id, req.body);
  if (!actualizado) {
    res.status(404).json({ error: 'Pedido no encontrado' });
    return;
  }
  res.json(actualizado);
});

// TIPOS ESTUDIO
router.get('/tipos-estudio', (req: Request, res: Response) => {
  res.json(store.getTiposEstudio());
});

// RESET
router.post('/reset', (req: Request, res: Response) => {
  store.reset();
  res.json({ status: 'ok', message: 'Servidor demo en RAM de Imágenes reiniciado al estado semilla' });
});
