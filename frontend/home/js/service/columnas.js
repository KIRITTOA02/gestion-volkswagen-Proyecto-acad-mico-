/**
 * COLUMNAS.JS - Gestión de campos y esquemas
 * Ubicación: frontend/home/js/service/columnas.js
 */

// Registro global de tablas para evitar consultas redundantes
window.availableTables = [];

/**
 * Inyecta dinámicamente campos de entrada para definir nuevas columnas.
 */
function addColumnField() {
    const container = document.getElementById('columns-container');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'column-group';
    
    div.innerHTML = `
        <input type="text" name="columnName" placeholder="Nombre columna" required>
        <select name="columnType">
            <option value="VARCHAR(255)">Texto (Short Text)</option>
            <option value="INT">Entero (Integer)</option>
            <option value="DATE">Fecha (Date)</option>
            <option value="TEXT">Texto Largo (Long Text)</option>
        </select>
        <button type="button" class="remove-btn" onclick="this.parentElement.remove()">❌</button>
    `;
    container.appendChild(div);
}

/**
 * Gestiona la creación de Llaves Foráneas (Foreign Keys).
 */
async function addForeignKeyField() {
    const fkContainer = document.getElementById('foreignkey-container');

    // Caché de tablas: Si no existen en memoria, se consultan al servidor
    if (!window.availableTables || window.availableTables.length === 0) {
        try {
            const res = await fetch('/api/estructura/tablas');
            const data = await res.json();
            window.availableTables = data.map(t => typeof t === 'object' ? t.nombre_tabla : t);
        } catch (e) { 
            window.availableTables = []; 
        }
    }

    const div = document.createElement('div');
    div.className = 'fk-group';

    const tableOptions = window.availableTables
        .map(t => `<option value="${t}">${t}</option>`).join('');

    div.innerHTML = `
        <div class="fk-box" style="border:1px solid #ddd; padding:10px; margin-top:10px; border-radius:8px; background:#f9f9f9;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <label style="font-weight:bold; color:#004c91;">🔗 Nueva Relación (FK)</label>
                <button type="button" onclick="this.parentElement.parentElement.remove()" style="border:none; background:none; cursor:pointer;">❌</button>
            </div>
            <input type="text" name="fkLocalColumn" placeholder="Columna Local" required style="width:100%; margin:5px 0; padding:5px;">
            <select name="fkTable" class="fk-table-select" required style="width:100%; margin:5px 0; padding:5px;">
                <option value="">-- Seleccionar Tabla Destino --</option>
                ${tableOptions}
            </select>
            <select name="fkReferenceColumn" class="fk-ref-col-select" required style="width:100%; margin:5px 0; padding:5px;">
                <option value="">-- Selecciona una tabla primero --</option>
            </select>
        </div>
    `;
    fkContainer.appendChild(div);

    const tableSelect = div.querySelector('.fk-table-select');
    const refColSelect = div.querySelector('.fk-ref-col-select');

    tableSelect.onchange = async () => {
        if (!tableSelect.value) return;
        
        refColSelect.innerHTML = '<option>Cargando campos...</option>';
        try {
            const res = await fetch(`/api/estructura/${tableSelect.value}/columnas`);
            const cols = await res.json();
            refColSelect.innerHTML = cols.map(c => `<option value="${c}">${c}</option>`).join('');
        } catch (err) {
            refColSelect.innerHTML = '<option>Error al cargar</option>';
        }
    };
}

/* ==========================================
   4. GESTIÓN DEL MODAL: AGREGAR COLUMNA
   ========================================== */

/**
 * Configura la lógica para expandir esquemas existentes (ALTER TABLE ADD).
 */
function setupAddColumnModal() {
    const modal = document.getElementById('add-column-modal');
    const form = document.getElementById('add-column-form');
    const openBtn = document.getElementById('add-column-link');

    const tableSelect = document.getElementById('targetTable');
    const afterSelect = document.getElementById('afterColumn');
    const typeSelect = document.getElementById('newColumnType');
    const fkFields = document.getElementById('fk-fields-container');
    const refTable = document.getElementById('referenceTableSelect');
    const refColumnInput = document.getElementById('referenceColumnInput');

    if (!modal || !openBtn) return;

    if (refTable && refColumnInput) {
        refTable.onchange = () => {
            const selectedTable = refTable.value;
            refColumnInput.value = selectedTable ? `id_${selectedTable}` : '';
        };
    }

    const refreshColumnPositions = async (tableName) => {
        if (!tableName) return;
        afterSelect.innerHTML = '<option value="FIRST">Cargando columnas...</option>';
        try {
            const res = await fetch(`/api/estructura/${tableName}/columnas`);
            const cols = await res.json();

            let options = `<option value="FIRST">Al principio (FIRST)</option>`;
            if (Array.isArray(cols)) {
                cols.forEach(col => {
                    options += `<option value="${col}">Después de "${col}"</option>`;
                });
            }
            afterSelect.innerHTML = options;
        } catch (err) {
            afterSelect.innerHTML = `<option value="FIRST">Al principio (FIRST)</option>`;
        }
    };

    openBtn.onclick = async (e) => {
        e.preventDefault();
        if (form) form.reset();
        if (fkFields) fkFields.style.display = 'none';

        try {
            const res = await fetch('/api/estructura/tablas');
            const data = await res.json();
            const tables = data.map(t => typeof t === 'object' ? t.nombre_tabla : t);

            const optionsHtml = tables.map(t => `<option value="${t}">${t}</option>`).join('');
            if (tableSelect) tableSelect.innerHTML = optionsHtml;
            if (refTable) {
                refTable.innerHTML = `<option value="">Seleccione Tabla Destino</option>` + optionsHtml;
            }

            if (window.getCurrentActivePageId) {
                const active = window.getCurrentActivePageId();
                if (active && active !== 'home' && tableSelect) tableSelect.value = active;
            }

            await refreshColumnPositions(tableSelect.value);
            modal.classList.add('show-modal');
        } catch (err) {
            console.error("Initialization Error:", err);
        }
    };

    if (tableSelect) tableSelect.onchange = () => refreshColumnPositions(tableSelect.value);

    if (typeSelect) {
        typeSelect.onchange = () => {
            if (fkFields) fkFields.style.display = typeSelect.value === 'FK_INT' ? 'block' : 'none';
        };
    }

    form.onsubmit = async (e) => {
        e.preventDefault();
        const typeValue = typeSelect.value;
        const isFK = typeValue === 'FK_INT';

        const payload = {
            tableName: tableSelect.value,
            columnName: document.getElementById('newColumnName').value.trim(),
            columnType: isFK ? 'INT' : typeValue,
            afterColumn: afterSelect.value,
            referenceTable: isFK ? refTable.value : null,
            referenceColumn: isFK ? refColumnInput.value : null
        };

        if (isFK && (!payload.referenceTable || !payload.referenceColumn)) {
            alert("⚠️ Error: Se requiere especificar la tabla y columna de referencia.");
            return;
        }

        try {
            const res = await fetch('/api/estructura/agregarcolumna', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (result.success) {
                alert("✅ Estructura actualizada: Columna añadida correctamente.");
                location.reload();
            } else {
                alert("❌ Error: " + result.message);
            }
        } catch (err) {
            alert("❌ Error de red con el servidor.");
        }
    };
}

/* ==========================================
   5. GESTIÓN DEL MODAL: QUITAR COLUMNA
   ========================================== */

/**
 * Configura la eliminación de campos específicos (ALTER TABLE DROP).
 */
function setupRemoveColumnModal() {
    const modal = document.getElementById('remove-column-modal');
    const form = document.getElementById('remove-column-form');
    const removeLink = document.getElementById('remove-column-link');
    const tableSelect = document.getElementById('removeTableSelect');
    const columnSelect = document.getElementById('removeColumnSelect');

    if (!modal || !removeLink) return;

    async function loadColumnsForTable(tableName) {
        if (!tableName || !columnSelect) return;
        columnSelect.innerHTML = `<option value="">Cargando columnas...</option>`;
        try {
            const res = await fetch(`/api/estructura/${tableName}/columnas`);
            const cols = await res.json();
            if (Array.isArray(cols) && cols.length > 0) {
                columnSelect.innerHTML = cols.map(c => `<option value="${c}">${c}</option>`).join('');
            } else {
                columnSelect.innerHTML = `<option value="">Sin columnas disponibles</option>`;
            }
        } catch (err) {
            columnSelect.innerHTML = `<option value="">Error al cargar</option>`;
        }
    }

    removeLink.addEventListener('click', async (e) => {
        e.preventDefault();
        if (form) form.reset();

        try {
            const res = await fetch('/api/estructura/tablas');
            const data = await res.json();
            const tables = data.map(t => typeof t === 'object' ? t.nombre_tabla : t);

            if (tableSelect) {
                tableSelect.innerHTML = tables.map(t => `<option value="${t}">${t}</option>`).join('');
                if (window.getCurrentActivePageId) {
                    const active = window.getCurrentActivePageId();
                    if (active && active !== 'home') tableSelect.value = active;
                }
                await loadColumnsForTable(tableSelect.value);
            }
            modal.classList.add('show-modal');
        } catch (err) {
            console.error("Error:", err);
        }
    });

    if (tableSelect) {
        tableSelect.addEventListener('change', () => loadColumnsForTable(tableSelect.value));
    }

    form.onsubmit = async (e) => {
        e.preventDefault();
        const tableName = tableSelect.value;
        const columnName = columnSelect.value;

        if (!confirm(`¿Estás seguro de eliminar "${columnName}"? Esta acción es irreversible.`)) {
            return;
        }

        try {
            const res = await fetch('/api/estructura/eliminarcolumna', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tableName, columnName })
            });

            const result = await res.json();
            if (result.success) {
                alert(`✅ Columna "${columnName}" removida.`);
                location.reload();
            } else {
                alert(`❌ Error: ${result.message}`);
            }
        } catch (err) {
            alert('❌ Fallo de comunicación.');
        }
    };
}