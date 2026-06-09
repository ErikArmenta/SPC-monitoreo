-- =============================================================
-- MIGRATION: Agregar columna valores_individuales a tabla piezas
-- =============================================================
-- Ejecutar manualmente en el Supabase SQL Editor del proyecto
-- =============================================================

ALTER TABLE piezas
  ADD COLUMN IF NOT EXISTS valores_individuales jsonb DEFAULT NULL;

-- Comentario: almacena el arreglo de las 5 mediciones individuales
-- de las cuales valor_medido es el promedio.
-- Ejemplo: [12.340, 12.355, 12.320, 12.310, 12.345]
