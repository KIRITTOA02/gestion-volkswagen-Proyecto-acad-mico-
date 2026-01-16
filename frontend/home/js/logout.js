/**
 * LOGOUT.JS - CONTROL DE CIERRE DE SESIÓN
 * Implementa una salida segura del sistema mediante un modal de confirmación,
 * permitiendo limpiar el estado de la aplicación antes de la redirección.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. SELECTORES DE ELEMENTOS
  const logoutBtn = document.getElementById('logout-btn');
  const modal = document.getElementById('modalLogout');
  const confirmBtn = document.getElementById('confirmarSalir');
  const cancelBtn = document.getElementById('cancelarLogout');

  /**
   * Validación de presencia: Evita la ejecución de listeners si el botón 
   * no está presente en el DOM actual (por ejemplo, en páginas públicas).
   */
  if (!logoutBtn) {
    console.warn('Estado: El disparador de logout no está presente en esta vista.');
    return;
  }

  /**
   * Apertura del Modal:
   * Cambia el estado visual del contenedor a 'flex' para centrar el modal 
   * sobre la interfaz del Dashboard.
   */
  logoutBtn.addEventListener('click', () => {
    if (modal) modal.style.display = 'flex';
  });

  /**
   * Cancelación:
   * Simplemente oculta el modal sin realizar ninguna acción sobre la sesión.
   */
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
    });
  }

  /**
   * Confirmación de Salida:
   * Procesa la limpieza de credenciales y redirige al punto de acceso (Login).
   */
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';

      /**
       * NOTA DE SEGURIDAD: 
       * Aquí es el lugar ideal para ejecutar:
       * - localStorage.clear();
       * - sessionStorage.removeItem('token');
       */
      console.log("Cerrando sesión de usuario y destruyendo tokens locales...");
      
      // Redirección al Home / Login
      window.location.href = '/'; 
    });
  }

  /**
   * Control de Cierre Externo (Backdrop):
   * Permite cerrar la ventana si el usuario hace clic en el área oscura 
   * fuera del cuadro de diálogo.
   */
  if (modal) {
    modal.addEventListener('click', (e) => {
      // Solo cierra si el clic fue en el overlay, no en el contenido del modal
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  }
});