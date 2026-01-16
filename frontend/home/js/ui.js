/**
 * UI.JS - CONTROLADOR DE INTERFAZ DE USUARIO
 * Gestiona el renderizado de tablas dinámicas, el control de visibilidad
 * de módulos y el comportamiento de componentes interactivos (Dropdowns).
 */

/* ==========================================
   1. SELECTORES Y ESTADOS DE VISTA
   ========================================== */
const tableContainer = document.getElementById('table-container');
const homePage = document.getElementById('home-page');

/**
 * Activa el modo de visualización de datos.
 * Oculta el dashboard principal y prepara el escenario para las tablas.
 */
function showTableMode() {
    document.body.classList.add('table-active');
    if (homePage) homePage.style.display = 'none';
}

/**
 * Restablece la interfaz al estado inicial (Home).
 * Limpia el contenedor de tablas para liberar memoria del DOM.
 */
function hideTableMode() {
    document.body.classList.remove('table-active');
    if (homePage) homePage.style.display = 'block';
    if (tableContainer) tableContainer.innerHTML = ''; // Purga de contenido previo
}

/* ==========================================
   2. MOTOR DE RENDERIZADO DINÁMICO
   ========================================== */

/**
 * Construye dinámicamente el cuerpo y cabecera de una tabla HTML.
 * @param {string} tableId - ID del elemento destino.
 * @param {Array} data - Colección de objetos desde la BD.
 */
function renderTable(tableId, data) {
    const table = document.getElementById(tableId);
    if (!table) return;

    // Estado vacío: Feedback visual si no hay registros
    if (!data || data.length === 0) {
        table.innerHTML = '<tr><td style="text-align:center; padding:20px;">No se encontraron registros en esta tabla.</td></tr>';
        return;
    }

    // Extracción de metadatos (Nombres de columnas)
    const headers = Object.keys(data[0]);
    let html = '<thead><tr>';
    headers.forEach(h => html += `<th>${h.toUpperCase()}</th>`);
    html += '</tr></thead><tbody>';

    // Construcción de filas y normalización de valores
    data.forEach(row => {
        html += '<tr>';
        headers.forEach(h => {
            let value = row[h];

            /**
             * TRATAMIENTO DE RELACIONES (FK):
             * Si el valor es un objeto, asumimos que es una relación JOIN del backend
             * y extraemos el ID representativo.
             */
            if (value && typeof value === 'object' && value.id) {
                value = value.id;
            }

            html += `<td>${value ?? '—'}</td>`;
        });
        html += '</tr>';
    });

    table.innerHTML = html + '</tbody>';
}

/**
 * Crea la estructura (Card) que envuelve a la tabla.
 * Incluye cabecera con título dinámico y botón de cierre.
 */
function loadModule(tableName, data) {
    tableContainer.innerHTML = ''; // Limpiar buffer visual
    showTableMode();

    const section = document.createElement('section');
    section.className = 'dashboard-card animate-fade-in';
    section.innerHTML = `
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; padding:20px">
            <h2><i class='bx bx-list-ul'></i> Gestión de ${tableName.toUpperCase()}</h2>
            <button class="btn-close-table" title="Cerrar vista" style="font-size:28px; background:none; border:none; cursor:pointer; color: #666;">
                <i class="bx bx-x"></i>
            </button>
        </div>
        <div class="table-container" style="padding:20px; overflow:auto">
            <table id="tabla-${tableName}" class="user-table"></table>
        </div>
    `;

    // Vincula el botón de cierre a la función de reset de vista
    section.querySelector('.btn-close-table').addEventListener('click', hideTableMode);
    tableContainer.appendChild(section);
    
    // Ejecuta el renderizado de los datos dentro de la estructura creada
    renderTable(`tabla-${tableName}`, data);
}

/* ==========================================
   3. COMPONENTES INTERACTIVOS (DROPDOWN)
   ========================================== */

/**
 * Configura el comportamiento del menú de acciones rápidas.
 * Implementa cierre automático y prevención de propagación.
 */
function setupDropdown() {
    const toggleBtn = document.getElementById('dropdown-toggle');
    const menuContent = document.getElementById('dropdown-menu-content');

    if (toggleBtn && menuContent) {
        // Toggle de visibilidad (Abre/Cierra)
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menuContent.classList.toggle('show');
        });

        // Cierre al seleccionar una acción
        menuContent.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                menuContent.classList.remove('show');
                console.log(`Ejecutando comando: ${item.id}`);
            });
        });

        // Cierre por clic externo (Fuera del menú)
        document.addEventListener('click', (e) => {
            if (!toggleBtn.contains(e.target) && !menuContent.contains(e.target)) {
                menuContent.classList.remove('show');
            }
        });
    }
}

/* ==========================================
   4. INICIALIZACIÓN DE UI
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    setupDropdown();

    /**
     * Gestión del Panel de Control Lateral (Responsive/Nav)
     * Controla la expansión y contracción del panel principal de herramientas.
     */
    const controlBtn = document.querySelector('[data-page="home"]');
    const panel = document.getElementById('control-panel-content');

    if (controlBtn && panel) {
        controlBtn.addEventListener('click', e => {
            e.preventDefault();
            panel.classList.toggle('hidden-panel');
            controlBtn.classList.toggle('active-nav');
            document.body.classList.toggle('panel-active');
        });
    }
});