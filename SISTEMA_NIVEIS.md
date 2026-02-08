# Sistema de Níveis - Documentação

## Visão Geral
Sistema automático de progressão baseado em pontos acumulados **exclusivamente de Provas Oficiais**.

## Estrutura dos Níveis

### Nível 1 - Iniciante 🥉
- **Pontos necessários:** 0 a 199
- **Cor:** Bronze (#CD7F32)
- **Descrição:** Início da jornada no aplicativo
- **Ícone:** 🥉

### Nível 2 - Aprendiz 🥈
- **Pontos necessários:** 200 a 499
- **Cor:** Prata clara (#C0C0C0)
- **Descrição:** Primeiros progressos consolidados
- **Ícone:** 🥈

### Nível 3 - Dedicado 🏅
- **Pontos necessários:** 500 a 999
- **Cor:** Ouro rosé (#FFD700)
- **Descrição:** Consistência e disciplina nos estudos
- **Ícone:** 🏅

### Nível 4 - Avançado 🥇
- **Pontos necessários:** 1.000 a 2.999
- **Cor:** Ouro clássico (#FFD700)
- **Descrição:** Domínio progressivo dos conteúdos
- **Ícone:** 🥇

### Nível 5 - Excelência 🏆
- **Pontos necessários:** 3.000 a 4.999
- **Cor:** Platina (#E5E4E2)
- **Descrição:** Alto desempenho acadêmico
- **Ícone:** 🏆

### Nível 6 - Avançado Excelente 👑
- **Pontos necessários:** ≥ 5.000
- **Cor:** Platina premium (#B9F2FF)
- **Descrição:** Excelência máxima e preparação de elite
- **Ícone:** 👑

## Como Funciona

### Ganho de Pontos
- ✅ **Provas Oficiais:** Cada prova oficial completada dá até 20 pontos baseados na performance
- ❌ **Desafios/Treinos:** NÃO contam para o sistema de níveis
- 📊 **Cálculo:** Pontos = (Acertos / Total de Questões) × 20

### Atualização Automática
1. O usuário completa uma Prova Oficial
2. Sistema calcula a pontuação (0-20 pontos)
3. Pontos são adicionados ao `examPoints` do usuário
4. Nível é atualizado automaticamente
5. Progress bar mostra quanto falta para o próximo nível

### Regras
- ✅ **Progressão contínua:** Sem necessidade de confirmação manual
- ✅ **Sem regressão:** Uma vez alcançado, o nível nunca diminui
- ✅ **Tempo real:** Atualização imediata no perfil
- ✅ **Primeira vez apenas:** Refazer uma prova não dá pontos extras

## Interface do Usuário

### Perfil
O card de nível exibe:
- Ícone grande do nível atual
- Nome do nível
- Descrição
- Pontos totais acumulados
- Barra de progresso para o próximo nível
- Pontos restantes até o próximo nível

### Nível Máximo
Quando o usuário atinge o nível 6 (Avançado Excelente):
- Mensagem especial: "🎉 Nível Máximo Alcançado!"
- Sem barra de progresso (já está no topo)

## Implementação Técnica

### Arquivos Modificados
1. **constants.ts**
   - Adicionado array `LEVELS` com definições
   - Funções helper: `getUserLevel()`, `getNextLevel()`, `getLevelProgress()`

2. **types.ts**
   - Adicionado campo `examPoints: number` em `UserStats`

3. **ProfileView.tsx**
   - Importado funções helper
   - Adicionado card visual do sistema de níveis
   - Barra de progresso animada

4. **App.tsx**
   - Atualizado `finishSimulado()` para incrementar `examPoints`
   - Apenas para provas oficiais não repetidas

### Funções Helper

```typescript
// Retorna o nível atual baseado nos pontos
getUserLevel(points: number)

// Retorna o próximo nível (ou null se já está no máximo)
getNextLevel(currentPoints: number)

// Retorna objeto com progresso: { percentage, pointsToNext, currentLevelPoints }
getLevelProgress(points: number)
```

## Exemplo de Uso

```typescript
const currentLevel = getUserLevel(userStats.examPoints || 0);
const nextLevel = getNextLevel(userStats.examPoints || 0);
const progress = getLevelProgress(userStats.examPoints || 0);

console.log(currentLevel.name); // "Aprendiz"
console.log(currentLevel.icon); // "🥈"
console.log(progress.percentage); // 75
console.log(progress.pointsToNext); // 50
```

## Testes Sugeridos

1. ✅ Criar conta nova → Verificar nível "Iniciante"
2. ✅ Completar prova oficial → Ver pontos aumentarem
3. ✅ Completar várias provas → Ver mudança de nível
4. ✅ Refazer prova → Confirmar que não dá pontos extras
5. ✅ Completar desafio → Confirmar que NÃO afeta níveis
6. ✅ Alcançar 5000 pontos → Ver nível máximo

## Notas Importantes

- 🔒 Apenas **Provas Oficiais** contam
- 🚫 Desafios, treinos e modo aleatório **NÃO contam**
- 📈 Progressão é **irreversível** (nunca diminui)
- ⚡ Atualização é **automática** e **instantânea**
- 🎯 Sistema incentiva foco nas provas oficiais
