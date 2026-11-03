## TC-FUNC-016: Joia em combinação indisponível bloqueia o conjunto com o aviso da página; joia esgotada esconde o bloco

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-04.8
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, ramo J-01b
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** o bloco nunca leva adicional sem o principal

### Objetivo

A cliente não leva só a corrente achando que levou o conjunto.

### Pré-condições

- Conta: anonima
- Massa: M-01 com uma combinação de variações indisponível; M-05 (produto inteiro esgotado com Compre Junto)
- Estado de partida: sacola vazia

### Condições reais

As da persona.

### Passos

1. Em M-01, escolher a combinação indisponível com um adicional marcado
   - **Esperado:** o bloco continua visível; "Essa combinação está indisponível no momento."; o botão bloqueado na barra fixa
2. Abrir M-05
   - **Esperado:** sem bloco; botão "Esgotado"

### Esperado e fonte

Fonte: PRD CA-04.8; textos do protótipo (spec › Design › Loja).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| voltar a uma combinação disponível | troca a variação | o botão volta a "Levar o conjunto" com a marca mantida |
