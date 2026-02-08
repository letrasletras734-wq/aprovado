-- Função para permitir que o usuário delete sua própria conta de verdade (auth.users)
-- Deve ser rodada no SQL Editor do Supabase

CREATE OR REPLACE FUNCTION delete_own_user()
RETURNS void AS $$
BEGIN
  -- Apenas permite deletar se o ID bater com o usuário logado
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
