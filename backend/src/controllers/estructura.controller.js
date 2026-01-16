const db = require('../config/database');
const XLSX = require('xlsx');
const fs = require('fs');

/**
 * CONTROLADOR: EstructuraController
 * Maneja la lógica de administración de tablas, datos e integración con Excel.
 */
const EstructuraController = {

  /**
   * 1. OBTENER TABLAS DISPONIBLES
   * Lista todas las tablas de la base de datos actual, filtrando las tablas 
   * del sistema y formateando los nombres para que sean legibles en el frontend.
   */
  getTablas: (req, res) => {
    // Detecta dinámicamente el nombre de la DB configurada
    const dbName = db.config?.connectionConfig?.database || db.config?.database || process.env.DB_NAME;

    if (!dbName) {
      console.error("Error: No se pudo determinar el nombre de la base de datos.");
      return res.status(500).json({ error: "Configuración de DB incompleta" });
    }

    // Consulta SQL para extraer nombres de tablas físicas (BASE TABLE)
    const sql = `
            SELECT TABLE_NAME as nombre_tabla 
            FROM information_schema.tables 
            WHERE table_schema = ? 
            AND table_type = 'BASE TABLE' 
            ORDER BY CREATE_TIME DESC
        `;

    db.query(sql, [dbName], (err, results) => {
      if (err) {
        console.error('Error SQL en getTablas:', err);
        return res.status(500).json({ error: 'Error al obtener tablas' });
      }

      // Lista de tablas que no queremos mostrar al usuario final
      const excluded = ['information_schema', 'mysql', 'performance_schema', 'sys', 'administradores'];

      // Filtramos y transformamos (ej: "inventario_refacciones" -> "Inventario Refacciones")
      const filtered = results
        .filter(row => !excluded.includes(row.nombre_tabla.toLowerCase()))
        .map(row => ({
          nombre_tabla: row.nombre_tabla,
          nombre_visible: row.nombre_tabla.replace(/_/g, ' ').replace(/(^|\s)\S/g, l => l.toUpperCase())
        }));

      res.json(filtered);
    });
  },

  /**
   * 2. OBTENER COLUMNAS DE UNA TABLA
   * Devuelve los nombres de todos los campos de una tabla específica.
   * Útil para generar formularios dinámicos en el frontend.
   */
  getColumnas: (req, res) => {
    const { tableName } = req.params;
    const dbName = db.config?.connectionConfig?.database || db.config?.database || process.env.DB_NAME;

    const sql = `
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = ? 
            ORDER BY ORDINAL_POSITION
        `;

    db.query(sql, [dbName, tableName], (err, results) => {
      if (err) return res.status(500).json({ error: 'Error al obtener columnas' });
      res.json(results.map(r => r.COLUMN_NAME));
    });
  },

  /**
   * 3. OBTENER DATOS GENERALES
   * Realiza un SELECT * de la tabla solicitada.
   * Nota: Usa backticks (\` \`) para evitar errores con nombres de tablas reservados.
   */
  getDatosTabla: (req, res) => {
    const { tableName } = req.params;
    db.query(`SELECT * FROM \`${tableName}\``, (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    });
  },

  /**
   * 4. OBTENER DATOS PARA LLAVES FORÁNEAS (FK)
   * Sirve para llenar selectores (dropdowns) en el frontend con datos de otra tabla.
   * Ejemplo: Si creas una 'Impresora', esta función trae la lista de 'Equipos' para vincularlos.
   */
  getDatosParaFK: (req, res) => {
    const { tabla } = req.params;

    // Validación de seguridad: Evita inyección SQL limitando caracteres permitidos
    if (!/^[a-zA-Z0-9_]+$/.test(tabla)) {
      return res.status(400).json({ success: false, message: 'Nombre de tabla inválido' });
    }

    db.query(`SELECT * FROM \`${tabla}\``, (err, results) => {
      if (err) {
        // Si la tabla no existe o está vacía, retornamos array vacío en vez de error 500
        console.error(`Aviso: La tabla de referencia ${tabla} no existe aún.`);
        return res.json([]);
      }
      res.json(results);
    });
  },

  /**
   * 5. CREAR TABLA DINÁMICA CON SOPORTE PARA FK
   * Permite al usuario crear nuevas categorías/tablas desde la interfaz.
   * Genera automáticamente una llave primaria (id_nombre_tabla) y vincula relaciones.
   */
  crearTabla: async (req, res) => {
    const { tableName, columns, foreignKeys } = req.body;
    if (!tableName || !columns) return res.status(400).json({ success: false, message: "Datos incompletos" });

    // Definición automática de la Primary Key autoincremental
    const primaryKey = `id_${tableName.toLowerCase().replace(/\s+/g, '_')}`;
    const columnDefinitions = [`\`${primaryKey}\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY`];

    // Formateo de columnas adicionales enviadas desde el frontend
    columns.forEach(col => {
      const colName = col.name.toLowerCase().replace(/\s+/g, '_');
      let colType = col.type.toUpperCase();
      // Validación de tipos permitidos para evitar errores de sintaxis en MySQL
      if (!['TEXT', 'INT', 'DATE', 'VARCHAR(255)'].includes(colType)) colType = 'VARCHAR(255)';
      columnDefinitions.push(`\`${colName}\` ${colType}`);
    });

    try {
      // Ejecución de la creación de la tabla base
      await db.promise().query(`CREATE TABLE \`${tableName}\` (${columnDefinitions.join(', ')})`);

      // Proceso de vinculación de Llaves Foráneas (si el usuario las definió)
      if (foreignKeys && foreignKeys.length > 0) {
        for (const fk of foreignKeys) {
          const fkCol = fk.column.toLowerCase().replace(/\s+/g, '_');

          // 1. Crear la columna que almacenará la relación
          await db.promise().query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${fkCol}\` INT UNSIGNED`);

          // 2. Crear la restricción (Constraint) para mantener la integridad de los datos
          await db.promise().query(`
                        ALTER TABLE \`${tableName}\` 
                        ADD CONSTRAINT \`fk_${tableName}_${fkCol}\` 
                        FOREIGN KEY (\`${fkCol}\`) REFERENCES \`${fk.referencesTable}\`(\`${fk.referencesColumn}\`) 
                        ON DELETE CASCADE ON UPDATE CASCADE
                    `);
        }
      }
      res.json({ success: true, message: `Tabla '${tableName}' creada con éxito.` });
    } catch (err) {
      console.error("Error al crear tabla:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
     * 6. AGREGAR REGISTRO (FILA)
     * Inserta un nuevo objeto de datos en la tabla especificada.
     * Genera dinámicamente los placeholders (?) para evitar inyecciones SQL.
     */
  agregarDato: (req, res) => {
    const { tableName, data } = req.body;
    // Extraemos las llaves del objeto para los nombres de columnas
    const columns = Object.keys(data).map(col => `\`${col}\``).join(', ');
    const values = Object.values(data);
    // Creamos una cadena de '?' proporcional al número de valores
    const placeholders = values.map(() => '?').join(', ');

    db.query(`INSERT INTO \`${tableName}\` (${columns}) VALUES (${placeholders})`, values, (err, result) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: "Registro agregado correctamente.", id: result.insertId });
    });
  },

  /**
   * 7. EDITAR REGISTRO
   * Actualiza los valores de una fila existente basándose en su ID único.
   */
  editarDato: (req, res) => {
    const { tableName, idColumn, idValue, data } = req.body;
    // Construimos la cadena: `columna1` = ?, `columna2` = ?
    const updates = Object.keys(data).map(col => `\`${col}\` = ?`).join(', ');

    db.query(`UPDATE \`${tableName}\` SET ${updates} WHERE \`${idColumn}\` = ?`, [...Object.values(data), idValue], (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: "Registro actualizado exitosamente." });
    });
  },

  /**
   * 8. ELIMINAR FILA
   * Borra un registro específico de la tabla.
   */
  eliminarFila: (req, res) => {
    const { tableName, idColumn, idValue } = req.body;
    db.query(`DELETE FROM \`${tableName}\` WHERE \`${idColumn}\` = ?`, [idValue], (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: "Fila eliminada." });
    });
  },

  /**
   * 9. AGREGAR COLUMNA A TABLA EXISTENTE
   * Permite expandir una tabla añadiendo un nuevo campo sin borrar los datos existentes.
   * Soporta posicionamiento (FIRST o AFTER columna).
   */
  agregarColumna: (req, res) => {
    const { tableName, columnName, columnType, afterColumn } = req.body;
    const safeCol = columnName.toLowerCase().replace(/\s+/g, '_');

    let sql = `ALTER TABLE \`${tableName}\` ADD COLUMN \`${safeCol}\` ${columnType || 'VARCHAR(255)'}`;

    if (afterColumn) {
      sql += afterColumn === 'FIRST' ? ` FIRST` : ` AFTER \`${afterColumn}\``;
    }

    db.query(sql, (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: "Columna añadida con éxito." });
    });
  },

  /**
   * 10. ELIMINAR COLUMNA
   * Quita un campo de la tabla. ¡Cuidado! Esta acción borra los datos de esa columna.
   */
  eliminarColumna: (req, res) => {
    const { tableName, columnName } = req.body;
    db.query(`ALTER TABLE \`${tableName}\` DROP COLUMN \`${columnName}\``, (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: "Columna eliminada." });
    });
  },

  /**
   * 11. ELIMINAR TABLA
   * Borra la tabla completa de la base de datos.
   * Incluye una capa de seguridad para evitar borrar tablas críticas del sistema.
   */
  eliminarTabla: (req, res) => {
    const { tableName } = req.body;
    // Lista de protección: Tablas que el usuario NO puede borrar desde la interfaz
    const protectedTabs = ['administradores', 'usuarios_sistema', 'login'];

    if (protectedTabs.includes(tableName.toLowerCase())) {
      return res.status(403).json({ success: false, message: "Esta tabla está protegida por el sistema." });
    }

    db.query(`DROP TABLE \`${tableName}\``, (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: "Tabla eliminada permanentemente." });
    });
  },

  /**
     * 12. AUTENTICACIÓN (LOGIN)
     * Valida las credenciales de los administradores.
     * Compara el correo y la contraseña contra la tabla 'administradores'. 
     */
  login: (req, res) => {
    const { correo, contraseña } = req.body;
    db.query("SELECT * FROM administradores WHERE correo = ? AND contraseña = ?", [correo, contraseña], (err, results) => {
      if (err) return res.status(500).json({ success: false, message: "Error en el servidor" });
      if (results.length > 0) {
        res.json({ success: true, message: "Acceso concedido" });
      } else {
        res.status(401).json({ success: false, message: "Credenciales inválidas" });
      }
    });
  },

  /**
   * 13. IMPORTAR EXCEL (VERSIÓN OPTIMIZADA)
   * Este método permite cargar un archivo .xlsx, crear una tabla con el nombre del archivo
   * y volcar todos los datos automáticamente en la base de datos.
   */
  importarExcel: async (req, res) => {
    let filePath = null;
    try {
      // Verificación de seguridad: ¿Se envió un archivo a través de Multer?
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No se subió ningún archivo." });
      }

      filePath = req.file.path; // Ruta temporal en 'backend/uploads/' [cite: 4, 13]

      // 1. PROCESAMIENTO DEL ARCHIVO
      // Leemos el libro de trabajo y obtenemos la primera hoja disponible
      const workbook = XLSX.readFile(filePath);
      const firstSheet = workbook.SheetNames[0];
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);

      // Validamos que el Excel contenga registros antes de continuar
      if (data.length === 0) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath); // Limpieza inmediata
        return res.status(400).json({ success: false, message: "El archivo Excel está vacío." });
      }

      // 2. NORMALIZACIÓN DEL NOMBRE DE LA TABLA
      // Limpiamos el nombre del archivo para que sea un nombre de tabla SQL válido
      const rawFileName = req.file.originalname.split('.')[0];
      const tableName = rawFileName
        .toLowerCase()
        .replace(/\s+/g, '_')        // Espacios por guiones bajos
        .replace(/[^a-z0-9_]/g, ''); // Eliminamos caracteres especiales

      // 3. DEFINICIÓN DE ESTRUCTURA
      // Extraemos los encabezados del Excel y los normalizamos para las columnas SQL
      const originalColumns = Object.keys(data[0]);
      const sqlColumns = originalColumns.map(col => col.trim().replace(/\s+/g, '_').toLowerCase());

      // 4. CREACIÓN DE LA TABLA EN CALIENTE
      // Creamos una llave primaria única basada en el nombre de la tabla
      const primaryKey = `id_${tableName}`;
      let sqlCreate = `CREATE TABLE IF NOT EXISTS \`${tableName}\` (
            \`${primaryKey}\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, `;

      // Definimos todas las columnas del Excel como VARCHAR(255) por compatibilidad general
      const colDefinitions = sqlColumns.map(col => `\`${col}\` VARCHAR(255)`);
      sqlCreate += colDefinitions.join(', ') + ')';

      // Usamos .promise() para manejar la ejecución asíncrona de la creación 
      await db.promise().query(sqlCreate);

      // 5. INSERCIÓN MASIVA (BULK INSERT)
      // Preparamos la consulta para insertar todos los datos en un solo movimiento
      const fields = sqlColumns.map(col => `\`${col}\``).join(', ');
      const sqlInsert = `INSERT INTO \`${tableName}\` (${fields}) VALUES ?`;

      // Mapeamos los datos del JSON a un array de arrays para MySQL
      const values = data.map(row => originalColumns.map(col => row[col] !== undefined ? row[col] : null));

      await db.promise().query(sqlInsert, [values]);

      // 6. CIERRE Y LIMPIEZA
      // Borramos el archivo de la carpeta 'uploads' para liberar espacio en el servidor [cite: 4, 13]
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.json({
        success: true,
        message: `La tabla '${tableName}' ha sido creada e importada con ${data.length} registros.`
      });

    } catch (error) {
      // En caso de fallo, intentamos borrar el archivo para evitar acumular "basura"
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      console.error("Error en importarExcel:", error);
      res.status(500).json({
        success: false,
        message: "Error al procesar el Excel: " + error.message
      });
    }
  },

  /**
   * 14. BUSCADOR GLOBAL INTELIGENTE
   * Escanea toda la base de datos buscando un término específico.
   * Además de encontrar coincidencias directas, intenta localizar registros 
   * relacionados (padres/hijos) basándose en las llaves foráneas.
   */
  buscarGlobal: async (req, res) => {
    const { query } = req.query; // Término de búsqueda enviado desde el frontend
    if (!query) {
      return res.status(400).json({ success: false, message: "Falta el término de búsqueda" });
    }

    // Identificamos la base de datos actual para consultar su esquema
    const dbName = db.config?.connectionConfig?.database || db.config?.database || process.env.DB_NAME;

    try {
      // 1. OBTENER METADATOS DE ESTRUCTURA
      // Consultamos INFORMATION_SCHEMA para saber qué tablas y columnas existen
      // Excluimos tablas críticas de seguridad para que no sean rastreadas
      const [columnsInfo] = await db.promise().query(`
        SELECT TABLE_NAME, COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME NOT IN ('administradores', 'usuarios_sistema', 'login')
      `, [dbName]);

      // Agrupamos las columnas por cada tabla en un mapa de memoria
      const tableMap = {};
      columnsInfo.forEach(row => {
        if (!tableMap[row.TABLE_NAME]) tableMap[row.TABLE_NAME] = [];
        tableMap[row.TABLE_NAME].push(row.COLUMN_NAME);
      });

      let resultados = []; // Guardará los registros que coinciden con el texto
      let hallazgos = [];   // Guardará los IDs para buscar relaciones después

      // 2. BÚSQUEDA DE TEXTO (COINCIDENCIAS DIRECTAS)
      // Recorremos cada tabla y generamos una consulta dinámica con "LIKE" para cada columna
      for (const tabla in tableMap) {
        const columnas = tableMap[tabla];
        const where = columnas.map(c => `\`${c}\` LIKE ?`).join(' OR ');
        const values = columnas.map(() => `%${query}%`);

        const [rows] = await db.promise().query(
          `SELECT * FROM \`${tabla}\` WHERE ${where}`,
          values
        );

        if (rows.length > 0) {
          resultados.push({ tabla, registros: rows });

          // Guardamos la referencia de la Primary Key (PK) para el paso de relaciones
          const pk = `id_${tabla.toLowerCase()}`;
          rows.forEach(r => {
            if (r[pk]) {
              hallazgos.push({ tabla, id: r[pk] });
            }
          });
        }
      }

      let relaciones = [];

      // 3. BÚSQUEDA DE RELACIONES "HIJO" (Ej: De Equipo a sus Impresoras)
      // Si encontramos un 'Equipo', buscamos qué otras tablas tienen una FK que lo mencione
      for (const h of hallazgos) {
        const fkEsperada = `id_${h.tabla.toLowerCase()}`;

        for (const tablaDestino in tableMap) {
          // Si la tabla destino tiene una columna que coincide con la PK del hallazgo
          if (!tableMap[tablaDestino].includes(fkEsperada)) continue;

          const [rows] = await db.promise().query(
            `SELECT * FROM \`${tablaDestino}\` WHERE \`${fkEsperada}\` = ?`,
            [h.id]
          );

          if (rows.length > 0) {
            relaciones.push({
              tablaRelacionada: tablaDestino,
              origenTabla: h.tabla,
              origenID: h.id,
              registros: rows
            });
          }
        }
      }

      // 4. BÚSQUEDA DE RELACIONES "PADRE" (Ej: De Refacción a su Proveedor)
      // Buscamos si el registro encontrado tiene columnas que apunten a otras tablas
      for (const h of hallazgos) {
        const tablaActual = h.tabla;
        const columnas = tableMap[tablaActual];

        for (const col of columnas) {
          if (!col.startsWith('id_')) continue; // Solo nos interesan columnas tipo ID

          const tablaPadre = col.replace('id_', ''); // Deducimos el nombre de la tabla padre
          if (!tableMap[tablaPadre]) continue;

          const [rows] = await db.promise().query(
            `SELECT * FROM \`${tablaPadre}\` WHERE \`id_${tablaPadre}\` = ?`,
            [h.id]
          );

          if (rows.length > 0) {
            relaciones.push({
              tablaRelacionada: tablaPadre,
              origenTabla: tablaActual,
              origenID: h.id,
              registros: rows
            });
          }
        }
      }

      // Devolvemos tanto los resultados directos como las conexiones encontradas
      res.json({
        success: true,
        data: resultados,
        relaciones
      });

    } catch (error) {
      console.error("Error en buscador global:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

};

/**
 * EXPORTACIÓN DEL MÓDULO
 * Hace que todas las funciones definidas en EstructuraController 
 * estén disponibles para ser utilizadas en las rutas (routes/).
 */
module.exports = EstructuraController;