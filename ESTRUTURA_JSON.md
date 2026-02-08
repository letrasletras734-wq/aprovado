# 📋 Estrutura JSON para Importação de Questões

## 🎯 Banco de Treino (Aba "Treinar")

### Estrutura Completa
```json
[
  {
    "id": "opcional_q1",
    "text": "Qual é a capital do Brasil?",
    "options": [
      "São Paulo",
      "Rio de Janeiro",
      "Brasília",
      "Salvador"
    ],
    "correctIndex": 2,
    "explanation": "Brasília é a capital federal do Brasil desde 1960.",
    "discipline": "Geografia",
    "banca": "FGV",
    "difficulty": "Fácil",
    "type": "mcq",
    "tags": ["capitais", "brasil", "geografia política"]
  },
  {
    "text": "Quanto é 2 + 2?",
    "options": ["3", "4", "5", "6"],
    "correctIndex": 1,
    "explanation": "2 + 2 = 4. Soma básica."
  }
]
```

### Campos

| Campo | Obrigatório | Padrão | Descrição |
|-------|-------------|--------|-----------|
| `text` | ✅ Sim | - | Enunciado da questão |
| `options` | ✅ Sim | - | Array de alternativas |
| `correctIndex` | ✅ Sim | - | Índice da resposta correta (0-based) |
| `explanation` | ✅ Sim | - | Justificativa da resposta |
| `id` | ❌ Não | `imported_{timestamp}_{idx}` | ID único |
| `discipline` | ❌ Não | `"Geral"` | Disciplina |
| `banca` | ❌ Não | `"Desconhecida"` | Organizadora |
| `difficulty` | ❌ Não | `"Médio"` | Fácil/Médio/Difícil |
| `type` | ❌ Não | `"mcq"` | Tipo de questão |
| `tags` | ❌ Não | `[]` | Tags para categorização |

---

## 🏆 Simulados e Desafios

### Estrutura Completa
```json
[
  {
    "id": "opcional_s1",
    "text": "A Constituição Federal de 1988 estabelece quantos poderes?",
    "options": [
      "Dois: Executivo e Legislativo",
      "Três: Executivo, Legislativo e Judiciário",
      "Quatro: Executivo, Legislativo, Judiciário e Moderador",
      "Cinco: incluindo o Ministério Público"
    ],
    "correctIndex": 1,
    "explanation": "São três poderes: Executivo, Legislativo e Judiciário, independentes e harmônicos entre si.",
    "discipline": "Direito Constitucional",
    "banca": "CESPE",
    "difficulty": "Médio",
    "type": "mcq",
    "tags": ["constituição", "poderes", "direito"]
  },
  {
    "text": "Qual o resultado de 15% de 200?",
    "options": ["25", "30", "35", "40"],
    "correctIndex": 1,
    "explanation": "15% de 200 = 0,15 × 200 = 30"
  }
]
```

### Herança Automática

Ao importar para **simulados**, campos omitidos herdam valores do simulado:

| Campo | Valor Herdado |
|-------|---------------|
| `discipline` | Disciplina do simulado (ex: "Matemática") |
| `difficulty` | Dificuldade do simulado (ex: "Difícil") |
| `banca` | `"Desconhecida"` (não herda) |

### Exemplo Mínimo para Simulado
```json
[
  {
    "text": "Pergunta aqui?",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0,
    "explanation": "Resposta correta é A porque..."
  }
]
```

Se o simulado for de **"Português - Difícil"**, esta questão automaticamente terá:
- `discipline`: "Português"
- `difficulty`: "Difícil"

---

## 💡 Dicas

### ✅ Boas Práticas

1. **Use IDs únicos** para evitar duplicatas
2. **Seja específico** nas explicações
3. **Use LaTeX** para fórmulas: `$$E = mc^2$$`
4. **Tags ajudam** na organização

### ❌ Erros Comuns

```json
// ❌ ERRADO - não é array
{
  "text": "...",
  "options": ["A", "B"]
}

// ✅ CORRETO - é array
[
  {
    "text": "...",
    "options": ["A", "B"]
  }
]
```

```json
// ❌ ERRADO - correctIndex como string
"correctIndex": "0"

// ✅ CORRETO - correctIndex como número
"correctIndex": 0
```

### 🔢 Índices (correctIndex)

- Opção A = `0`
- Opção B = `1`
- Opção C = `2`
- Opção D = `3`
- etc...

---

## 📊 Validação

Ambos sistemas validam:
- ✅ JSON válido
- ✅ É array
- ✅ Tem pelo menos 1 questão
- ✅ Campos obrigatórios presentes

Feedback:
- **Sucesso**: `✅ X questões importadas com sucesso!`
- **Erro**: `❌ Erro ao ler JSON. Verifique a formatação.`
