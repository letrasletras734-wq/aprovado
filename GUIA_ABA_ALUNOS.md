# GUIA RÁPIDO - Adicionar Aba de Alunos com Segurança

## ✅ O QUE JÁ ESTÁ PRONTO:
1. Botão "Alunos" no menu (linha 1081 do AdminPanel.tsx)
2. Imports de getUserLevel e getNextLevel
3. Prop onUpdateUserPoints no AdminPanel

## 🚀 PASSO A PASSO:

### 1. Abra AdminPanel.tsx

### 2. Encontre a linha 2382 (aproximadamente)
Procure por `</main>` ou pelo final do bloco `<main className="flex-1 p-6 space-y-8 pb-32 max-w-4xl mx-auto w-full">`

### 3. COLE o código do arquivo `CODIGO_ABA_ALUNOS.txt`
Cole ANTES do `</main>`

### 4. IMPORTANTE: Ajuste a senha do administrador
No código que você colou, procure por:
```typescript
const adminPassword = 'admin123'; // ALTERE PARA SUA LÓGICA REAL
```

Altere para a senha correta do seu admin ou implemente uma verificação mais segura.

### 5. Implemente o callback no App.tsx (ou onde AdminPanel é usado)

Encontre onde você renderiza `<AdminPanel ... />` e adicione:

```typescript
const handleUpdateUserPoints = (userId: string, points: number) => {
  // Atualizar lista de usuários
  setUserAccounts(prev => prev.map(user => {
    if (user.id === userId) {
      return {
        ...user,
        examPoints: Math.max(0, (user.examPoints || 0) + points)
      };
    }
    return user;
  }));

  // Atualizar userStats se for o usuário logado
  if (currentUserAccount?.id === userId) {
    setUserStats(prev => ({
      ...prev,
      examPoints: Math.max(0, (prev.examPoints || 0) + points)
    }));
  }
};
```

### 6. Passe o callback para o AdminPanel

```tsx
<AdminPanel
  {...outrosProps}
  onUpdateUserPoints={handleUpdateUserPoints}
/>
```

## 🎯 COMO USAR DEPOIS:

1. Entre no Painel Admin
2. Clique na aba "Alunos"
3. Escolha um aluno
4. Digite pontos (positivo = bônus, negativo = penalidade)
   - Ex: `+100` para adicionar 100 pontos
   - Ex: `-50` para remover 50 pontos
5. Clique em "Atualizar"
6. Digite a senha do admin
7. Confirme!

## 🔒 SEGURANÇA:

- ✅ Requer senha do admin
- ✅ Modal de confirmação
- ✅ Mostra quantos pontos serão alterados
- ✅ Pontos nunca ficam negativos (mínimo 0)

## ⚡ BOTÕES RÁPIDOS:

- **+50, +100, +200, +500, +1000** → Bônus rápidos
- **-50** → Penalidade rápida

## 🧪 TESTE:

1. Adicione +500 pontos a um aluno
2. Vá no perfil dele
3. Veja o nível mudando!

## ❗ IMPORTANTE:

Troque `'admin123'` pela sua senha real no código!
