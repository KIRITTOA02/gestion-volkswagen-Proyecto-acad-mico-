/**
 * LÓGICA DE AUTENTICACIÓN
 * Este módulo gestiona el envío de credenciales al servidor y la respuesta del sistema.
 */

export function initLoginLogic() {
    const loginForm = document.getElementById('loginForm');
    
    // Referencias a los elementos del DOM para manipular estilos de error
    const emailGroup = document.getElementById('email-group');
    const passwordGroup = document.getElementById('password-group');
    const emailError = emailGroup?.querySelector('.error-message');

    // Validación preventiva: Si el formulario no existe en la página, no ejecutar nada
    if (!loginForm) return;

    /**
     * EVENTO SUBMIT
     * Escucha cuando el usuario hace clic en "Entrar"
     */
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evita que la página se recargue automáticamente

        // 1. LIMPIEZA VISUAL
        // Removemos clases de error de intentos anteriores antes de validar de nuevo
        emailGroup?.classList.remove('error');
        passwordGroup?.classList.remove('error');

        // Captura de valores ingresados por el usuario
        const correo = document.getElementById('correo').value;
        const contrasena = document.getElementById('contrasena').value;

        try {
            // 2. PETICIÓN AL BACKEND
            // Usamos Fetch con async/await para una comunicación asíncrona y limpia
            const response = await fetch('/api/estructura/login', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Enviamos los datos en formato JSON coincidiendo con el controlador del backend
                body: JSON.stringify({ 
                    correo: correo, 
                    contraseña: contrasena 
                })
            });

            // 3. VALIDACIÓN DE FORMATO DE RESPUESTA
            // Verificamos que el servidor responda realmente un JSON para evitar errores de parseo
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new TypeError("El servidor no devolvió un formato JSON válido");
            }

            const data = await response.json();

            // 4. MANEJO DE RESULTADOS
            if (data.success) {
                // ÉXITO: Usuario autenticado correctamente. Redirigimos al panel principal.
                window.location.href = '/home/home.html'; 
            } else {
                // ERROR DE CREDENCIALES: Activamos los estilos visuales de error en el formulario
                emailGroup?.classList.add('error');
                passwordGroup?.classList.add('error');
                
                // Mostramos el mensaje específico enviado por el backend (ej: "Credenciales inválidas")
                if (emailError) {
                    emailError.textContent = data.message || 'Credenciales incorrectas';
                }
            }
        } catch (error) {
            // 5. CONTROL DE ERRORES DE RED
            // Se ejecuta si el servidor está apagado o hay problemas de conexión
            console.error('Error en la comunicación con la API:', error);
            alert('Error técnico: No se pudo conectar con el servidor. Por favor, asegúrate de que el backend esté activo.');
        }
    });
}