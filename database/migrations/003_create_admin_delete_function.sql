-- Função para permitir que ADMINS deletem qualquer usuário
-- Deve ser rodada no SQL Editor do Supabase

CREATE OR REPLACE FUNCTION delete_user_as_admin(target_id uuid)
RETURNS void AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Verificar se quem está chamando (auth.uid()) é admin na tabela profiles
  SELECT (role = 'admin') INTO is_admin
  FROM public.profiles
  WHERE id = auth.uid();

  -- Se for admin, prosseguir com a deleção
  IF is_admin THEN
    DELETE FROM auth.users WHERE id = target_id;
  ELSE
    RAISE EXCEPTION 'Acesso negado: Apenas administradores podem deletar usuários.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
