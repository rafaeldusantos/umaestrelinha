## TC-FUNC-018: Na sacola, o adicional diz "acompanha o" e o nome completo da joia, quebrando linha se preciso

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-05.1
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-02, passo 3
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** texto conferível; a quebra de linha se confere também no CH-07

### Objetivo

A cliente reconhece, na sacola, a qual joia cada peça pertence.

### Pré-condições

- Conta: anonima
- Massa: M-06 (joia de nome longo com adicionais)
- Estado de partida: sacola vazia

### Condições reais

As da persona (390 × 844).

### Passos

1. Levar o conjunto de M-06 e abrir a gaveta
   - **Esperado:** a linha de cada adicional diz "Acompanha o <nome completo de M-06>", sem corte por reticências, quebrando linha dentro da gaveta, sem rolagem lateral

### Esperado e fonte

Fonte: PRD CA-05.1 ("com o nome completo do produto principal, que quebra de linha quando preciso").

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| `/carrinho` | abre a página da sacola | a mesma frase |
