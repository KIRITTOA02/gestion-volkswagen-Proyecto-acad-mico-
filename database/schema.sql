/*
 * ESQUEMA DE BASE DE DATOS - GESTIÓN VOLKSWAGEN
 * Versión: 1.0
 * Descripción: Creación de la estructura base y relaciones de integridad.
 */

-- Creación de la base de datos con soporte para caracteres especiales (ñ, acentos)
CREATE DATABASE IF NOT EXISTS Gestion_VolksWagen
  CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

USE Gestion_VolksWagen;

-- -----------------------------------------------------
-- 1. Tabla: Administradores
-- Almacena credenciales de acceso al sistema. 
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Administradores (
    id_admin INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    correo VARCHAR(100) UNIQUE NOT NULL,
    contraseña VARCHAR(255) NOT NULL 
) ENGINE=InnoDB;

/* ⚠️ NOTA IMPORTANTE: 
  Para que la tabla 'Usuarios' pueda referenciar a 'Estructuras',
  la tabla 'Estructuras' debe crearse antes. 
  Si no la tienes definida aquí, SQL te dará error de FK.
*/

-- -----------------------------------------------------
-- 2. Tabla: Usuarios
-- Representa a las personas asignadas a equipos o concesionarias.
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Usuarios (
    id_usuario INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    puesto VARCHAR(50),
    telefono VARCHAR(20),
    correo VARCHAR(100) UNIQUE,
    concesionaria VARCHAR(100)
    -- id_estructura INT UNSIGNED,  <- Comentado si aún no creas la tabla Estructuras
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 3. Tabla: Equipo
-- Inventario de hardware técnico asignado a cada usuario.
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Equipo (
    id_equipo INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    procesador VARCHAR(50),
    ram VARCHAR(20),
    disco VARCHAR(50),
    monitor VARCHAR(50),
    teclado VARCHAR(50),
    mouse VARCHAR(50),
    mac VARCHAR(50) UNIQUE,
    marca_maquina VARCHAR(50),
    marca_monitor VARCHAR(50),
    usuario_maquina VARCHAR(50),
    contrasena_equipo VARCHAR(50),
    ip VARCHAR(20),
    concesionaria VARCHAR(100),
    id_usuario INT UNSIGNED,
    CONSTRAINT fk_equipo_usuario
      FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario)
      ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 4. Tabla: Impresoras
-- Dispositivos periféricos vinculados a un equipo principal.
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Impresoras (
    id_impresora INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    modelo VARCHAR(50),
    ip VARCHAR(20),
    tipo ENUM('color', 'blanco y negro'),
    nombre VARCHAR(100),
    concesionaria VARCHAR(100),
    id_equipo INT UNSIGNED,
    CONSTRAINT fk_impresora_equipo
      FOREIGN KEY (id_equipo) REFERENCES Equipo(id_equipo)
      ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Insertar un administrador de prueba (Contraseña ejemplo: admin123)
-- Recuerda que en producción las contraseñas deben estar encriptadas.
INSERT INTO Administradores (correo, contraseña) VALUES ('admin@vw.com', 'sierra117');