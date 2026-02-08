# Guia de Implementação - Gerenciamento de Pontos pelo Admin

## Passo 1: Importar getUserLevel no AdminPanel.tsx

No topo do arquivo `AdminPanel.tsx`, adicione:

```typescript
import { getUserLevel, getNextLevel } from '../../constants';
import { Users } from 'lucide-react';
```

## Passo 2: Adicionar ícone Users aos imports do lucide-react

Já está nos imports? Verifique no topo do arquivo.

## Passo 3: Adicionar a aba no menu principal

Encontre onde os botões de aba estão renderizados (procure por botões com onClick que mudam activeTab) e adicione:

```tsx
<button
  onClick={() => handleTabChange('users')}
  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
    activeTab === 'users' ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400'
  }`}
>
  <Users size={18} />
  Alunos
</button>
```

## Passo 4: Renderizar o conteúdo da aba

Cole o conteúdo do arquivo `TEMPLATE_ABA_ALUNOS.tsx` onde as outras abas são renderizadas.

## Passo 5: Implementar callback no componente pai

No componente que usa o AdminPanel, adicione esta função:

```typescript
const handleUpdateUserPoints = (userId: string, points: number) => {
  setUserAccounts(prev => prev.map(user => {
    if (user.id === userId) {
      const newExamPoints = Math.max(0, (user.examPoints || 0) + points);
      return {
        ...user,
        examPoints: newExamPoints
      };
    }
    return user;
  }));

  // Também atualizar userStats se for o usuário atual
  if (currentUserAccount?.id === userId) {
    setUserStats(prev => ({
      ...prev,
      examPoints: Math.max(0, (prev.examPoints || 0) + points)
    }));
  }
};
```

## Passo 6: Passar o callback para o AdminPanel

```tsx
<AdminPanel
  {...outrasProps}
  onUpdateUserPoints={handleUpdateUserPoints}
/>
```

## Passo 7: Adicionar examPoints aos UserAccount

Verifique se em `types.ts`, a interface `UserAccount` tem o campo:

```typescript
export interface UserAccount {
  // ... outros campos
  examPoints?: number;
}
```

Se não tiver, adicione.

## Funcionalidades da Interface

- ✅ Lista todos os alunos com seus avatares
- ✅ Mostra nível atual e medalha
- ✅ Input para adicionar/remover pontos manualmente
- ✅ Botões rápidos: +50, +100, +200, +500, +1000, -50
- ✅ Mostra próximo nível e pontos necessários

## Testando

1. Acesse a aba "Alunos" no painel admin
2. Selecione um aluno
3. Use os botões rápidos ou digite um valor
4. Clique em "Atualizar"
5. Vá para o perfil do aluno e veja o nível mudando

## Importante

- Valores negativos removem pontos
- Pontos nunca ficam abaixo de 0
- Mudanças são instantâneas
- Use para testar todos os 6 níveis rapidamente
