/**
 * MÓDULO DE INTERFAZ DE USUARIO (UI) - AUTH
 * Gestiona comportamientos visuales como la visibilidad de contraseñas
 * y la interacción con ventanas modales de información.
 */

/**
 * Alterna la visibilidad del campo de contraseña.
 * Cambia el tipo de input entre 'password' y 'text' y actualiza el icono.
 */
export function togglePassword() {
    const passwordInput = document.getElementById('contrasena');
    const toggleIcon = document.querySelector('.mostrar-btn i');
    
    if (passwordInput.type === 'password') {
        // Mostrar contraseña
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        // Ocultar contraseña
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

// Se asigna al objeto global 'window' para que el atributo 'onclick' del HTML pueda encontrarla.
window.togglePassword = togglePassword;

/**
 * Inicializa los eventos de la interfaz de usuario.
 * Maneja la apertura y cierre del modal de información.
 */
export function initUI() {
    const infoBtn = document.getElementById('info-btn');
    const infoModal = document.getElementById('info-modal');
    const closeModal = document.getElementById('close-modal');

    // APERTURA DEL MODAL
    if (infoBtn && infoModal) {
        infoBtn.onclick = (e) => {
            e.preventDefault(); // Evita el salto de página del enlace <a>
            infoModal.style.display = 'flex'; // Usamos flex para centrar el contenido
        };
    }

    // CIERRE DEL MODAL (Botón X)
    if (closeModal) {
        closeModal.onclick = () => {
            infoModal.style.display = 'none';
        };
    }

    // CIERRE AL HACER CLIC FUERA DEL CONTENIDO
    // Si el usuario hace clic en el fondo oscuro, el modal se cierra.
    window.onclick = (event) => {
        if (event.target == infoModal) {
            infoModal.style.display = 'none';
        }
    };
}