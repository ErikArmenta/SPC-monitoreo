-- =============================================================================
-- SISTEMA SPC EN TIEMPO REAL — MIGRATIONS
-- Ejecutar en Supabase SQL Editor en el orden indicado.
-- Todos los scripts usan IF NOT EXISTS / IF NOT EXISTS para ser idempotentes.
-- =============================================================================


-- =============================================================================
-- SECCIÓN 1: Columnas nuevas en spc_config
-- Agrega soporte para: valor nominal (target) y reglas Western Electric
-- configurables por máquina.
-- =============================================================================

ALTER TABLE spc_config
  ADD COLUMN IF NOT EXISTS target numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reglas_we jsonb
    DEFAULT '{"regla1":true,"regla2":true,"regla3":true,"regla4":true}';


-- =============================================================================
-- SECCIÓN 2: Tabla spc_config completa (por si no existe)
-- Incluye todas las columnas: las originales + las nuevas de la Sección 1.
-- Si la tabla ya existe, los ALTER de la Sección 1 ya agregan las columnas.
-- =============================================================================

CREATE TABLE IF NOT EXISTS spc_config (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  maquina_id       uuid        REFERENCES maquinas(id) ON DELETE CASCADE UNIQUE,
  tipo_grafico     text        DEFAULT 'i_mr'
                               CHECK (tipo_grafico IN ('xbar_r','xbar_s','i_mr')),
  ucl              numeric     DEFAULT NULL,
  cl               numeric     DEFAULT NULL,
  lcl              numeric     DEFAULT NULL,
  usl              numeric     DEFAULT NULL,
  lsl              numeric     DEFAULT NULL,
  target           numeric     DEFAULT NULL,
  tamano_subgrupo  integer     DEFAULT 5,
  cp               numeric     DEFAULT NULL,
  cpk              numeric     DEFAULT NULL,
  reglas_we        jsonb       DEFAULT '{"regla1":true,"regla2":true,"regla3":true,"regla4":true}',
  updated_at       timestamptz DEFAULT now(),
  updated_by       uuid        REFERENCES profiles(id) DEFAULT NULL
);


-- =============================================================================
-- SECCIÓN 3: Tabla caracteristicas
-- Permite que una sola máquina tenga múltiples características medibles
-- (diámetro, longitud, peso, rugosidad, etc.), cada una con su propio
-- historial de piezas y configuración SPC.
-- =============================================================================

CREATE TABLE IF NOT EXISTS caracteristicas (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  maquina_id  uuid        NOT NULL REFERENCES maquinas(id) ON DELETE CASCADE,
  nombre      text        NOT NULL,
  unidad      text        NOT NULL DEFAULT 'mm',
  descripcion text        DEFAULT NULL,
  activa      boolean     NOT NULL DEFAULT true,
  orden       integer     NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now(),

  UNIQUE (maquina_id, nombre)
);


-- =============================================================================
-- SECCIÓN 4: Columna caracteristica_id en spc_config
-- Vincula cada configuración SPC a una característica específica.
-- Es NULLABLE para mantener compatibilidad con las configuraciones
-- existentes (NULL = comportamiento original, una config por máquina).
-- =============================================================================

ALTER TABLE spc_config
  ADD COLUMN IF NOT EXISTS caracteristica_id uuid
    REFERENCES caracteristicas(id) ON DELETE CASCADE DEFAULT NULL;


-- =============================================================================
-- SECCIÓN 5: Tabla turnos + datos iniciales
-- Registra los turnos de producción para poder filtrar y analizar datos
-- por turno. Los turnos se asignan automáticamente al capturar una inspección.
-- =============================================================================

CREATE TABLE IF NOT EXISTS turnos (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre      text        NOT NULL,
  hora_inicio time        NOT NULL,
  hora_fin    time        NOT NULL,
  activo      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- Insertar los 3 turnos estándar solo si la tabla está vacía.
INSERT INTO turnos (nombre, hora_inicio, hora_fin)
SELECT 'Turno 1 - Mañana', '06:00', '14:00'
WHERE NOT EXISTS (SELECT 1 FROM turnos WHERE nombre = 'Turno 1 - Mañana');

INSERT INTO turnos (nombre, hora_inicio, hora_fin)
SELECT 'Turno 2 - Tarde', '14:00', '22:00'
WHERE NOT EXISTS (SELECT 1 FROM turnos WHERE nombre = 'Turno 2 - Tarde');

INSERT INTO turnos (nombre, hora_inicio, hora_fin)
SELECT 'Turno 3 - Noche', '22:00', '06:00'
WHERE NOT EXISTS (SELECT 1 FROM turnos WHERE nombre = 'Turno 3 - Noche');


-- =============================================================================
-- SECCIÓN 6: Columnas nuevas en piezas
-- - caracteristica_id: vincula la pieza a la característica medida.
-- - turno_id: vincula la pieza al turno de producción en que fue inspeccionada.
-- Ambas son NULLABLE para no romper la funcionalidad actual.
-- =============================================================================

ALTER TABLE piezas
  ADD COLUMN IF NOT EXISTS caracteristica_id uuid
    REFERENCES caracteristicas(id) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS turno_id uuid
    REFERENCES turnos(id) DEFAULT NULL;


-- =============================================================================
-- SECCIÓN 7: Tabla cambios_proceso
-- Registra eventos que afectan las mediciones del proceso productivo:
-- cambio de herramental, material, operador, ajustes de máquina, etc.
-- Estos cambios se visualizan como líneas verticales anotadas en las
-- gráficas SPC para explicar cambios de tendencia.
-- =============================================================================

CREATE TABLE IF NOT EXISTS cambios_proceso (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  maquina_id     uuid        NOT NULL REFERENCES maquinas(id) ON DELETE CASCADE,
  tipo           text        NOT NULL
                             CHECK (tipo IN (
                               'herramental',
                               'material',
                               'operador',
                               'ajuste_maquina',
                               'mantenimiento',
                               'otro'
                             )),
  descripcion    text        NOT NULL,
  fecha          timestamptz NOT NULL DEFAULT now(),
  registrado_por uuid        REFERENCES profiles(id) DEFAULT NULL,
  created_at     timestamptz DEFAULT now()
);


-- =============================================================================
-- SECCIÓN 8: Tabla alarm_acknowledgments
-- Registra cuando un supervisor o admin acusa recibo de una alarma de
-- fuera de control. Permite distinguir alarmas nuevas de alarmas ya vistas.
-- =============================================================================

CREATE TABLE IF NOT EXISTS alarm_acknowledgments (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  pieza_id         uuid        NOT NULL REFERENCES piezas(id) ON DELETE CASCADE,
  acknowledged_by  uuid        NOT NULL REFERENCES profiles(id),
  acknowledged_at  timestamptz NOT NULL DEFAULT now()
);


-- =============================================================================
-- ÍNDICES RECOMENDADOS
-- Mejoran el rendimiento de las consultas más frecuentes del sistema.
-- =============================================================================

-- Índice para buscar características por máquina (usado en InspeccionForm y config)
CREATE INDEX IF NOT EXISTS idx_caracteristicas_maquina_id
  ON caracteristicas (maquina_id);

-- Índice para filtrar piezas por característica
CREATE INDEX IF NOT EXISTS idx_piezas_caracteristica_id
  ON piezas (caracteristica_id);

-- Índice para filtrar piezas por turno
CREATE INDEX IF NOT EXISTS idx_piezas_turno_id
  ON piezas (turno_id);

-- Índice para buscar cambios de proceso por máquina
CREATE INDEX IF NOT EXISTS idx_cambios_proceso_maquina_id
  ON cambios_proceso (maquina_id);

-- Índice para buscar cambios de proceso por fecha (útil para gráficas SPC)
CREATE INDEX IF NOT EXISTS idx_cambios_proceso_fecha
  ON cambios_proceso (fecha);

-- Índice para buscar alarm_acknowledgments por pieza
CREATE INDEX IF NOT EXISTS idx_alarm_ack_pieza_id
  ON alarm_acknowledgments (pieza_id);
