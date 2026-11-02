## TC-CFR-003: Pelo leitor de tela, o cartão e a Loja ao vivo se anunciam com nome, títulos e alvos que dá para tocar

**Tipo:** cfr
**Prioridade:** P1
**Origem:** LAV-01, LAV-62
**Autor:** dev
**Persona:** PER-02 Adri à noite, fonte 200 %
**Jornada:** J-01, J-02
**Charter:** CH-08
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** simulado pela árvore de acessibilidade e pelo teclado; TalkBack real fora

### Objetivo

Quando a Adri deixa o celular ler a tela, ela entende quantas pessoas há e em que bloco está.

### Pré-condições

- Conta: `admin-atelie`
- Massa: 2 clientes presentes; uma no checkout
- Estado de partida: Início

### Condições reais

| Dimensão   | Valor                               |
| ---------- | ----------------------------------- |
| Modalidade | leitor-de-tela (árvore de acessibilidade) e só-teclado |

### Passos

1. Lê a árvore do Início
   - **Esperado:** o cartão como botão com o nome "Agora na loja, 2 pessoas. Abrir loja ao vivo"
2. Abre a Loja ao vivo e lê a árvore
   - **Esperado:** um título de nível 1 "Loja ao vivo"; cada bloco com um título; o "Voltar" com nome; nenhum botão sem nome
3. Força a falha e lê
   - **Esperado:** "Não consegui carregar." anunciado; "Tentar de novo" é botão com nome
4. Mede os alvos (cartão, "Voltar", "Tentar de novo", seletor de período)
   - **Esperado:** cada um com pelo menos 44 × 44 px
5. Só com teclado, do topo ao fim
   - **Esperado:** foco visível em cada controle, na ordem visual

### Categoria

Acessibilidade.

### Metas

| Observável         | Alvo            | Aceitável       |
| ------------------ | --------------- | --------------- |
| alvo de toque       | ≥ 44 px         | ≥ 44 px         |
| controles sem nome  | nenhum          | nenhum          |
| `h1`                | um              | um              |

### Esperado e fonte

Nome acessível com plural, `h1` em todos os estados, alvo ≥ 44 px — fonte: PRD LAV-01, LAV-62; `CLAUDE.md` › alvo de 44 px

### Variações

| Variação          | Ação                          | Esperado                      |
| ----------------- | ----------------------------- | ----------------------------- |
| número mudando     | uma cliente entra com o leitor ativo | a mudança não rouba o foco |
