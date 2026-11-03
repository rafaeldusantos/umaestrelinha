## TC-CFR-005: Os textos do bloco e da barra fixa não usam urgência, contagem, escassez, prova social nem emoji

**Tipo:** cfr
**Prioridade:** P1
**Origem:** CA-03.12
**Autor:** dev
**Persona:** PER-03 Helena
**Jornada:** J-01, J-02
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** o registro memorial é restrição de produto (`CLAUDE.md` › abertura)

### Objetivo

Quem acabou de perder alguém não é empurrada a comprar.

### Pré-condições

- Conta: anonima
- Massa: M-01, M-06, uma peça com estoque baixo
- Estado de partida: sacola vazia

### Condições reais

As da persona.

### Categoria

Usabilidade (linguagem do usuário).

### Metas

| Observável | Alvo | Aceitável |
| ---------- | ---- | --------- |
| textos do bloco, das mensagens de falta e recusa, da barra fixa e das linhas da sacola | nenhum "últimas unidades", "só hoje", contagem regressiva, "X pessoas compraram", emoji ou exclamação festiva | idem |

### Passos

1. Ler todos os textos do bloco nos estados nada marcado, incompleto, completo, recusa de gravação, peça com estoque baixo
   - **Esperado:** nenhum dos padrões proibidos
2. Ler a barra fixa e a gaveta
   - **Esperado:** idem

### Esperado e fonte

Fonte: PRD CA-03.12.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| rótulo "Escolha a corrente · N modelos" | lê a contagem de modelos | contagem de opções não é escassez nem prova social (registrar se soa como tal) |
