# SOLUÇÃO: Aba de Alunos Aparece em Branco

## PROBLEMA:
A aba de Alunos aparece em branco porque o callback `onUpdateUserPoints` não está implementado.

## SOLUÇÃO RÁPIDA:

### Passo 1: Encontre onde AdminPanel é renderizado

Procure no seu código onde você tem algo como:
```tsx
<AdminPanel
  onBack={...}
  users={...}
  // ... outras props
/>
```

### Passo 2: Adicione esta função ANTES de renderizar o AdminPanel

```typescript
const handleUpdateUserPoints = (userId: string, points: number) => {
  // Atualizar nos users
  setUsers(prev => prev.map(user => {
    if (user.id === userId) {
      return {
        ...user,
        examPoints: Math.max(0, (user.examPoints || 0) + points)
      };
    }
    return user;
  }));

  // Se for o usuário atual logado, também atualizar userStats
  const currentUser = getCurrentUser(); // Ou como você pega o usuário atual
  if (currentUser?.id === userId) {
    setUserStats(prev => ({
      ...prev,
      examPoints: Math.max(0, (prev.examPoints || 0) + points)
    }));
  }
};
```

### Passo 3: Pass o callback para o AdminPanel

```tsx
<AdminPanel
  onBack={...}
  users={...}
  onUpdateUserPoints={handleUpdateUserPoints}  // <--- ADICIONE ESTA LINHA
  // ... outras props
/>
```

## ALTERNATIVA TEMPORÁRIA (Para testar agora mesmo):

Se você não quiser implementar o callback ainda, pode fazer um hack temporário.

No arquivo `AdminPanel.tsx`, na linha 1532, troque:

```typescript
// DE:
onUpdateUserPoints(userId, points);

// PARA:
if (onUpdateUserPoints) {
  onUpdateUserPoints(userId, points);
} else {
  // Hack temporário - atualizar diretamente
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex !== -1) {
    users[userIndex].examPoints = Math.max(0, (users[userIndex].examPoints || 0) + points);
  }
}
```

## VERIFICAÇÃO:

Para saber se o problema é esse, abra o Console do Navegador (Ctrl+Shift+J) e veja se há algum erro quando você clica na aba Alunos.

Deve aparecer algo como:
- "onUpdateUserPoints is not a function"
- Ou "TypeError: ..."

Se aparecer este erro, é porque o callback não foi passado.

## TESTANDO A SOLUÇÃO:

1. Implemente o handleUpdateUserPoints
2. Passe para o AdminPanel
3. Recarregue a página
4. Vá na aba Alunos
5. Deve aparecer a lista de alunos agora!

## SENHA DO ADMIN:

Lembre-se de trocar 'admin123' na linha 1523 do AdminPanel.tsx pela sua senha real!
