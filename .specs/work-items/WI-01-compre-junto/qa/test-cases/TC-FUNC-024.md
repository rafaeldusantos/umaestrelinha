## TC-FUNC-024: Na forma "Em folha", as escolhas abrem numa folha (celular) ou diálogo (computador) que cuida do foco

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-09.1, CA-09.5
**Autor:** dev
**Persona:** PER-03 Helena
**Jornada:** J-04, passo 3 e ramo J-04a
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** foco e Esc são conferíveis pela árvore de acessibilidade

### Objetivo

Quem usa só o teclado entra e sai da folha sem se perder.

### Pré-condições

- Conta: anonima
- Massa: M-01; forma "Em folha" gravada
- Estado de partida: sacola vazia

### Condições reais

As da persona (1440 com zoom 200%, só teclado); repetir a folha em 390.

### Passos

1. Ir ao adicional A1 com Tab e abrir as escolhas com Enter
   - **Esperado:** abre um diálogo (computador) / folha (390) com o nome do adicional no cabeçalho; o foco no título
2. Fechar com Esc, sem completar
   - **Esperado:** fecha; o foco volta ao controle que a abriu; A1 não fica marcado incompleto
3. Abrir de novo, completar e "Incluir no conjunto"
   - **Esperado:** "Incluir no conjunto" só habilita com a escolha completa; ao incluir, A1 fica marcado e o total atualiza

### Esperado e fonte

Fonte: PRD CA-09.1, CA-09.5; protótipo da loja (forma B).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| clique fora | fecha clicando fora | igual a Esc |
| voltar do navegador | volta com a folha aberta | registrar: folha presa ou fechada, marca fantasma (sem esperado na fonte) |
