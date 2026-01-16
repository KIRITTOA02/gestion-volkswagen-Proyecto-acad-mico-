/**
 * CONFIGURACIÓN DEL SERVIDOR EXPRESS
 * En este archivo se centralizan los middlewares, la configuración de seguridad (CORS),
 * el enrutamiento de la API y la entrega de archivos estáticos del frontend.
 */

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const estructuraRoutes = require('./routes/estructura.routes');

const app = express();

// ==========================================
// 1. MIDDLEWARES DE PARSEO
// ==========================================
// Permite al servidor entender datos en formato JSON y formularios URL-encoded
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ==========================================
// 2. CONFIGURACIÓN DE SEGURIDAD (CORS)
// ==========================================
// Permite peticiones desde otros dominios (útil durante el desarrollo y producción)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  // Manejo de peticiones de pre-vuelo (preflight requests)
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ==========================================
// 3. ENRUTAMIENTO DE LA API
// ==========================================
// Todas las rutas de gestión de datos estarán bajo el prefijo /api
app.use('/api', estructuraRoutes);

// ==========================================
// 4. ARCHIVOS ESTÁTICOS Y FRONTEND
// ==========================================
// Servimos la carpeta raíz del frontend para que el navegador pueda acceder a CSS/JS/Imágenes
app.use(express.static(path.join(__dirname, '../../frontend')));

// Exponemos la carpeta de uploads para acceso directo a archivos subidos (ej: Excels, imágenes)
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// ==========================================
// 5. MANEJO DE LA RUTA RAÍZ
// ==========================================
// Redirige al usuario automáticamente a la página de login al acceder a la URL principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/auth/auth.html'));
});

/**
 * EXPORTACIÓN
 * Exportamos la instancia de 'app' para que 'server.js' pueda iniciar el servidor.
 */
module.exports = app;