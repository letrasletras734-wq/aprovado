-- Função para permitir que ADMINS alterem o status VIP de qualquer usuário
-- Deve ser rodada no SQL Editor do Supabase

CREATE OR REPLACE FUNCTION toggle_user_vip(target_id uuid, new_status boolean)
RETURNS void AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Verificar se quem está chamando é admin
  SELECT (role = 'admin') INTO is_admin
  FROM public.profiles
  WHERE id = auth.uid();

  IF is_admin THEN
    UPDATE public.profiles
    SET is_vip = new_status
    WHERE id = target_id;
  ELSE
    RAISE EXCEPTION 'Acesso negado: Apenas administradores podem gerenciar VIPs.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
