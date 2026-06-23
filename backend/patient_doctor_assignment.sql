-- Script de Asignación de Médicos, Casos Especiales y Seguridad RLS
-- Ejecutar este script en el SQL Editor de Supabase

-- =========================================================================
-- 1. TABLA: PACIENTE_MEDICOS (Tabla Intermedia de Asignación)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.paciente_medicos (
    dni_paciente VARCHAR(8) NOT NULL REFERENCES public.pacientes(dni) ON DELETE CASCADE,
    id_medico UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    es_medico_primario BOOLEAN DEFAULT true,
    es_caso_especial BOOLEAN DEFAULT false,
    motivo_caso_especial TEXT,
    fecha_asignacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (dni_paciente, id_medico)
);

-- Habilitar RLS en paciente_medicos
ALTER TABLE public.paciente_medicos ENABLE ROW LEVEL SECURITY;

-- Índice único parcial: Un paciente solo puede tener UN médico primario a la vez
CREATE UNIQUE INDEX IF NOT EXISTS unique_primary_medico 
ON public.paciente_medicos (dni_paciente) 
WHERE (es_medico_primario = true);

-- =========================================================================
-- 2. FUNCIÓN PÚBLICA DE MÉDICOS (Para relacionar IDs y nombres en el Frontend)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_medicos_public()
RETURNS TABLE (
  id UUID,
  nombre_completo TEXT,
  especialidad TEXT
) 
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id, 
    (u.raw_user_meta_data->>'nombre_completo')::TEXT,
    (u.raw_user_meta_data->>'especialidad')::TEXT
  FROM auth.users u
  WHERE (u.raw_user_meta_data->>'role') = 'user';
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- 3. POLÍTICAS RLS (Row Level Security)
-- =========================================================================

-- POLÍTICAS PARA PACIENTES (Modificar las existentes):
DROP POLICY IF EXISTS "Permitir lectura de pacientes a usuarios autenticados" ON public.pacientes;
DROP POLICY IF EXISTS "Permitir lectura de pacientes asignados o a admins" ON public.pacientes;
DROP POLICY IF EXISTS "Permitir lectura de pacientes asignados o a admins/asistentes/enfermeros" ON public.pacientes;

-- - Lectura: Admins, Asistentes y Enfermeros ven todos; Médicos solo ven sus pacientes asignados.
CREATE POLICY "Permitir lectura de pacientes asignados o a admins/asistentes/enfermeros"
    ON public.pacientes
    FOR SELECT
    TO authenticated
    USING (
      (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'asistente', 'enfermero')
      OR EXISTS (
        SELECT 1 FROM public.paciente_medicos pm
        WHERE pm.dni_paciente = public.pacientes.dni
        AND pm.id_medico = auth.uid()
      )
    );

-- POLÍTICAS PARA CONSULTAS / EXÁMENES (Modificar las existentes):
DROP POLICY IF EXISTS "Permitir lectura de consultas a usuarios autenticados" ON public.consultas;
DROP POLICY IF EXISTS "Permitir lectura de consultas a admins o medicos asignados al paciente" ON public.consultas;

-- - Lectura: Admins ven todas; Médicos solo ven las de pacientes asignados a ellos.
CREATE POLICY "Permitir lectura de consultas a admins o medicos asignados al paciente"
    ON public.consultas
    FOR SELECT
    TO authenticated
    USING (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      OR EXISTS (
        SELECT 1 FROM public.paciente_medicos pm
        WHERE pm.dni_paciente = public.consultas.dni_paciente
        AND pm.id_medico = auth.uid()
      )
    );

-- POLÍTICAS PARA PACIENTE_MEDICOS (Asignaciones):
DROP POLICY IF EXISTS "Permitir lectura de asignaciones a admins o medicos asignados" ON public.paciente_medicos;
DROP POLICY IF EXISTS "Permitir lectura de asignaciones a admins/asistentes/enfermeros o medicos asignados" ON public.paciente_medicos;
DROP POLICY IF EXISTS "Permitir inserción de asignaciones a usuarios autenticados" ON public.paciente_medicos;
DROP POLICY IF EXISTS "Permitir modificacion y eliminacion de asignaciones a admins o al propio medico" ON public.paciente_medicos;

-- - Lectura: Admins, Asistentes y Enfermeros ven todas; Médicos ven asignaciones de sí mismos.
CREATE POLICY "Permitir lectura de asignaciones a admins/asistentes/enfermeros o medicos asignados"
    ON public.paciente_medicos
    FOR SELECT
    TO authenticated
    USING (
      (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'asistente', 'enfermero')
      OR id_medico = auth.uid()
    );

-- - Inserción: Admins, Asistentes y Enfermeros al asociar pacientes.
CREATE POLICY "Permitir inserción de asignaciones a usuarios autenticados"
    ON public.paciente_medicos
    FOR INSERT
    TO authenticated
    WITH CHECK (
      (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'asistente', 'enfermero')
      OR id_medico = auth.uid()
    );

-- - Modificación y Eliminación: Solo Administradores o el propio médico asignado.
CREATE POLICY "Permitir modificacion y eliminacion de asignaciones a admins o al propio medico"
    ON public.paciente_medicos
    FOR ALL
    TO authenticated
    USING (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      OR id_medico = auth.uid()
    );

-- POLÍTICAS PARA CITAS:
DROP POLICY IF EXISTS "Permitir lectura de citas a admins o medicos asignados" ON public.citas;
DROP POLICY IF EXISTS "Permitir lectura de citas a admins/asistentes/enfermeros o medicos asignados" ON public.citas;
DROP POLICY IF EXISTS "Permitir modificacion de citas a admins o medicos asignados" ON public.citas;
DROP POLICY IF EXISTS "Permitir modificacion de citas a admins/asistentes/enfermeros o medicos asignados" ON public.citas;

-- - Lectura: Admins, Asistentes y Enfermeros ven todas; Médicos ven sus citas asignadas.
CREATE POLICY "Permitir lectura de citas a admins/asistentes/enfermeros o medicos asignados"
    ON public.citas FOR SELECT TO authenticated
    USING (
      (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'asistente', 'enfermero')
      OR id_medico = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.paciente_medicos pm
        WHERE pm.dni_paciente = public.citas.dni_paciente
        AND pm.id_medico = auth.uid()
      )
    );

-- - Modificación: Admins, Asistentes y Enfermeros pueden actualizar citas; Médicos sus propias citas.
CREATE POLICY "Permitir modificacion de citas a admins/asistentes/enfermeros o medicos asignados"
    ON public.citas FOR UPDATE TO authenticated
    USING (
      (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'asistente', 'enfermero')
      OR id_medico = auth.uid()
    );

-- POLÍTICAS PARA HISTORIAS CLÍNICAS:
DROP POLICY IF EXISTS "Permitir lectura de historias clinicas a admins o medicos asignados" ON public.historias_clinicas;
DROP POLICY IF EXISTS "Permitir lectura de historias clinicas a admins/enfermeros o medicos asignados" ON public.historias_clinicas;
DROP POLICY IF EXISTS "Permitir modificacion de historias clinicas a admins o medicos" ON public.historias_clinicas;
DROP POLICY IF EXISTS "Permitir modificacion de historias clinicas a admins/enfermeros o medicos" ON public.historias_clinicas;

-- - Lectura: Admins y Enfermeros ven todas; Médicos las de pacientes asignados a ellos.
CREATE POLICY "Permitir lectura de historias clinicas a admins/enfermeros o medicos asignados"
    ON public.historias_clinicas FOR SELECT TO authenticated
    USING (
      (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'enfermero')
      OR EXISTS (
        SELECT 1 FROM public.paciente_medicos pm
        WHERE pm.dni_paciente = public.historias_clinicas.dni_paciente
        AND pm.id_medico = auth.uid()
      )
    );

-- - Modificación: Admins y Enfermeros pueden modificar; Médicos de sus pacientes asignados.
CREATE POLICY "Permitir modificacion de historias clinicas a admins/enfermeros o medicos"
    ON public.historias_clinicas FOR UPDATE TO authenticated
    USING (
      (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'enfermero')
      OR EXISTS (
        SELECT 1 FROM public.paciente_medicos pm
        WHERE pm.dni_paciente = public.historias_clinicas.dni_paciente
        AND pm.id_medico = auth.uid()
      )
    );

-- =========================================================================
-- 4. FUNCIÓN SEGURA: CAMBIAR MÉDICO PRIMARIO (Solo Administradores)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.change_primary_doctor(
  p_dni TEXT,
  p_new_medico_id UUID
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Verificar si el llamador es un administrador autenticado
  IF (auth.jwt() -> 'user_metadata' ->> 'role') != 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado. Se requieren privilegios de administrador.';
  END IF;

  -- 1. Quitar el estado de médico primario a cualquier médico asignado a este paciente
  UPDATE public.paciente_medicos
  SET es_medico_primario = false
  WHERE dni_paciente = p_dni;

  -- 2. Insertar o actualizar al nuevo médico primario
  INSERT INTO public.paciente_medicos (dni_paciente, id_medico, es_medico_primario, es_caso_especial, motivo_caso_especial)
  VALUES (p_dni, p_new_medico_id, true, false, NULL)
  ON CONFLICT (dni_paciente, id_medico)
  DO UPDATE SET es_medico_primario = true, es_caso_especial = false, motivo_caso_especial = NULL;
END;
$$ LANGUAGE plpgsql;
