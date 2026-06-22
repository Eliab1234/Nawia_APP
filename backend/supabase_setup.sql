-- Script de inicialización de Base de Datos y Seguridad para Supabase (PostgreSQL)
-- Proyecto: OcuVision AI

-- =========================================================================
-- 1. TABLA: PACIENTES
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.pacientes (
    dni VARCHAR(8) PRIMARY KEY,
    nombres_apellidos VARCHAR(150) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    genero CHAR(1) NOT NULL CHECK (genero IN ('M', 'F', 'O')),
    antecedentes_medicos TEXT,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en pacientes
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 2. TABLA: CONSULTAS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.consultas (
    id BIGSERIAL PRIMARY KEY,
    dni_paciente VARCHAR(8) NOT NULL REFERENCES public.pacientes(dni) ON DELETE CASCADE,
    id_medico UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ruta_imagen TEXT NOT NULL,
    -- Columnas de probabilidad (0.0000 a 1.0000)
    prob_normal DECIMAL(5,4) NOT NULL CHECK (prob_normal >= 0 AND prob_normal <= 1),
    prob_glaucoma DECIMAL(5,4) NOT NULL CHECK (prob_glaucoma >= 0 AND prob_glaucoma <= 1),
    prob_catarata DECIMAL(5,4) NOT NULL CHECK (prob_catarata >= 0 AND prob_catarata <= 1),
    prob_retinopatia_diabetica DECIMAL(5,4) NOT NULL CHECK (prob_retinopatia_diabetica >= 0 AND prob_retinopatia_diabetica <= 1),
    prob_degeneracion_macular DECIMAL(5,4) NOT NULL CHECK (prob_degeneracion_macular >= 0 AND prob_degeneracion_macular <= 1),
    prob_retinopatia_hipertensiva DECIMAL(5,4) NOT NULL CHECK (prob_retinopatia_hipertensiva >= 0 AND prob_retinopatia_hipertensiva <= 1),
    prob_miopia DECIMAL(5,4) NOT NULL CHECK (prob_miopia >= 0 AND prob_miopia <= 1),
    -- Campo para diagnóstico final
    diagnostico TEXT
);

-- Habilitar RLS en consultas
ALTER TABLE public.consultas ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 3. POLÍTICAS RLS (Row Level Security)
-- =========================================================================

-- POLÍTICAS PARA PACIENTES:
-- - Lectura: Cualquier usuario autenticado (Admin o Médico/User) puede ver pacientes.
CREATE POLICY "Permitir lectura de pacientes a usuarios autenticados" 
    ON public.pacientes 
    FOR SELECT 
    TO authenticated 
    USING (true);

-- - Inserción: Cualquier usuario autenticado (Admin o Médico/User) puede registrar pacientes.
CREATE POLICY "Permitir inserción de pacientes a usuarios autenticados" 
    ON public.pacientes 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

-- - Modificación y Eliminación: Solo Administradores pueden actualizar o borrar.
CREATE POLICY "Permitir modificación de pacientes solo a administradores" 
    ON public.pacientes 
    FOR UPDATE 
    TO authenticated 
    USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
    WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Permitir eliminación de pacientes solo a administradores" 
    ON public.pacientes 
    FOR DELETE 
    TO authenticated 
    USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');


-- POLÍTICAS PARA CONSULTAS:
-- - Lectura: Cualquier usuario autenticado puede visualizar las consultas.
CREATE POLICY "Permitir lectura de consultas a usuarios autenticados" 
    ON public.consultas 
    FOR SELECT 
    TO authenticated 
    USING (true);

-- - Inserción: Cualquier usuario autenticado puede insertar consultas, siempre que coincida con su ID.
CREATE POLICY "Permitir inserción de consultas asociadas al médico autenticado" 
    ON public.consultas 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = id_medico);

-- - Modificación y Eliminación: Solo Administradores.
CREATE POLICY "Permitir modificación de consultas solo a administradores" 
    ON public.consultas 
    FOR UPDATE 
    TO authenticated 
    USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
    WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Permitir eliminación de consultas solo a administradores" 
    ON public.consultas 
    FOR DELETE 
    TO authenticated 
    USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');


-- =========================================================================
-- 4. ALMACENAMIENTO (Supabase Storage Bucket: 'retinas')
-- =========================================================================

-- Nota: El bucket 'retinas' debe ser creado manualmente en la interfaz de Supabase Storage.
-- Asegúrate de crearlo con acceso público y llamarlo exactamente 'retinas'.

-- Habilitar lectura pública de imágenes del bucket 'retinas'
CREATE POLICY "Permitir lectura pública de imágenes de retinas"
    ON storage.objects 
    FOR SELECT 
    USING (bucket_id = 'retinas');

-- Permitir subida de imágenes a usuarios autenticados dentro del bucket 'retinas'
CREATE POLICY "Permitir subida de imágenes a usuarios autenticados"
    ON storage.objects 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (bucket_id = 'retinas');

-- Permitir eliminación de imágenes a administradores
CREATE POLICY "Permitir borrado de imágenes solo a administradores"
    ON storage.objects 
    FOR DELETE 
    TO authenticated 
    USING (bucket_id = 'retinas' AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
