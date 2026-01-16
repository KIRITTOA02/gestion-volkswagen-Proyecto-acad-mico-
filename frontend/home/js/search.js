/**
 * SEARCH.JS - MOTOR DE BÚSQUEDA INTEGRAL
 * Implementa una búsqueda multi-tabla que no solo localiza coincidencias directas,
 * sino que rastrea dependencias y relaciones en toda la base de datos.
 */

/**
 * Ejecuta la lógica de búsqueda global.
 * Captura el término de búsqueda, consulta al endpoint de descubrimiento 
 * y renderiza los resultados categorizados por origen y relación.
 */
async function ejecutarBuscadorGlobal() {
    const q = document.getElementById("searchQuery").value.trim();
    const contenedor = document.getElementById("table-container");

    // Validación de entrada: Evita peticiones vacías al servidor
    if (!q) {
        contenedor.innerHTML = "<p class='search-msg'>Escribe algo para buscar.</p>";
        return;
    }

    // Feedback visual inmediato (Skeleton/Loader)
    contenedor.innerHTML = "<p class='search-msg'>🔍 Buscando coincidencias en la base de datos...</p>";

    try {
        /**
         * Petición al endpoint de búsqueda avanzada.
         * El servidor devuelve un objeto con dos ramas: 'data' (coincidencias) 
         * y 'relaciones' (datos vinculados por llaves foráneas).
         */
        const res = await fetch(`/api/estructura/buscar?query=${encodeURIComponent(q)}`);
        const data = await res.json();

        // Manejo de "No resultados"
        if (!data.success || !data.data || data.data.length === 0) {
            contenedor.innerHTML = `
                <div class="search-error-msg">
                    <i class='bx bx-error-circle'></i> No se encontraron registros con el término: <b>${q}</b>
                </div>
            `;
            return;
        }

        // Construcción dinámica del reporte de resultados
        let html = `
            <div class="dashboard-card search-results-header-card animate-fade-in">
                <div class="card-header">
                    <h2><i class='bx bx-search-alt'></i> Resultados para: ${q}</h2>
                </div>
            </div>
        `;

        /**
         * BLOQUE 1: COINCIDENCIAS DIRECTAS
         * Procesa cada tabla donde se encontró el término de búsqueda.
         */
        data.data.forEach(grupo => {
            if (!grupo.registros || grupo.registros.length === 0) return;
            const columnas = Object.keys(grupo.registros[0]);

            html += `
                <div class="resultado-tabla card-container">
                    <div class="resultado-tabla-header">
                        <h3><i class='bx bx-table'></i> TABLA: ${grupo.tabla.toUpperCase()}</h3>
                    </div>
        
                    <div class="table-wrapper">
                        <table class="main-table">
                            <thead>
                                <tr>${columnas.map(c => `<th>${c.toUpperCase()}</th>`).join("")}</tr>
                            </thead>
                            <tbody>
                                ${grupo.registros.map(reg => `
                                    <tr>${columnas.map(c => `<td>${reg[c] ?? "—"}</td>`).join("")}</tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });

        /**
         * BLOQUE 2: INFORMACIÓN RELACIONADA (INTELIGENCIA DE DATOS)
         * Muestra registros en otras tablas que apuntan a los resultados encontrados.
         * Muy útil para ver, por ejemplo, qué equipos pertenecen a un usuario buscado.
         */
        if (data.relaciones && data.relaciones.length > 0) {
            html += `
                <div class="relations-section">
                    <h2 class="relations-title"><i class='bx bx-link'></i> Datos Vinculados Detectados</h2>
            `;

            data.relaciones.forEach(rel => {
                if (!rel.registros || rel.registros.length === 0) return;
                const columnasRel = Object.keys(rel.registros[0]);

                html += `
                    <div class="resultado-tabla-relacion">
                        <div class="rel-info-header">
                            <i class='bx bx-subdirectory-right'></i> 
                            <h4>Referencia en: <span>${rel.tablaRelacionada}</span></h4>
                            <small>(Basado en: ${rel.origenTabla} ID: ${rel.origenID})</small>
                        </div>
                        <div class="table-wrapper">
                            <table class="main-table table-sm">
                                <thead>
                                    <tr>
                                        ${columnasRel.map(c => `<th>${c.toUpperCase()}</th>`).join("")}
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rel.registros.map(reg => `
                                        <tr>
                                            ${columnasRel.map(c => `<td>${reg[c] ?? "—"}</td>`).join("")}
                                        </tr>
                                    `).join("")}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        }

        contenedor.innerHTML = html;

    } catch (err) {
        contenedor.innerHTML = `<div class="search-error-msg"><i class='bx bx-bug'></i> Error de procesamiento: ${err.message}</div>`;
        console.error("Critical Search Error:", err);
    }
}

/**
 * Inicialización de disparadores de búsqueda.
 */
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("searchQuery");
    const searchBtn = document.getElementById("btnBuscar");
    
    // Soporte para búsqueda mediante la tecla 'Enter'
    if (searchInput) {
        searchInput.addEventListener("keyup", (e) => { 
            if (e.key === "Enter") ejecutarBuscadorGlobal(); 
        });
    }
    
    // Soporte para clic en icono de lupa
    if (searchBtn) {
        searchBtn.addEventListener("click", ejecutarBuscadorGlobal);
    }
    
    // Llamada al siguiente bloque (Filtros dinámicos)
    if (typeof initDynamicFilters === 'function') initDynamicFilters();
});

/**
 * Inicializa los componentes de filtrado lateral/superior.
 * Esta función escanea el esquema de la base de datos para poblar los selects
 * con datos reales y activa la escucha de cambios (Event Listeners).
 */
async function initDynamicFilters() {
    const filterTabla = document.getElementById('filterTabla');
    const filterConcesionaria = document.getElementById('filterConcesionaria');
    const filterPuesto = document.getElementById('filterPuesto');
    const filterServer = document.getElementById('filterServer');
    const results = document.getElementById('table-container');

    if (!results) return;

    /** Limpia el área de visualización para renderizar los nuevos resultados filtrados */
    const clearResults = () => (results.innerHTML = '');

    /**
     * Componente de renderizado local para filtros.
     * Genera una tarjeta de resultados con una tabla estructurada.
     */
    const renderTable = (tabla, columnas, data) => {
        const block = document.createElement('div');
        block.className = 'resultado-tabla animate-fade-in';

        const thead = columnas.map(c => `<th>${c.toUpperCase()}</th>`).join('');
        const rows = data.map(row =>
            `<tr>${columnas.map(c => `<td>${row[c] ?? '—'}</td>`).join('')}</tr>`
        ).join('');

        block.innerHTML = `
            <div class="resultado-tabla-header" style="background:#002C5F; color:white; padding:10px;">
                <h3><i class='bx bx-filter-alt'></i> VISTA FILTRADA: ${tabla.toUpperCase()}</h3>
            </div>
            <div class="table-wrapper">
                <table class="main-table">
                    <thead><tr>${thead}</tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
        results.appendChild(block);
    };

    try {
        // 1️⃣ SINCRONIZACIÓN DE TABLAS
        // Se obtienen los nombres visibles para el usuario y los técnicos para la lógica
        const resTablas = await fetch('/api/estructura/tablas');
        const dataTablas = await resTablas.json();
        const tablas = dataTablas.map(t => t.nombre_tabla); 

        filterTabla.innerHTML = '<option value="todas">Selecciona una tabla...</option>';
        dataTablas.forEach(t => {
            const o = document.createElement('option');
            o.value = t.nombre_tabla;
            o.textContent = t.nombre_visible;
            filterTabla.appendChild(o);
        });

        // 2️⃣ POBLAMIENTO DINÁMICO DE PUESTOS
        // Escanea todas las tablas que contengan la columna 'puesto' para crear un filtro único
        const puestosSet = new Set();
        for (const tabla of tablas) {
            const resCols = await fetch(`/api/estructura/${tabla}/columnas`);
            const cols = await resCols.json();
            
            if (cols.includes('puesto')) {
                const resData = await fetch(`/api/estructura/${tabla}`);
                const data = await resData.json();
                data.forEach(r => r.puesto && puestosSet.add(r.puesto));
            }
        }

        filterPuesto.innerHTML = '<option value="todos">Todos los puestos</option>';
        puestosSet.forEach(p => {
            const o = document.createElement('option');
            o.value = p; o.textContent = p;
            filterPuesto.appendChild(o);
        });

        /* ==========================================
           CONTROLADORES DE EVENTOS (LISTENERS)
           ========================================== */

        /** Filtro por Tabla Individual */
        filterTabla.addEventListener('change', async () => {
            if (filterTabla.value === "todas") return;
            clearResults();
            const tabla = filterTabla.value;
            const cols = await (await fetch(`/api/estructura/${tabla}/columnas`)).json();
            const data = await (await fetch(`/api/estructura/${tabla}`)).json();
            renderTable(tabla, cols, data);
        });

        /** Filtro por Concesionaria (Multi-tabla) */
        filterConcesionaria.addEventListener('change', async () => {
            if (filterConcesionaria.value === "todas") return;
            clearResults();
            for (const tabla of tablas) {
                const cols = await (await fetch(`/api/estructura/${tabla}/columnas`)).json();
                // Solo actúa sobre tablas que poseen la columna de segmentación
                if (cols.includes('concesionaria')) {
                    const data = await (await fetch(`/api/estructura/${tabla}`)).json();
                    const filtrado = data.filter(r => r.concesionaria === filterConcesionaria.value);
                    if (filtrado.length) renderTable(tabla, cols, filtrado);
                }
            }
        });

        /** Filtro por Puesto (Multi-tabla) */
        filterPuesto.addEventListener('change', async () => {
            if (filterPuesto.value === "todos") return;
            clearResults();
            for (const tabla of tablas) {
                const cols = await (await fetch(`/api/estructura/${tabla}/columnas`)).json();
                if (cols.includes('puesto')) {
                    const data = await (await fetch(`/api/estructura/${tabla}`)).json();
                    const filtrado = data.filter(r => r.puesto === filterPuesto.value);
                    if (filtrado.length) renderTable(tabla, cols, filtrado);
                }
            }
        });

        /** Filtro por Servidor (Búsqueda por palabra clave en columnas de sistema) */
        filterServer.addEventListener('change', async () => {
            if (filterServer.value === "todos") return;
            clearResults();
            const servers = { '1': 'TotalDealer', '2': 'SealsForce' }; 
            const target = servers[filterServer.value];

            for (const tabla of tablas) {
                const cols = await (await fetch(`/api/estructura/${tabla}/columnas`)).json();
                // Busca columnas que mencionen 'server' o 'servidor' dinámicamente
                const sCols = cols.filter(c => c.toLowerCase().includes('server') || c.toLowerCase().includes('servidor'));
                if (sCols.length) {
                    const data = await (await fetch(`/api/estructura/${tabla}`)).json();
                    const filtrado = data.filter(r => sCols.some(c => (r[c]||'').toString().includes(target)));
                    if (filtrado.length) renderTable(tabla, cols, filtrado);
                }
            }
        });

    } catch (error) {
        console.error("Error crítico en inicialización de filtros:", error);
    }
}