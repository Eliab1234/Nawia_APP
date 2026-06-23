-- Script de funciones de base de datos para la gestión del personal médico
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Habilitar extensión pgcrypto para encriptado de contraseñas si no está ya habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Función para obtener todos los usuarios registrados (Solo Administradores)
CREATE OR REPLACE FUNCTION public.get_users()
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  nombre_completo TEXT,
  dni TEXT,
  especialidad TEXT,
  role TEXT,
  banned_until TIMESTAMP WITH TIME ZONE
) 
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Verificar si el llamador es un administrador autenticado
  IF (auth.jwt() -> 'user_metadata' ->> 'role') != 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado. Se requieren privilegios de administrador.';
  END IF;

  RETURN QUERY
  SELECT 
    u.id, 
    u.email::VARCHAR, 
    (u.raw_user_meta_data->>'nombre_completo')::TEXT,
    (u.raw_user_meta_data->>'dni')::TEXT,
    (u.raw_user_meta_data->>'especialidad')::TEXT,
    (u.raw_user_meta_data->>'role')::TEXT,
    u.banned_until
  FROM auth.users u
  ORDER BY (u.raw_user_meta_data->>'nombre_completo') ASC;
END;
$$ LANGUAGE plpgsql;

-- 3. Función para actualizar datos de un usuario de forma segura (Solo Administradores)
CREATE OR REPLACE FUNCTION public.admin_update_user(
  user_id UUID,
  new_email TEXT,
  new_password TEXT,
  new_nombre_completo TEXT,
  new_dni TEXT,
  new_especialidad TEXT,
  new_role TEXT,
  is_disabled BOOLEAN
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  -- Verificar si el llamador es un administrador autenticado
  IF (auth.jwt() -> 'user_metadata' ->> 'role') != 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado. Se requieren privilegios de administrador.';
  END IF;

  -- Actualizar email y metadatos del usuario
  UPDATE auth.users
  SET 
    email = COALESCE(new_email, email),
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
      'nombre_completo', COALESCE(new_nombre_completo, raw_user_meta_data->>'nombre_completo'),
      'dni', COALESCE(new_dni, raw_user_meta_data->>'dni'),
      'especialidad', COALESCE(new_especialidad, raw_user_meta_data->>'especialidad'),
      'role', COALESCE(new_role, raw_user_meta_data->>'role')
    ),
    banned_until = CASE WHEN is_disabled THEN '2099-01-01 00:00:00+00'::timestamptz ELSE NULL END
  WHERE id = user_id;

  -- Si se provee una contraseña nueva, re-encriptarla y guardarla
  IF new_password IS NOT NULL AND new_password != '' THEN
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf', 10))
    WHERE id = user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
