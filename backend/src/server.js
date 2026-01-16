/**
 * PUNTO DE ENTRADA PRINCIPAL - SERVIDOR DE GESTIÓN VOLKSWAGEN
 * Este archivo inicializa el servidor Express, configura los middlewares de seguridad,
 * gestiona las rutas de la API y pone el sistema en escucha en el puerto configurado.
 */

const express = require('express');
const path = require('path');
const estructuraRoutes = require('./routes/estructura.routes');

const app = express();
const port = 3000; // Puerto por defecto para el entorno de desarrollo

// ==========================================
// 1. MIDDLEWARES (Procesamiento de Datos)
// ==========================================
// Reemplazamos 'body-parser' por los métodos nativos de Express para manejar JSON y formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// 2. CONFIGURACIÓN DE SEGURIDAD (CORS)
// ==========================================
// Permite que el frontend se comunique con el backend aunque estén en diferentes dominios/puertos
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  // Manejo de peticiones de pre-vuelo (preflight) para seguridad en navegadores
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ==========================================
// 3. ARCHIVOS ESTÁTICOS
// ==========================================
// Servimos la carpeta 'frontend' para que el navegador pueda cargar CSS, JS e imágenes
app.use(express.static(path.join(__dirname, '../../frontend')));

// ==========================================
// 4. DEFINICIÓN DE RUTAS DE LA API
// ==========================================
// Montamos las rutas bajo el prefijo '/api/estructura' para mantener orden y versionado
app.use('/api/estructura', estructuraRoutes);

// ==========================================
// 5. MANEJO DE LA RUTA RAÍZ
// ==========================================
// Al entrar a la URL principal, cargamos automáticamente la pantalla de Login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/auth/auth.html'));
});

// ==========================================
// 6. LANZAMIENTO DEL SERVIDOR
// ==========================================
// Iniciamos la escucha de peticiones en el puerto definido
app.listen(port, () => {
  console.log(`🚀 Servidor corriendo exitosamente en: http://localhost:${port}`);
  console.log(`📂 Frontend servido desde: ${path.join(__dirname, '../../frontend')}`);
});