/**
 * DATA.JS - CAPA DE SERVICIOS (API CONSUMER)
 * Este archivo centraliza las peticiones HTTP al backend para la obtención
 * de metadatos del esquema y registros de la base de datos.
 */

/**
 * Recupera el catálogo maestro de tablas configuradas en el sistema.
 * @returns {Promise<Array>} Promesa que resuelve a un arreglo de objetos 
 * con las propiedades 'nombre_tabla' (ID técnico) y 'nombre_visible' (Label UI).
 */
async function getTables() {
    try {
        // Consulta al endpoint principal de estructura
        const response = await fetch('http://localhost:3000/tablas');
        
        // Validación de estado de respuesta (HTTP 200-299)
        if (!response.ok) throw new Error('Fallo en la sincronización con el catálogo de tablas');
        
        const data = await response.json();
        
        /**
         * NOTA TÉCNICA: Se retorna el objeto íntegro para permitir al frontend
         * realizar el mapeo entre nombres técnicos de SQL y etiquetas amigables.
         */
        return data; 
    } catch (error) {
        // Registro de error en consola para depuración técnica
        console.error('Error Crítico [getTables]:', error);
        return []; // Retorno preventivo de arreglo vacío para evitar errores de iteración en la UI
    }
}

/**
 * Recupera el set de datos completo de una tabla específica.
 * @param {string} tableName - El nombre técnico de la tabla en la base de datos.
 * @returns {Promise<Array>} Promesa con la colección de filas (objetos JSON).
 */
async function getTableData(tableName) {
    // Validación de guardia: Evita peticiones innecesarias si no hay una tabla seleccionada
    if (!tableName || tableName === 'todas') return [];
    
    try {
        /**
         * Inyección dinámica de parámetro en la URL del endpoint.
         * La ruta en el backend está definida mediante parámetros de ruta (/:tableName).
         */
        const response = await fetch(`http://localhost:3000/${tableName}`);
        
        if (!response.ok) throw new Error(`Error al intentar recuperar registros de la tabla: ${tableName}`);
        
        // Conversión del flujo de datos a formato de objeto JavaScript
        return await response.json();
    } catch (error) {
        // Captura de excepciones de red o de parseo de JSON
        console.error(`Error de Red [getTableData - ${tableName}]:`, error);
        return [];
    }
}