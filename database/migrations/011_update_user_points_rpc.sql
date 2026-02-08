-- Migration 011: Update User Points RPC
-- This function allows admins to add or remove points from a user.
-- It updates score, exam_points in profiles table AND logs it in simulado_results for the ranking.

CREATE OR REPLACE FUNCTION update_user_points(
    target_id UUID,
    points_to_add INTEGER
)
RETURNS JSONB AS $$
DECLARE
    caller_role TEXT;
    u_record RECORD;
BEGIN
    -- 1. Verificar quem está chamando (segurança)
    SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
    
    IF caller_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Apenas administradores podem alterar pontos. Seu cargo atual: %', COALESCE(caller_role, 'Nenhum');
    END IF;

    -- 2. Atualizar perfil do usuário alvo
    UPDATE profiles
    SET 
        score = GREATEST(0, COALESCE(score, 0) + points_to_add),
        exam_points = GREATEST(0, COALESCE(exam_points, 0) + points_to_add)
    WHERE id = target_id
    RETURNING * INTO u_record;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Usuário alvo não encontrado: %', target_id;
    END IF;

    -- 3. Inserir registro no simulado_results para o Ranking Semanal captar
    INSERT INTO simulado_results (
        user_id,
        preset_id,
        mode,
        total_questions,
        correct_answers,
        score,
        percentage,
        metadata
    ) VALUES (
        target_id,
        'manual_adjustment',
        'manual_adjustment',
        0,
        0,
        points_to_add,
        0,
        jsonb_build_object('reason', 'Admin adjustment', 'admin_id', auth.uid())
    );

    RETURN to_jsonb(u_record);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION update_user_points(UUID, INTEGER) TO authenticated;
