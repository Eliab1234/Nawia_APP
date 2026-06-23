-- Script de inicialización para el Sistema Integral Clínico de NawIA
-- Ejecutar este script en el SQL Editor de Supabase para añadir los nuevos módulos.

-- =========================================================================
-- 1. TABLA: SERVICIOS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.servicios (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10, 2) NOT NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura de servicios a usuarios autenticados" ON public.servicios;
CREATE POLICY "Permitir lectura de servicios a usuarios autenticados"
    ON public.servicios FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir modificacion de servicios solo a administradores" ON public.servicios;
CREATE POLICY "Permitir modificacion de servicios solo a administradores"
    ON public.servicios FOR ALL TO authenticated
    USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
    WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- =========================================================================
-- 2. TABLA: CITAS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.citas (
    id BIGSERIAL PRIMARY KEY,
    dni_paciente VARCHAR(8) NOT NULL REFERENCES public.pacientes(dni) ON DELETE CASCADE,
    id_medico UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    id_servicio BIGINT NOT NULL REFERENCES public.servicios(id) ON DELETE RESTRICT,
    fecha_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    estado VARCHAR(20) DEFAULT 'Pendiente' NOT NULL CHECK (estado IN ('Pendiente', 'Completada', 'Cancelada')),
    motivo_consulta TEXT,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura de citas a admins o medicos asignados" ON public.citas;
CREATE POLICY "Permitir lectura de citas a admins o medicos asignados"
    ON public.citas FOR SELECT TO authenticated
    USING (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      OR id_medico = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.paciente_medicos pm
        WHERE pm.dni_paciente = public.citas.dni_paciente
        AND pm.id_medico = auth.uid()
      )
    );

DROP POLICY IF EXISTS "Permitir insercion de citas a usuarios autenticados" ON public.citas;
CREATE POLICY "Permitir insercion de citas a usuarios autenticados"
    ON public.citas FOR INSERT TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir modificacion de citas a admins o medicos asignados" ON public.citas;
CREATE POLICY "Permitir modificacion de citas a admins o medicos asignados"
    ON public.citas FOR UPDATE TO authenticated
    USING (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      OR id_medico = auth.uid()
    );

DROP POLICY IF EXISTS "Permitir eliminacion de citas a admins" ON public.citas;
CREATE POLICY "Permitir eliminacion de citas a admins"
    ON public.citas FOR DELETE TO authenticated
    USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- =========================================================================
-- 3. TABLA: HISTORIAS CLÍNICAS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.historias_clinicas (
    id BIGSERIAL PRIMARY KEY,
    dni_paciente VARCHAR(8) NOT NULL REFERENCES public.pacientes(dni) ON DELETE CASCADE,
    id_cita BIGINT UNIQUE REFERENCES public.citas(id) ON DELETE SET NULL,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    agudeza_visual_od VARCHAR(20),
    agudeza_visual_oi VARCHAR(20),
    presion_intraocular_od VARCHAR(20),
    presion_intraocular_oi VARCHAR(20),
    diagnostico TEXT,
    observaciones TEXT
);

ALTER TABLE public.historias_clinicas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura de historias clinicas a admins o medicos asignados" ON public.historias_clinicas;
CREATE POLICY "Permitir lectura de historias clinicas a admins o medicos asignados"
    ON public.historias_clinicas FOR SELECT TO authenticated
    USING (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      OR EXISTS (
        SELECT 1 FROM public.paciente_medicos pm
        WHERE pm.dni_paciente = public.historias_clinicas.dni_paciente
        AND pm.id_medico = auth.uid()
      )
    );

DROP POLICY IF EXISTS "Permitir insercion de historias clinicas a usuarios autenticados" ON public.historias_clinicas;
CREATE POLICY "Permitir insercion de historias clinicas a usuarios autenticados"
    ON public.historias_clinicas FOR INSERT TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir modificacion de historias clinicas a admins o medicos" ON public.historias_clinicas;
CREATE POLICY "Permitir modificacion de historias clinicas a admins o medicos"
    ON public.historias_clinicas FOR UPDATE TO authenticated
    USING (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      OR EXISTS (
        SELECT 1 FROM public.paciente_medicos pm
        WHERE pm.dni_paciente = public.historias_clinicas.dni_paciente
        AND pm.id_medico = auth.uid()
      )
    );

DROP POLICY IF EXISTS "Permitir eliminacion de historias clinicas a admins" ON public.historias_clinicas;
CREATE POLICY "Permitir eliminacion de historias clinicas a admins"
    ON public.historias_clinicas FOR DELETE TO authenticated
    USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- =========================================================================
-- 4. TABLA: RECETAS DE LENTES
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.recetas_lentes (
    id BIGSERIAL PRIMARY KEY,
    id_historia BIGINT UNIQUE NOT NULL REFERENCES public.historias_clinicas(id) ON DELETE CASCADE,
    od_esfera DECIMAL(4, 2),
    od_cilindro DECIMAL(4, 2),
    od_eje INT,
    oi_esfera DECIMAL(4, 2),
    oi_cilindro DECIMAL(4, 2),
    oi_eje INT,
    adicion DECIMAL(4, 2),
    distancia_pupilar DECIMAL(5, 2),
    fecha_emision TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.recetas_lentes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura de recetas de lentes a admins o medicos" ON public.recetas_lentes;
CREATE POLICY "Permitir lectura de recetas de lentes a admins o medicos"
    ON public.recetas_lentes FOR SELECT TO authenticated
    USING (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      OR EXISTS (
        SELECT 1 FROM public.historias_clinicas hc
        JOIN public.paciente_medicos pm ON pm.dni_paciente = hc.dni_paciente
        WHERE hc.id = public.recetas_lentes.id_historia
        AND pm.id_medico = auth.uid()
      )
    );

DROP POLICY IF EXISTS "Permitir insercion de recetas de lentes a usuarios autenticados" ON public.recetas_lentes;
CREATE POLICY "Permitir insercion de recetas de lentes a usuarios autenticados"
    ON public.recetas_lentes FOR INSERT TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir modificacion de recetas de lentes a admins o medicos" ON public.recetas_lentes;
CREATE POLICY "Permitir modificacion de recetas de lentes a admins o medicos"
    ON public.recetas_lentes FOR UPDATE TO authenticated
    USING (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      OR EXISTS (
        SELECT 1 FROM public.historias_clinicas hc
        JOIN public.paciente_medicos pm ON pm.dni_paciente = hc.dni_paciente
        WHERE hc.id = public.recetas_lentes.id_historia
        AND pm.id_medico = auth.uid()
      )
    );

DROP POLICY IF EXISTS "Permitir eliminacion de recetas de lentes a admins" ON public.recetas_lentes;
CREATE POLICY "Permitir eliminacion de recetas de lentes a admins"
    ON public.recetas_lentes FOR DELETE TO authenticated
    USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- =========================================================================
-- 5. TABLA: FACTURACIÓN
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.facturacion (
    id BIGSERIAL PRIMARY KEY,
    id_cita BIGINT UNIQUE NOT NULL REFERENCES public.citas(id) ON DELETE RESTRICT,
    monto_total DECIMAL(10, 2) NOT NULL,
    fecha_emision TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    metodo_pago VARCHAR(50),
    estado_pago VARCHAR(20) DEFAULT 'Pendiente' NOT NULL CHECK (estado_pago IN ('Pendiente', 'Pagado', 'Anulado'))
);

ALTER TABLE public.facturacion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura de facturas a usuarios autenticados" ON public.facturacion;
CREATE POLICY "Permitir lectura de facturas a usuarios autenticados"
    ON public.facturacion FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir gestion de facturas a usuarios autenticados" ON public.facturacion;
CREATE POLICY "Permitir gestion de facturas a usuarios autenticados"
    ON public.facturacion FOR ALL TO authenticated USING (true);
