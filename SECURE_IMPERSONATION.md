# Método Seguro de Impersonação (Super Sudo) com Supabase

Este documento descreve a arquitetura e implementação de um sistema seguro para que Administradores acessem contas de usuários temporariamente, sem saber a senha e sem expor credenciais sensíveis no frontend.

## 1. Arquitetura Resumida

O sistema utiliza **Supabase Edge Functions** como backend seguro.

1.  **Frontend (Admin Panel)**: Solicita a impersonação enviando o ID do usuário alvo.
2.  **Backend (Edge Function)**:
    *   Verifica se quem pediu **é realmente um Admin** (segurança crítica).
    *   Usa a **Service Role Key** (disponível apenas no backend) para gerar um **Link Mágico** ou **Sessão Direta** para o usuário alvo.
    *   Registra a ação em uma tabela de `audit_logs` (quem entrou, em qual conta, data).
    *   Retorna os tokens de acesso (`access_token`, `refresh_token`) ou URL de login para o frontend.
3.  **Frontend**: Recebe os tokens e atualiza a sessão local, redirecionando o admin para o painel do usuário.

---

## 2. Fluxo Passo-a-Passo

1.  **Admin** clica em "Impersonate" no Painel.
2.  **App** chama `supabase.functions.invoke('impersonate-user', { userId })`.
3.  **Edge Function**:
    *   Valida JWT do Admin.
    *   Checa na tabela `profiles` se `auth.uid()` é 'admin'.
    *   Chama `supabaseAdmin.auth.admin.getUserById(userId)`.
    *   Gera um link de login: `supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email: user.email })`.
    *   *(Alternativa Melhor)*: Cria tokens diretos (se suportado pela versão do GoTrue) ou retorna o link mágico para ser aberto em nova aba (ou processado em background).
    *   Insere log em `audit_logs`.
    *   Retorna `{ action_link: "..." }` ou `{ session: ... }`.
4.  **App**:
    *   Se for Link Mágico: Redireciona o navegador para esse link.
    *   Se for Sessão: Usa `supabase.auth.setSession(session)`.
5.  **Resultado**: O Admin agora está logado como o usuário alvo.

---

## 3. Implementação (Backend - Supabase Edge Function)

Crie uma função chamada `impersonate-user`.

```typescript
// supabase/functions/impersonate-user/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  // 1. Setup Clients
  // Client NORMAL (com token do usuário que chamou a função)
  const authHeader = req.headers.get('Authorization')!
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )

  // Client ADMIN (Service Role - PODEROSO)
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // 2. Security Check: Is the caller an Admin?
    const { data: { user: adminUser }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !adminUser) throw new Error('Unauthorized')

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', adminUser.id)
      .single()

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admins only' }), { status: 403 })
    }

    // 3. Get Target User ID from body
    const { targetUserId } = await req.json()
    if (!targetUserId) throw new Error('Target User ID required')

    // 4. Generate Login Link (Magic Link)
    // Nota: generateLink retorna um action_link que autentica o usuário instantaneamente
    const { data: targetUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(targetUserId)
    if (userError || !targetUser) throw new Error('User not found')

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.user.email,
      options: {
        redirectTo: 'http://localhost:5173/dashboard' // Configurar para sua URL de prod
      }
    })

    if (linkError) throw linkError

    // 5. Audit Logging (Segurança)
    await supabaseAdmin.from('audit_logs').insert({
      action: 'IMPERSONATION',
      performed_by: adminUser.id,
      target_user: targetUserId,
      details: { email: targetUser.user.email },
      created_at: new Date()
    })

    // 6. Return the "Magic Link" (hashed token included)
    // O frontend vai usar esse link para "logar"
    return new Response(
      JSON.stringify({ 
        redirectUrl: linkData.properties.action_link 
      }),
      { headers: { "Content-Type": "application/json" } },
    )

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
```

---

## 4. Implementação (Frontend - React)

No seu `AdminPanel.tsx` ou componente similar.

```typescript
import { useState } from 'react'
import { supabase } from '../../services/supabase'

export const ImpersonateButton = ({ userId, userName }: { userId: string, userName: string }) => {
  const [loading, setLoading] = useState(false)

  const handleImpersonate = async () => {
    if (!window.confirm(`Entrar como ${userName}? Sua sessão de admin será encerrada temporariamente.`)) return

    setLoading(true)
    try {
      // 1. Chamar a Edge Function
      const { data, error } = await supabase.functions.invoke('impersonate-user', {
        body: { targetUserId: userId }
      })

      if (error) throw error

      if (data?.redirectUrl) {
        // 2. Fazer Logout do Admin
        await supabase.auth.signOut()

        // 3. Redirecionar para o Link Mágico gerado
        // Isso vai autenticar como o novo usuário e redirecionar para o dashboard
        window.location.href = data.redirectUrl
      } else {
        throw new Error('Nenhuma URL de login retornada')
      }

    } catch (err: any) {
      alert('Erro ao iniciar impersonação: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={handleImpersonate} disabled={loading} className="btn-admin-action">
      {loading ? 'Entrando...' : 'Log In As User'}
    </button>
  )
}
```

---

## 5. Boas Práticas de Segurança e Privacidade

1.  **Audit Logs (Obrigatório)**:
    *   Crie uma tabela `audit_logs` no Supabase.
    *   Registre *cada* acesso via impersonação. Isso protege você legalmente e permite auditoria.
    *   Campos: `id`, `performed_by` (admin id), `target_user` (user id), `action` ('IMPERSONATION'), `timestamp`.

2.  **Indicador Visual (Frontend)**:
    *   Quando logado via impersonação, mostre uma barra no topo: *"⚠️ Você está acessando como [Nome do Usuário]"*.
    *   Adicione um botão fácil **"Voltar ao Admin"** que faz logout e redireciona para `/login`.

3.  **Permissões da Edge Function**:
    *   A função deve ser restrita. Verifique sempre `profile.role === 'admin'` dentro da função usando o `auth.uid()` do chamador. Não confie apenas no fato de a função ter sido chamada.

4.  **Service Role Key**:
    *   **NUNCA** exponha a `SUPABASE_SERVICE_ROLE_KEY` no frontend (`.env.local` do React). Ela DEVE ficar apenas nas Variáveis de Ambiente do Supabase (Cloud ou Server).

seguindo este guia, você remove a necessidade de salvar senhas de usuários ("raw_password") e utiliza o mecanismo nativo e seguro de autenticação do Supabase.
