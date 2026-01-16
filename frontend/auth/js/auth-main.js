/**
 * ARCHIVO PRINCIPAL DE AUTENTICACIÓN (Entry Point)
 * Este script se encarga de importar e inicializar los módulos de 
 * interfaz de usuario y la lógica de negocio del Login.
 */

import { initUI } from './auth-ui.js';
import { initLoginLogic } from './auth-logic.js';

/**
 * Espera a que el DOM (Document Object Model) esté completamente cargado.
 * Esto asegura que los elementos del HTML ya existan antes de intentar
 * asignarles eventos o funciones.
 */
document.addEventListener('DOMContentLoaded', () => {
    
    // Inicializa comportamientos visuales (modales, ver contraseña, etc.)
    initUI();
    
    // Inicializa la lógica de envío de formularios y comunicación con la API
    initLoginLogic();

    console.log('✅ Módulos de autenticación inicializados correctamente.');
});