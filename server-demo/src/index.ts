import app from './app';

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`[Demo RAM Server - Imágenes] Corriendo en http://localhost:${PORT}`);
});
