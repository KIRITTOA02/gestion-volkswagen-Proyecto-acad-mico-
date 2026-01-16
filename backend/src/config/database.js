/**
 * CONFIGURACIÓN DE LA CONEXIÓN A LA BASE DE DATOS
 * Este archivo establece la conexión con MySQL utilizando variables de entorno
 */

const mysql = require('mysql2');
// Carga las variables desde el archivo .env a process.env
require('dotenv').config();

/**
 * Configuración de la conexión.
 */
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD, // Se toma automáticamente del .env
  database: process.env.DB_NAME,     // Se toma automáticamente del .env
  port: process.env.DB_PORT || 3307
});

/**
 * Inicialización de la conexión
 */
db.connect(err => {
  if (err) {
    console.error('❌ Error CRÍTICO al conectar a la base de datos:', err.message);
    return;
  }
  console.log('✅ Conexión exitosa a la base de datos MySQL');
});

module.exports = db;