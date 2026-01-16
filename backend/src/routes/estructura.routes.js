/**
 * DEFINICIÓN DE RUTAS - SISTEMA GESTIÓN VOLKSWAGEN
 * Este archivo mapea las URLs del frontend con las funciones lógicas del controlador.
 */

const express = require('express');
const router = express.Router();
const EstructuraController = require('../controllers/estructura.controller');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ==========================================
// CONFIGURACIÓN DE ALMACENAMIENTO (MULTER)
// ==========================================
// Definimos la ruta donde se guardarán temporalmente los archivos Excel
const uploadPath = path.join(__dirname, '../../uploads');

// Aseguramos que la carpeta exista al arrancar el servidor para evitar errores
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadPath),
    filename: (req, file, cb) => {
        // Generamos un nombre único para evitar conflictos entre archivos con el mismo nombre
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// ==========================================
// 1. RUTAS ESTÁTICAS (Prioridad Alta)
// Estas rutas tienen nombres fijos y deben ir primero.
// ==========================================

// Autenticación de administradores
router.post('/login', EstructuraController.login);

// Listado de tablas para construir el menú lateral dinámico
router.get('/tablas', EstructuraController.getTablas);
router.get('/menu', EstructuraController.getTablas);

// Buscador Global: Debe estar antes de las rutas dinámicas para no ser interceptado
router.get('/buscar', EstructuraController.buscarGlobal);

// ==========================================
// 2. RUTAS DINÁMICAS (Parámetros :variable)
// Ordenadas de lo más específico a lo más general.
// ==========================================

// Obtener registros de una tabla específica para llenar selects de llaves foráneas
router.get('/datos/:tabla', EstructuraController.getDatosParaFK);

// Obtener los nombres de las columnas de una tabla para armar formularios
router.get('/:tableName/columnas', EstructuraController.getColumnas);

// Obtener todos los registros de una tabla (Ruta general de consulta)
// IMPORTANTE: Se coloca al final de los GET para no interferir con /buscar o /tablas
router.get('/:tableName', EstructuraController.getDatosTabla);

// ==========================================
// 3. RUTAS DE ACCIÓN Y MODIFICACIÓN (POST)
// Gestión de estructura de base de datos y CRUD de registros.
// ==========================================

// Gestión de Tablas
router.post('/creartabla', EstructuraController.crearTabla);
router.post('/eliminartabla', EstructuraController.eliminarTabla);

// Gestión de Columnas
router.post('/agregarcolumna', EstructuraController.agregarColumna);
router.post('/eliminarcolumna', EstructuraController.eliminarColumna);

// Gestión de Datos (CRUD)
router.post('/agregardato', EstructuraController.agregarDato);
router.post('/editardato', EstructuraController.editarDato);
router.post('/eliminarfila', EstructuraController.eliminarFila);

// Importación Masiva: Usa el middleware de Multer para procesar el archivo Excel
router.post('/importarexcel', upload.single('file'), EstructuraController.importarExcel);

/**
 * EXPORTACIÓN
 * El router se importa en app.js para ser usado bajo el prefijo configurado (ej: /api)
 */
module.exports = router;