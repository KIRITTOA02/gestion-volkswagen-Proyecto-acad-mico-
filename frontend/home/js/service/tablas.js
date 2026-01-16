/**
 * TABLAS.JS - Gestión de Estructuras (Tablas)
 * Ubicación: frontend/home/js/service/tablas.js
 */

/* ==========================================
   2. GESTIÓN DEL MODAL: CREACIÓN DE TABLAS
   ========================================== */

/**
 * Inicializa los eventos y la lógica para el Modal de Creación de Tablas.
 */
function setupTableCreationModal() {
    const modal = document.getElementById('create-table-modal');
    const form = document.getElementById('create-table-form');
    const openBtn = document.getElementById('create-table-link');

    if (!modal || !form) return;

    if (openBtn) {
        openBtn.onclick = (e) => {
            e.preventDefault();
            // Limpieza de contenedores dinámicos
            document.getElementById('columns-container').innerHTML = '';
            document.getElementById('foreignkey-container').innerHTML = '';
            
            // Inicialización con un campo de columna obligatorio (función en columnas.js)
            if (typeof addColumnField === "function") {
                addColumnField();
            }
            modal.classList.add('show-modal');
        };
    }

    // Asignación de delegados para botones de expansión
    const addColBtn = document.getElementById('add-column-btn');
    const addFkBtn = document.getElementById('add-foreignkey-btn');

    if (addColBtn) addColBtn.onclick = addColumnField;
    if (addFkBtn) addFkBtn.onclick = addForeignKeyField;

    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const tableName = document.getElementById('tableName').value.toLowerCase().trim();

        // Mapeo de columnas dinámicas
        const columns = Array.from(form.querySelectorAll('.column-group')).map(div => ({
            name: div.querySelector('input[name="columnName"]').value,
            type: div.querySelector('select[name="columnType"]').value
        }));

        // Mapeo de Foreign Keys
        const foreignKeys = Array.from(form.querySelectorAll('.fk-group')).map(div => ({
            column: div.querySelector('input[name="fkLocalColumn"]').value,
            referencesTable: div.querySelector('.fk-table-select').value,
            referencesColumn: div.querySelector('.fk-ref-col-select').value
        }));

        try {
            const res = await fetch('/api/estructura/creartabla', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tableName, columns, foreignKeys })
            });

            const result = await res.json();

            if (result.success) {
                alert("✅ Tabla creada exitosamente en el esquema.");
                location.reload();
            } else {
                alert("❌ Error al procesar el esquema: " + result.message);
            }
        } catch (error) {
            console.error("Critical Connection Error:", error);
            alert("❌ Fallo en la comunicación con el servidor.");
        }
    };
}

/* ==========================================
   3. GESTIÓN DEL MODAL: ELIMINACIÓN DE TABLAS
   ========================================== */

/**
 * Inicializa la lógica para el borrado definitivo de tablas (DROP TABLE).
 */
function setupTableDeletionModal() {
    const modal = document.getElementById('delete-table-modal');
    const form = document.getElementById('delete-table-form');
    const openBtn = document.getElementById('delete-table-link');

    if (!modal || !openBtn) return;

    openBtn.onclick = (e) => {
        e.preventDefault();
        if (form) form.reset();
        modal.classList.add('show-modal');
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const tableName = document.getElementById('deleteTableName').value.toLowerCase().trim();

        if (!confirm(`¿Seguro que deseas eliminar '${tableName}'? Se borrarán de forma irreversible todos los datos.`)) {
            return;
        }

        try {
            const res = await fetch('/api/estructura/eliminartabla', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tableName })
            });
            
            const result = await res.json();

            if (result.success) {
                alert(`✅ Operación exitosa: Tabla '${tableName}' eliminada.`);
                location.reload(); 
            } else {
                alert(`❌ Error del sistema: ${result.message}`);
            }
        } catch (error) {
            console.error("Fetch Deletion Error:", error);
            alert('❌ Error de conexión al intentar procesar la baja de la tabla.');
        }
    };
}