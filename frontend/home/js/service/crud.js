

/* ==========================================
   9. INICIALIZADOR GLOBAL Y CONTROL DE UI
   ========================================== */

/**
 * Punto de entrada principal para el módulo CRUD.
 * Ejecuta la configuración de todos los modales y establece los listeners
 * globales para la interacción con la interfaz de usuario.
 */
window.initCRUD = function () {
  // Inicialización secuencial de módulos de gestión de estructura
  setupTableCreationModal();
  setupTableDeletionModal();
  setupAddColumnModal();
  setupRemoveColumnModal();
  
  // Inicialización de módulos de gestión de datos (Registros)
  setupAddDataModal();
  setupEditDataModal();
  setupDeleteRowModal();

  /**
   * Lógica Universal de Cierre:
   * Implementa el comportamiento de los botones "Cancelar" o "Cerrar" (clase .no-btn).
   * Identifica el modal ancestro más cercano para remover la clase de visibilidad.
   */
  document.querySelectorAll('.no-btn').forEach(btn => {
    btn.onclick = (e) => {
      // Busca el contenedor principal del modal (overlay) desde el botón presionado
      const modal = e.target.closest('.modal-overlay');
      if (modal) {
          modal.classList.remove('show-modal');
      }
    };
  });
};
/**
 * CRUD.JS - CONTROLADOR MAESTRO DE MODALES
 * Este archivo centraliza la inicialización de todos los servicios CRUD.
 */

/* ==========================================
   9. INICIALIZADOR GLOBAL Y CONTROL DE UI
   ========================================== */

window.initCRUD = function () {
  console.log("🚀 Inicializando módulos CRUD...");

  // 1. Servicios de Estructura (Tablas y Columnas)
  if (typeof setupTableCreationModal === 'function') setupTableCreationModal();
  if (typeof setupTableDeletionModal === 'function') setupTableDeletionModal();
  if (typeof setupAddColumnModal === 'function') setupAddColumnModal();
  if (typeof setupRemoveColumnModal === 'function') setupRemoveColumnModal();
  
  // 2. Servicios de Datos (Registros)
  if (typeof setupAddDataModal === 'function') setupAddDataModal();
  if (typeof setupEditDataModal === 'function') setupEditDataModal();
  if (typeof setupDeleteRowModal === 'function') setupDeleteRowModal();

  /**
   * Lógica Universal de Cierre:
   * Gestiona el cierre de cualquier modal al presionar "Cancelar" o la "X".
   */
  document.querySelectorAll('.no-btn, .close-modal').forEach(btn => {
    btn.onclick = (e) => {
      const modal = e.target.closest('.modal-overlay') || e.target.closest('.modal');
      if (modal) {
          modal.classList.remove('show-modal');
      }
    };
  });
};
