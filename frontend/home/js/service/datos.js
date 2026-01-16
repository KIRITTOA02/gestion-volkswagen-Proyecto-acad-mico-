/**
 * DATOS.JS - Gestión de Registros (Filas de la base de datos)
 * Ubicación: frontend/home/js/service/datos.js
 */

/* ==========================================
   6. GESTIÓN DEL MODAL: AGREGAR REGISTRO
   ========================================== */

/**
 * Sistema de Formulario Inteligente para Inserción de Datos.
 */
function setupAddDataModal() {
    const modal = document.getElementById('add-data-modal');
    const form = document.getElementById('add-data-form');
    const addDataLink = document.getElementById('add-data-link');
    const tableSelect = document.getElementById('dataTableSelect');
    const container = document.getElementById('dataInputsContainer');

    if (!modal || !addDataLink) return;

    /**
     * Motor de Generación de Inputs: Mapea columnas SQL a elementos HTML
     */
    async function loadTableInputs(tableName) {
        if (!tableName || !container) return;
        container.innerHTML = '<p style="text-align:center;">Analizando estructura de tabla...</p>';

        try {
            const res = await fetch(`/api/estructura/${tableName}/columnas`);
            const columns = await res.json();
            container.innerHTML = '';

            for (const col of columns) {
                // EXCLUSIÓN: No mostrar campos ID autoincrementables ni de auditoría
                if (col.toLowerCase() === `id_${tableName.toLowerCase()}` || col.toLowerCase() === 'id_cread') continue;

                const formGroup = document.createElement('div');
                formGroup.className = 'form-group';
                
                const label = document.createElement('label');
                label.innerText = col.toUpperCase().replace(/_/g, ' ');
                formGroup.appendChild(label);

                // LÓGICA DE DETECCIÓN DE RELACIONES (FK)
                if (col.startsWith('id_')) {
                    const targetTable = col.replace('id_', '');
                    const selectFK = document.createElement('select');
                    selectFK.name = col;
                    selectFK.id = `input_${col}`;
                    selectFK.innerHTML = `<option value="">Cargando ${targetTable}...</option>`;
                    formGroup.appendChild(selectFK);

                    // Petición de datos a la tabla relacionada
                    fetch(`/api/estructura/datos/${targetTable}`)
                        .then(r => r.json())
                        .then(records => {
                            selectFK.innerHTML = `<option value="">-- Seleccionar ${targetTable} --</option>`;
                            records.forEach(reg => {
                                const regId = reg[`id_${targetTable}`] || reg.id || reg.ID || Object.values(reg)[0];
                                const displayValue = reg.nombre || reg.descripcion || reg.server || `ID: ${regId}`;
                                
                                const option = document.createElement('option');
                                option.value = regId;
                                option.innerText = displayValue;
                                selectFK.appendChild(option);
                            });
                        })
                        .catch(() => { selectFK.innerHTML = `<option value="">Error de carga referencial</option>`; });
                } else {
                    // INPUT ESTÁNDAR
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.name = col;
                    input.placeholder = `Ingresa ${col.toLowerCase()}`;
                    formGroup.appendChild(input);
                }
                container.appendChild(formGroup);
            }
        } catch (err) { 
            container.innerHTML = `<p>Error crítico al recuperar el esquema de la tabla.</p>`; 
        }
    }

    form.onsubmit = async (e) => {
        e.preventDefault();
        const tableName = tableSelect.value;
        const inputs = container.querySelectorAll('input, select');
        const dataToSend = {};

        inputs.forEach(el => {
            const val = el.value.trim();
            if (val === "" || val.toLowerCase() === "null") {
                dataToSend[el.name] = null;
            } 
            else if (el.name.startsWith('id_')) {
                const num = parseInt(val, 10);
                dataToSend[el.name] = isNaN(num) ? null : num;
            } 
            else {
                dataToSend[el.name] = val;
            }
        });

        try {
            const res = await fetch('/api/estructura/agregardato', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tableName, data: dataToSend })
            });
            const result = await res.json();
            if (result.success) {
                alert(`✅ Registro insertado exitosamente en '${tableName}'.`);
                location.reload();
            } else { 
                alert(`❌ Error: ${result.message}`); 
            }
        } catch (err) { 
            alert('❌ Fallo de red: No se pudo completar la inserción.'); 
        }
    };

    addDataLink.addEventListener('click', async (e) => {
        e.preventDefault();
        if (form) form.reset();
        if (container) container.innerHTML = '';
        
        try {
            const res = await fetch('/api/estructura/tablas');
            const data = await res.json();
            const tables = data.map(t => typeof t === 'object' ? t.nombre_tabla : t);
            
            if (tableSelect) {
                tableSelect.innerHTML = tables.map(t => `<option value="${t}">${t}</option>`).join('');
                await loadTableInputs(tableSelect.value);
            }
            modal.classList.add('show-modal');
        } catch (err) {
            console.error("Error al inicializar modal:", err);
        }
    });

    if (tableSelect) {
        tableSelect.onchange = () => loadTableInputs(tableSelect.value);
    }
}

/* ==========================================
   7. GESTIÓN DEL MODAL: EDICIÓN DE DATOS
   ========================================== */

/**
 * Sistema de Edición Avanzada de Registros.
 * Tabla -> Registro -> Campos dinámicos.
 */
function setupEditDataModal() {
    const modal = document.getElementById('edit-data-modal');
    const form = document.getElementById('edit-data-form');
    const editLink = document.getElementById('edit-data-link'); 
    const tableSelect = document.getElementById('editTableSelect');
    const rowSelect = document.getElementById('editRowSelect');
    const container = document.getElementById('editInputsContainer');

    if (!modal || !editLink) return;

    /**
     * NIVEL 1: Apertura e Inicialización de Tablas.
     */
    editLink.addEventListener('click', async (e) => {
        e.preventDefault();
        if (container) container.innerHTML = '';
        if (rowSelect) rowSelect.innerHTML = `<option value="">Seleccione una tabla primero</option>`;

        try {
            const res = await fetch('/api/estructura/tablas');
            const tables = await res.json();
            const names = tables.map(t => typeof t === 'object' ? t.nombre_tabla : t);
            
            if (tableSelect) {
                tableSelect.innerHTML = '<option value="">-- Seleccionar Tabla --</option>' +
                    names.map(t => `<option value="${t}">${t}</option>`).join('');

                if (window.getCurrentActivePageId) {
                    const active = window.getCurrentActivePageId();
                    if (active && active !== 'home') {
                        tableSelect.value = active;
                        tableSelect.dispatchEvent(new Event('change'));
                    }
                }
            }
            modal.classList.add('show-modal'); 
        } catch (err) { 
            console.error("Critical Modal Error:", err); 
        }
    });

    /**
     * NIVEL 2: Carga de Registros de la Tabla seleccionada.
     */
    if (tableSelect) {
        tableSelect.addEventListener('change', async () => {
            const tableName = tableSelect.value;
            if (container) container.innerHTML = '';
            if (rowSelect) rowSelect.innerHTML = `<option value="">Cargando registros...</option>`;

            if (!tableName) return;

            try {
                const res = await fetch(`/api/estructura/${tableName}`);
                const data = await res.json();

                if (!Array.isArray(data) || data.length === 0) {
                    rowSelect.innerHTML = `<option value="">Sin registros disponibles</option>`;
                    return;
                }

                // Identificación de la Clave Primaria (PK)
                const possibleId = Object.keys(data[0]).find(k => 
                    k.toLowerCase() === `id_${tableName.toLowerCase()}` || 
                    k.toLowerCase().startsWith('id_')
                ) || Object.keys(data[0])[0];
                
                rowSelect.dataset.idCol = possibleId;

                rowSelect.innerHTML = '<option value="">-- Seleccione un registro --</option>';
                data.forEach(row => {
                    const label = Object.values(row).slice(1, 4).filter(v => v).join(' - ');
                    const option = document.createElement('option');
                    option.value = row[possibleId];
                    option.innerText = label || `ID: ${row[possibleId]}`;
                    rowSelect.appendChild(option);
                });
            } catch (err) { 
                rowSelect.innerHTML = `<option>Error al recuperar registros</option>`; 
            }
        });
    }

    /**
     * NIVEL 3: Generación del Formulario de Edición con datos precargados.
     */
    if (rowSelect) {
        rowSelect.addEventListener('change', async () => {
            const tableName = tableSelect.value;
            const idValue = rowSelect.value;
            const idColName = rowSelect.dataset.idCol;
            
            if (!tableName || !idValue) {
                if (container) container.innerHTML = '';
                return;
            }

            container.innerHTML = '<p style="text-align:center;">Recuperando datos del registro...</p>';

            try {
                const [colRes, dataRes] = await Promise.all([
                    fetch(`/api/estructura/${tableName}/columnas`),
                    fetch(`/api/estructura/${tableName}`)
                ]);
                
                const cols = await colRes.json();
                const allRows = await dataRes.json();
                const selected = allRows.find(r => String(r[idColName]) === String(idValue));

                container.innerHTML = ''; 

                for (const c of cols) {
                    if (c.toLowerCase() === idColName.toLowerCase()) continue;

                    const fieldDiv = document.createElement('div');
                    fieldDiv.className = 'form-group'; // Usamos form-group para consistencia CSS
                    const label = document.createElement('label');
                    label.innerText = c.toUpperCase().replace(/_/g, ' ');
                    fieldDiv.appendChild(label);

                    if (c.startsWith('id_')) {
                        const targetTable = c.replace('id_', '');
                        const selectFK = document.createElement('select');
                        selectFK.name = c;
                        fieldDiv.appendChild(selectFK);

                        fetch(`/api/estructura/datos/${targetTable}`)
                            .then(r => r.json())
                            .then(records => {
                                selectFK.innerHTML = `<option value="">-- Seleccionar --</option>`;
                                records.forEach(reg => {
                                    const regIdValue = reg[`id_${targetTable}`] || reg.id || Object.values(reg)[0];
                                    const option = document.createElement('option');
                                    option.value = regIdValue;
                                    option.innerText = reg.nombre || reg.descripcion || `ID: ${regIdValue}`;
                                    if (String(regIdValue) === String(selected[c])) option.selected = true;
                                    selectFK.appendChild(option);
                                });
                            });
                    } else {
                        const input = document.createElement('input');
                        input.type = 'text';
                        input.name = c;
                        input.value = selected[c] !== null ? selected[c] : '';
                        fieldDiv.appendChild(input);
                    }
                    container.appendChild(fieldDiv);
                }
            } catch (err) { 
                container.innerHTML = '<p>Fallo al construir el formulario de edición.</p>'; 
            }
        });
    }

    form.onsubmit = async (e) => {
        e.preventDefault();
        const tableName = tableSelect.value;
        const idValue = rowSelect.value;
        const idColumn = rowSelect.dataset.idCol;
        const inputs = container.querySelectorAll('input, select');
        const dataToSend = {};
        
        inputs.forEach(i => {
            let val = i.value.trim();
            if (val === "" || val.toLowerCase() === "null") {
                dataToSend[i.name] = null;
            } else if (i.name.startsWith('id_')) {
                const num = parseInt(val, 10);
                dataToSend[i.name] = isNaN(num) ? null : num;
            } else {
                dataToSend[i.name] = val;
            }
        });

        try {
            const res = await fetch('/api/estructura/editardato', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tableName, idColumn, idValue, data: dataToSend })
            });
            const result = await res.json();
            if (result.success) {
                alert("✅ Registro actualizado correctamente.");
                location.reload(); 
            } else {
                alert("❌ Error: " + result.message);
            }
        } catch (err) {
            alert("❌ Error de comunicación con el servidor.");
        }
    };
}

/* ==========================================
   8. GESTIÓN DEL MODAL: ELIMINAR REGISTRO (FILA)
   ========================================== */

/**
 * Sistema de Eliminación Selectiva con Vista Previa.
 * Permite confirmar visualmente los datos antes del borrado físico.
 */
function setupDeleteRowModal() {
    const modal = document.getElementById('delete-row-modal');
    const form = document.getElementById('delete-row-form');
    const deleteLink = document.getElementById('delete-row-link');
    const tableSelect = document.getElementById('deleteTableSelect');
    const rowSelect = document.getElementById('deleteRowSelect');
    const preview = document.getElementById('rowPreviewContainer');

    if (!modal || !deleteLink) return;

    /**
     * NIVEL 1: Apertura y Limpieza.
     */
    deleteLink.addEventListener('click', async (e) => {
        e.preventDefault();
        
        // Cierre preventivo de menús de navegación si existen
        document.getElementById('dropdown-menu-content')?.classList.remove('active');
        
        if (form) form.reset();
        if (rowSelect) rowSelect.innerHTML = `<option value="">Seleccione una tabla primero</option>`;
        if (preview) preview.innerHTML = `<p>Selecciona un registro para ver los detalles...</p>`;

        try {
            const res = await fetch('/api/estructura/tablas');
            const tables = await res.json();
            const names = tables.map(t => typeof t === 'object' ? t.nombre_tabla : t);
            
            if (tableSelect) {
                tableSelect.innerHTML = '<option value="">-- Seleccionar Tabla --</option>' +
                    names.map(t => `<option value="${t}">${t}</option>`).join('');

                if (typeof window.getCurrentActivePageId === 'function') {
                    const activeTableId = window.getCurrentActivePageId();
                    if (activeTableId && activeTableId !== 'home') {
                        tableSelect.value = activeTableId;
                        tableSelect.dispatchEvent(new Event('change'));
                    }
                }
            }
            modal.classList.add('show-modal');
        } catch (err) {
            if (tableSelect) tableSelect.innerHTML = `<option>Error al cargar tablas</option>`;
        }
    });

    /**
     * NIVEL 2: Carga de Registros y Detección de PK.
     */
    if (tableSelect) {
        tableSelect.addEventListener('change', async () => {
            const tableName = tableSelect.value;
            if (rowSelect) rowSelect.innerHTML = `<option value="">Cargando registros...</option>`;
            if (preview) preview.innerHTML = `<p>Selecciona un registro para ver los detalles...</p>`;

            if (!tableName) return;

            try {
                const res = await fetch(`/api/estructura/${tableName}`);
                const data = await res.json();

                if (!Array.isArray(data) || data.length === 0) {
                    rowSelect.innerHTML = `<option value="">Sin registros</option>`;
                    return;
                }

                const idCol = Object.keys(data[0]).find(k => 
                    k.toLowerCase() === `id_${tableName.toLowerCase()}` || 
                    k.toLowerCase().startsWith('id_')
                ) || Object.keys(data[0])[0];
                
                rowSelect.dataset.idCol = idCol;
                rowSelect.dataset.tableData = JSON.stringify(data);

                rowSelect.innerHTML = '<option value="">-- Seleccione un registro --</option>';
                data.forEach(row => {
                    const label = Object.values(row).slice(1, 4).filter(v => v).join(' - ');
                    const option = document.createElement('option');
                    option.value = row[idCol]; 
                    option.innerText = label || `ID: ${row[idCol]}`;
                    rowSelect.appendChild(option);
                });
            } catch (err) {
                rowSelect.innerHTML = `<option>Error al cargar registros</option>`;
            }
        });
    }

    /**
     * NIVEL 3: Inspector de Registro (Preview Box).
     */
    if (rowSelect) {
        rowSelect.addEventListener('change', () => {
            if (!rowSelect.value || !preview) {
                if (preview) preview.innerHTML = `<p>Selecciona un registro para ver los detalles...</p>`;
                return;
            }

            const data = JSON.parse(rowSelect.dataset.tableData || '[]');
            const idCol = rowSelect.dataset.idCol;
            const selected = data.find(r => String(r[idCol]) === String(rowSelect.value));

            if (selected) {
                const details = Object.entries(selected)
                    .map(([key, val]) => `
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 5px 0;">
                            <strong style="color: #002C5F; font-size: 11px;">${key.toUpperCase()}:</strong> 
                            <span style="font-size: 11px; color: #555;">${val ?? '-'}</span>
                        </div>`)
                    .join('');
                
                preview.innerHTML = `
                    <h4 style="margin-bottom: 10px; font-size: 13px; color: #d32f2f;">⚠️ Verifique los datos antes de borrar:</h4>
                    <div class="preview-box" style="background: #fff4f4; padding: 12px; border-radius: 8px; border: 1px solid #ffcdd2;">
                        ${details}
                    </div>`;
            }
        });
    }

    /**
     * PERSISTENCIA: Ejecución del Borrado (DELETE).
     */
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const tableName = tableSelect.value;
        const idColumn = rowSelect.dataset.idCol;
        const rawIdValue = rowSelect.value;

        if (!tableName || !rawIdValue) {
            alert("⚠️ Error: Debe seleccionar un registro válido.");
            return;
        }

        if (!confirm(`⚠️ ¡ALERTA CRÍTICA!\n\n¿Seguro que deseas eliminar definitivamente este registro de "${tableName.toUpperCase()}"?`)) return;

        const idValue = parseInt(rawIdValue, 10);

        try {
            const res = await fetch('/api/estructura/eliminarfila', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    tableName, 
                    idColumn, 
                    idValue: isNaN(idValue) ? rawIdValue : idValue 
                })
            });

            const result = await res.json();
            if (result.success) {
                alert(`✅ Registro eliminado con éxito.`);
                location.reload();
            } else {
                alert('❌ Error de Base de Datos: ' + result.message);
            }
        } catch (err) {
            console.error("Critical Deletion Error:", err);
            alert('❌ Error de conexión al servidor.');
        }
    });
}