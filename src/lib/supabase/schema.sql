-- =============================================================
-- SISTEMA SPC EN TIEMPO REAL — Supabase Schema
-- =============================================================
-- Ejecutar en el SQL Editor del panel de Supabase
-- =============================================================


-- =============================================================
-- EXTENSIONS
-- =============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- =============================================================
-- ENUMS
-- =============================================================
CREATE TYPE rol_enum AS ENUM ('super_admin', 'admin', 'supervisor', 'inspector');
CREATE TYPE estado_pieza AS ENUM ('ok', 'no_ok');
CREATE TYPE tipo_grafico_enum AS ENUM ('xbar_r', 'xbar_s', 'i_mr');


-- =============================================================
-- FUNCIÓN: updated_at trigger
-- =============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================
-- TABLA: profiles
-- =============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT NOT NULL,
  nombre              TEXT NOT NULL,
  rol                 rol_enum NOT NULL DEFAULT 'inspector',
  lineas_asignadas    UUID[] NOT NULL DEFAULT '{}',
  maquinas_asignadas  UUID[] NOT NULL DEFAULT '{}',
  activo              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_profiles_rol ON profiles(rol);
CREATE INDEX idx_profiles_activo ON profiles(activo);


-- =============================================================
-- TABLA: lineas
-- =============================================================
CREATE TABLE IF NOT EXISTS lineas (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre      TEXT NOT NULL,
  numero      INTEGER UNIQUE NOT NULL,
  icono       TEXT NOT NULL DEFAULT 'robot-arm',
  activa      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_lineas_updated_at
  BEFORE UPDATE ON lineas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_lineas_activa ON lineas(activa);
CREATE INDEX idx_lineas_numero ON lineas(numero);


-- =============================================================
-- TABLA: maquinas
-- =============================================================
CREATE TABLE IF NOT EXISTS maquinas (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  linea_id    UUID NOT NULL REFERENCES lineas(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  numero      INTEGER NOT NULL,
  icono       TEXT NOT NULL DEFAULT 'camera',
  activa      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (linea_id, numero)
);

CREATE TRIGGER trg_maquinas_updated_at
  BEFORE UPDATE ON maquinas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_maquinas_linea_id ON maquinas(linea_id);
CREATE INDEX idx_maquinas_activa ON maquinas(activa);


-- =============================================================
-- TABLA: piezas (inspecciones)
-- =============================================================
CREATE TABLE IF NOT EXISTS piezas (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  maquina_id        UUID NOT NULL REFERENCES maquinas(id) ON DELETE CASCADE,
  codigo_pieza      TEXT NOT NULL,
  estado            estado_pieza NOT NULL,
  valor_medido      NUMERIC,
  hora_inspeccion   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tiempo_ciclo      NUMERIC,                          -- en segundos
  inspector_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  observaciones     TEXT,
  fuera_de_control  BOOLEAN NOT NULL DEFAULT FALSE,
  regla_violada     TEXT,                             -- regla de Western Electric violada
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_piezas_maquina_id ON piezas(maquina_id);
CREATE INDEX idx_piezas_inspector_id ON piezas(inspector_id);
CREATE INDEX idx_piezas_hora_inspeccion ON piezas(hora_inspeccion DESC);
CREATE INDEX idx_piezas_fuera_de_control ON piezas(fuera_de_control) WHERE fuera_de_control = TRUE;
CREATE INDEX idx_piezas_maquina_hora ON piezas(maquina_id, hora_inspeccion DESC);


-- =============================================================
-- TABLA: spc_config (configuración SPC por máquina)
-- =============================================================
CREATE TABLE IF NOT EXISTS spc_config (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  maquina_id        UUID NOT NULL UNIQUE REFERENCES maquinas(id) ON DELETE CASCADE,
  tipo_grafico      tipo_grafico_enum NOT NULL DEFAULT 'xbar_r',
  ucl               NUMERIC,                          -- límite de control superior
  cl                NUMERIC,                          -- línea central
  lcl               NUMERIC,                          -- límite de control inferior
  usl               NUMERIC,                          -- especificación superior
  lsl               NUMERIC,                          -- especificación inferior
  tamano_subgrupo   INTEGER NOT NULL DEFAULT 5,
  cp                NUMERIC,
  cpk               NUMERIC,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TRIGGER trg_spc_config_updated_at
  BEFORE UPDATE ON spc_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_spc_config_maquina_id ON spc_config(maquina_id);


-- =============================================================
-- TABLA: spc_recalculos (historial de recálculos)
-- =============================================================
CREATE TABLE IF NOT EXISTS spc_recalculos (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  maquina_id        UUID NOT NULL REFERENCES maquinas(id) ON DELETE CASCADE,
  usuario_id        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  fecha_inicio      TIMESTAMPTZ NOT NULL,
  fecha_fin         TIMESTAMPTZ NOT NULL,
  -- valores anteriores
  ucl_anterior      NUMERIC,
  cl_anterior       NUMERIC,
  lcl_anterior      NUMERIC,
  cp_anterior       NUMERIC,
  cpk_anterior      NUMERIC,
  -- valores nuevos calculados
  ucl_nuevo         NUMERIC NOT NULL,
  cl_nuevo          NUMERIC NOT NULL,
  lcl_nuevo         NUMERIC NOT NULL,
  cp_nuevo          NUMERIC,
  cpk_nuevo         NUMERIC,
  -- metadatos del recálculo
  puntos_excluidos  UUID[] NOT NULL DEFAULT '{}',     -- IDs de piezas excluidas
  notas             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_spc_recalculos_maquina_id ON spc_recalculos(maquina_id);
CREATE INDEX idx_spc_recalculos_usuario_id ON spc_recalculos(usuario_id);
CREATE INDEX idx_spc_recalculos_created_at ON spc_recalculos(created_at DESC);


-- =============================================================
-- FUNCIÓN + TRIGGER: handle_new_user
-- Inserta automáticamente en profiles al crear un usuario en auth.users
-- =============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, rol)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'rol')::rol_enum, 'inspector')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- =============================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE maquinas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE piezas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE spc_config      ENABLE ROW LEVEL SECURITY;
ALTER TABLE spc_recalculos  ENABLE ROW LEVEL SECURITY;


-- -----------------------------------------------------------------
-- FUNCIÓN HELPER: obtener rol del usuario actual
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_my_rol()
RETURNS rol_enum AS $$
  SELECT rol FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- -----------------------------------------------------------------
-- RLS: profiles
-- -----------------------------------------------------------------

-- Cada usuario puede leer su propio perfil
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Super admin puede leer todos los perfiles
CREATE POLICY "profiles_select_super_admin"
  ON profiles FOR SELECT
  USING (get_my_rol() = 'super_admin');

-- Super admin puede insertar perfiles (gestión manual)
CREATE POLICY "profiles_insert_super_admin"
  ON profiles FOR INSERT
  WITH CHECK (get_my_rol() = 'super_admin');

-- Super admin puede actualizar cualquier perfil
CREATE POLICY "profiles_update_super_admin"
  ON profiles FOR UPDATE
  USING (get_my_rol() = 'super_admin');

-- Cada usuario puede actualizar su propio perfil (solo campos básicos)
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Super admin puede eliminar perfiles
CREATE POLICY "profiles_delete_super_admin"
  ON profiles FOR DELETE
  USING (get_my_rol() = 'super_admin');


-- -----------------------------------------------------------------
-- RLS: lineas
-- -----------------------------------------------------------------

-- Todos los usuarios autenticados pueden leer líneas activas
CREATE POLICY "lineas_select_all"
  ON lineas FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      activa = TRUE
      OR get_my_rol() IN ('super_admin', 'admin')
    )
  );

-- Admin y super admin pueden insertar líneas
CREATE POLICY "lineas_insert_admin"
  ON lineas FOR INSERT
  WITH CHECK (get_my_rol() IN ('super_admin', 'admin'));

-- Admin y super admin pueden actualizar líneas
CREATE POLICY "lineas_update_admin"
  ON lineas FOR UPDATE
  USING (get_my_rol() IN ('super_admin', 'admin'));

-- Admin y super admin pueden eliminar líneas
CREATE POLICY "lineas_delete_admin"
  ON lineas FOR DELETE
  USING (get_my_rol() IN ('super_admin', 'admin'));


-- -----------------------------------------------------------------
-- RLS: maquinas
-- -----------------------------------------------------------------

-- Todos los usuarios autenticados pueden leer máquinas activas
CREATE POLICY "maquinas_select_all"
  ON maquinas FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      activa = TRUE
      OR get_my_rol() IN ('super_admin', 'admin')
    )
  );

-- Admin y super admin pueden insertar máquinas
CREATE POLICY "maquinas_insert_admin"
  ON maquinas FOR INSERT
  WITH CHECK (get_my_rol() IN ('super_admin', 'admin'));

-- Admin y super admin pueden actualizar máquinas
CREATE POLICY "maquinas_update_admin"
  ON maquinas FOR UPDATE
  USING (get_my_rol() IN ('super_admin', 'admin'));

-- Admin y super admin pueden eliminar máquinas
CREATE POLICY "maquinas_delete_admin"
  ON maquinas FOR DELETE
  USING (get_my_rol() IN ('super_admin', 'admin'));


-- -----------------------------------------------------------------
-- RLS: piezas
-- -----------------------------------------------------------------

-- Todos los usuarios autenticados pueden leer piezas
CREATE POLICY "piezas_select_all"
  ON piezas FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Inspectores pueden insertar sus propias inspecciones
CREATE POLICY "piezas_insert_inspector"
  ON piezas FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND inspector_id = auth.uid()
  );

-- Admin y super admin pueden insertar piezas (recepción desde MES u otro sistema)
CREATE POLICY "piezas_insert_admin"
  ON piezas FOR INSERT
  WITH CHECK (get_my_rol() IN ('super_admin', 'admin'));

-- Admin y super admin pueden actualizar piezas (correcciones)
CREATE POLICY "piezas_update_admin"
  ON piezas FOR UPDATE
  USING (get_my_rol() IN ('super_admin', 'admin'));

-- Admin y super admin pueden eliminar piezas
CREATE POLICY "piezas_delete_admin"
  ON piezas FOR DELETE
  USING (get_my_rol() IN ('super_admin', 'admin'));


-- -----------------------------------------------------------------
-- RLS: spc_config
-- -----------------------------------------------------------------

-- Todos los usuarios autenticados pueden leer la configuración SPC
CREATE POLICY "spc_config_select_all"
  ON spc_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admin y super admin pueden insertar configuración SPC
CREATE POLICY "spc_config_insert_admin"
  ON spc_config FOR INSERT
  WITH CHECK (get_my_rol() IN ('super_admin', 'admin'));

-- Admin y super admin pueden actualizar la configuración SPC
CREATE POLICY "spc_config_update_admin"
  ON spc_config FOR UPDATE
  USING (get_my_rol() IN ('super_admin', 'admin'));

-- Solo super admin puede eliminar configuración SPC
CREATE POLICY "spc_config_delete_super_admin"
  ON spc_config FOR DELETE
  USING (get_my_rol() = 'super_admin');


-- -----------------------------------------------------------------
-- RLS: spc_recalculos
-- -----------------------------------------------------------------

-- Todos los usuarios autenticados pueden leer el historial de recálculos
CREATE POLICY "spc_recalculos_select_all"
  ON spc_recalculos FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admin y super admin pueden insertar registros de recálculo
CREATE POLICY "spc_recalculos_insert_admin"
  ON spc_recalculos FOR INSERT
  WITH CHECK (get_my_rol() IN ('super_admin', 'admin'));

-- Solo super admin puede eliminar historial
CREATE POLICY "spc_recalculos_delete_super_admin"
  ON spc_recalculos FOR DELETE
  USING (get_my_rol() = 'super_admin');


-- =============================================================
-- REALTIME: habilitar publicación para subscriptions
-- =============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE piezas;
ALTER PUBLICATION supabase_realtime ADD TABLE spc_config;
ALTER PUBLICATION supabase_realtime ADD TABLE maquinas;
ALTER PUBLICATION supabase_realtime ADD TABLE lineas;
