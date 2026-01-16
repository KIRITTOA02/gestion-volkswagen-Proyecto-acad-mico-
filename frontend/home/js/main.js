/**
 * MAIN.JS - MOTOR DE INTERFAZ DINÁMICA
 * Este archivo gestiona la arquitectura Single Page Application (SPA) del dashboard,
 * controlando la navegación entre el Panel de Control y las tablas dinámicas.
 */

/* ==========================================
   1. UTILIDADES DE FORMATO Y ESTADO
   ========================================== */

/** Alterna clases en el body para ajustar el fondo y layout cuando hay tablas activas */
function showTableMode() { document.body.classList.add('table-active'); }
function hideTableMode() { document.body.classList.remove('table-active'); }

/**
 * Normaliza nombres técnicos de SQL a formato legible.
 * Ejemplo: 'id_usuario_red' -> 'ID Usuario Red'
 */
function formatColumnName(key) {
  if (key.startsWith('id_')) key = 'ID ' + key.substring(3);
  return key.replace(/_/g, ' ').replace(/(^|\s)\S/g, l => l.toUpperCase());
}

/**
 * Identifica qué módulo o tabla está visualizando el usuario actualmente.
 * Crucial para que el CRUD sepa dónde aplicar los cambios de edición/borrado.
 */
window.getCurrentActivePageId = function() {
  const activeItem = document.querySelector('.menu-item.active');
  return activeItem ? activeItem.dataset.page : null;
};

/* ==========================================
   2. GESTIÓN DEL MENÚ DINÁMICO
   ========================================== */

/**
 * Genera e inyecta un nuevo ítem en la barra de navegación horizontal.
 * Asigna iconos específicos según la categoría de la tabla.
 */
window.reloadNavbarMenu = function(pageId, displayName = null) {
  const navMenu = document.getElementById('dynamic-menu-list');
  if (!navMenu || navMenu.querySelector(`[data-page="${pageId}"]`)) return;

  // Mapeo semántico de iconos basado en el nombre de la tabla
  let iconClass = 'bx bx-data'; 
  switch (pageId) {
    case 'usuarios':   iconClass = 'bx bx-user-circle'; break;
    case 'equipo':     iconClass = 'bx bx-desktop'; break;
    case 'impresoras': iconClass = 'bx bx-printer'; break;
    case 'refacciones': iconClass = 'bx bx-wrench'; break;
    case 'seminuevos':  iconClass = 'bx bx-car'; break;
  }

  const li = document.createElement('li');
  li.innerHTML = `
    <a href="#" class="menu-item" data-page="${pageId}">
      <i class="${iconClass}"></i>
      <span>${displayName || formatColumnName(pageId)}</span>
    </a>
  `;
  navMenu.appendChild(li);
}

/**
 * Sincroniza el menú con la base de datos real.
 * Descarga el listado de tablas existentes y reconstruye la navegación.
 */
async function loadPersistentTables() {
    try {
        const res = await fetch('/api/estructura/tablas');
        const rawTables = await res.json();
        
        rawTables.forEach(tableObj => {
            const pageId = (typeof tableObj === 'object' ? tableObj.nombre_tabla : tableObj)?.toLowerCase();
            if (!pageId || pageId === 'login') return;
            
            const displayName = tableObj.nombre_visible || formatColumnName(pageId);
            reloadNavbarMenu(pageId, displayName);
        });
        attachMenuListeners();
    } catch (err) { console.error("Error en sincronización de menú:", err); }
}

/* ==========================================
   3. CONTROLADOR DE EVENTOS (ROUTING)
   ========================================== */

/**
 * Gestiona los clics en el menú mediante Delegación de Eventos.
 * Decide si mostrar el Panel de Inicio o renderizar una tabla de datos.
 */
window.attachMenuListeners = function() {
  const navMenu = document.getElementById('dynamic-menu-list');
  const controlWrapper = document.querySelector('.control-button-wrapper');

  const handleMenuClick = (e) => {
    const item = e.target.closest('.menu-item');
    if (!item) return;

    e.preventDefault();
    const pageId = item.dataset.page;
    const container = document.getElementById('table-container');
    const homePage = document.getElementById('home-page');
    const wasActive = item.classList.contains('active');

    // Reset visual de selección
    document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));

    // LÓGICA DE INTERCAMBIO DE VISTAS (Home vs Table)
    if (pageId === 'home' || wasActive) {
      const homeBtn = document.querySelector('.menu-item[data-page="home"]');
      if (homeBtn) homeBtn.classList.add('active');
      hideTableMode();
      if (homePage) homePage.classList.add('active');
      if (container) container.innerHTML = '';
    } 
    else {
      item.classList.add('active');
      showTableMode();
      if (homePage) homePage.classList.remove('active');

      if (container) {
        // Inyección de estructura base para la tabla
        container.innerHTML = `
          <div class="dashboard-card animate-fade-in">
            <div class="card-header">
              <h2>Gestión de ${formatColumnName(pageId)}</h2>
            </div>
            <div class="table-container">
              <table class="user-table" id="table-${pageId}">
                <thead><tr><th colspan="10">Cargando datos...</th></tr></thead>
                <tbody></tbody>
              </table>
            </div>
          </div>`;
        loadDynamicTable(pageId, `table-${pageId}`);
      }
    }
  };

  if (navMenu) navMenu.onclick = handleMenuClick;
  if (controlWrapper) controlWrapper.onclick = handleMenuClick;
};

/* ==========================================
   4. RENDERIZADO DINÁMICO DE DATOS
   ========================================== */

/**
 * Motor de Renderizado: Construye una tabla HTML completa a partir de SQL.
 * Descarga columnas y datos en paralelo para generar el THEAD y TBODY.
 */
window.loadDynamicTable = async function(tableName, tableId) {
  const targetId = tableId || `table-${tableName}`;
  const table = document.getElementById(targetId);
  if (!table) return;

  const tbody = table.querySelector('tbody');
  if (!tbody) return;

  try {
    const [colRes, dataRes] = await Promise.all([
        fetch(`/api/estructura/${tableName}/columnas`),
        fetch(`/api/estructura/${tableName}`)
    ]);

    const columns = await colRes.json();
    const data = await dataRes.json();

    // Renderizado de cabeceras
    const theadTr = table.querySelector('thead tr');
    theadTr.innerHTML = columns.map(col => `<th>${formatColumnName(col)}</th>`).join('');

    // Renderizado de filas
    tbody.innerHTML = '';
    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${columns.length}" class="no-data">No hay registros disponibles</td></tr>`;
      return;
    }

    data.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = columns.map(col => `<td>${row[col] ?? '—'}</td>`).join('');
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(`Error crítico en tabla ${tableName}:`, err);
  }
}

/* ==========================================
   5. INICIALIZACIÓN AL CARGAR DOM
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Reconstruir navegación basada en DB
    loadPersistentTables();

    // 2. Establecer estado inicial (Home)
    const homeBtn = document.querySelector('[data-page="home"]');
    const homePage = document.getElementById('home-page');

    if (homePage?.classList.contains('active')) {
        if (homeBtn) homeBtn.classList.add('active');
        hideTableMode();
    }

    // 3. Vincular lógica CRUD (Importante el orden de carga)
    if (typeof initCRUD === 'function') initCRUD();

    // 4. LÓGICA DE UI: Menú de acciones rápidas (Tres puntos)
    const toggleBtn = document.getElementById('dropdown-toggle');
    const quickMenu = document.querySelector('.quick-actions-menu');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            this.classList.toggle('active'); // Activa rotación CSS
            if (quickMenu) quickMenu.classList.toggle('show');
        });
    }

    // Cierre global al hacer clic fuera de menús activos
    document.addEventListener('click', () => {
        if (toggleBtn) toggleBtn.classList.remove('active');
        if (quickMenu) quickMenu.classList.remove('show');
    });
});