/**
 * EXCEL.JS - MÓDULO DE IMPORTACIÓN DE DATOS
 * Proporciona una interfaz interactiva de arrastrar y soltar (Drag & Drop)
 * para cargar archivos .xlsx y .xls, automatizando la creación de esquemas.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. SELECTORES DE ELEMENTOS (UI)
    const importModal = document.getElementById('import-excel-modal');
    const btnAbrir = document.getElementById('importExcelButton');
    const btnCancelar = document.getElementById('cancelImportBtn');
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('excelFileInput');

    // Registro de estado para depuración en desarrollo
    console.log("=== Debug Excel Modal ===");
    console.log("Controlador de apertura:", btnAbrir ? "Cargado" : "No encontrado");

    /**
     * Muestra el modal de importación aplicando estilos de visibilidad forzada
     * para asegurar la superposición correcta sobre otros elementos del Dashboard.
     */
    const abrirModal = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation(); // Evita que el evento burbujee a otros menús
        }
        console.log("Acción: Desplegando interfaz de importación...");
        importModal.classList.add('active');
        importModal.style.setProperty('display', 'flex', 'important');
    };

    /**
     * Cierra el modal y restablece el estado de los inputs para permitir
     * nuevas cargas sin residuos de la sesión anterior.
     */
    const cerrarModal = () => {
        importModal.classList.remove('active');
        importModal.style.setProperty('display', 'none', 'important');
        fileInput.value = ''; // Limpieza de buffer de archivos
        resetDropArea();
    };

    /**
     * Restablece la zona de arrastre a su estado visual original (instrucciones y icono).
     */
    const resetDropArea = () => {
        dropArea.innerHTML = `
            <i class="bx bx-cloud-upload" style="font-size: 48px;"></i>
            <p>Arrastra tu archivo Excel aquí o haz clic para seleccionarlo</p>
        `;
    };

    // --- REGISTRO DE EVENTOS DE CONTROL ---
    if (btnAbrir) btnAbrir.addEventListener('click', abrirModal);
    if (btnCancelar) btnCancelar.addEventListener('click', cerrarModal);

    // Cierre reactivo al hacer clic en el backdrop (fondo oscuro)
    importModal.addEventListener('click', (e) => {
        if (e.target === importModal) cerrarModal();
    });

    /**
     * 4. GESTIÓN DE ARRASTRE Y SELECCIÓN (DRAG & DROP)
     * Implementa la lógica necesaria para que el área actúe como un receptor de archivos.
     */
    if (dropArea && fileInput) {
        // Disparador del explorador de archivos nativo al hacer clic en el área
        dropArea.addEventListener('click', () => fileInput.click());

        // Neutralización de comportamientos por defecto (Evita que el navegador abra el Excel)
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        // Feedback Visual: Iluminación de la zona al sobrevolar con un archivo
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => dropArea.classList.add('dragover'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => dropArea.classList.remove('dragover'), false);
        });

        // Captura de archivos soltados directamente en la zona
        dropArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                console.log("Archivo detectado vía DROP:", files[0].name);
                procesarArchivo(files[0]);
            }
        });

        // Captura de archivos seleccionados mediante el explorador de archivos
        fileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                console.log("Archivo detectado vía INPUT:", this.files[0].name);
                procesarArchivo(this.files[0]);
            }
        });
    }

    /**
     * 5. PROCESAMIENTO Y ENVÍO AL BACKEND
     * Valida el formato del archivo y utiliza FormData para el transporte
     * binario hacia el servidor.
     */
    async function procesarArchivo(file) {
        // Validación de Integridad: Solo formatos compatibles con bibliotecas de Excel (XLSX/XLS)
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext !== 'xlsx' && ext !== 'xls') {
            alert("⚠️ Formato inválido: Por favor sube solo documentos de Excel (.xlsx o .xls)");
            return;
        }

        // Construcción del paquete de datos multipart/form-data
        const formData = new FormData();
        formData.append('file', file); // El campo 'file' debe coincidir con el middleware Multer en el backend

        // Feedback de Usuario: Estado de carga (Loader animado)
        dropArea.innerHTML = `
            <i class="bx bx-loader-alt bx-spin" style="font-size: 48px; color: #00b1eb;"></i>
            <p>Sincronizando y procesando <strong>${file.name}</strong>...</p>
        `;

        try {
            /**
             * Comunicación con el servicio de importación.
             * Nota: La URL incluye el prefijo de ruta '/api/estructura' definido en app.js.
             */
            const response = await fetch('http://localhost:3000/api/estructura/importarexcel', {
                method: 'POST',
                body: formData // Los archivos no se envían como JSON, se envían como body de FormData
            });

            const result = await response.json();

            if (result.success) {
                alert("✅ Sincronización exitosa: " + result.message);
                cerrarModal();
                // Recarga forzada para reconstruir el Navbar dinámico con la nueva tabla creada
                window.location.reload();
            } else {
                alert("❌ Error de procesamiento: " + (result.message || "Estructura de Excel no válida"));
                resetDropArea();
            }
        } catch (error) {
            console.error("Fetch Exception:", error);
            alert("❌ Error de conexión: No se pudo contactar con el servicio de importación.");
            resetDropArea();
        }
    }
});