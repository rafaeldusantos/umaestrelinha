## TC-CFR-002: Folhas, barra e marcas de leitura são operáveis e anunciadas pela árvore de acessibilidade

**Tipo:** cfr
**Prioridade:** P1
**Origem:** exploratório — acessibilidade das telas novas (WCAG 2.1 AA, checagem rápida)
**Autor:** dev
**Persona:** PER-03 Adri com a fonte grande
**Jornada:** J-01, J-04
**Charter:** CH-08
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** leitor de tela real fora do alcance

### Objetivo

O que a tela diz com cor ou posição também é dito pela tecnologia assistiva.

### Pré-condições

- Conta: `admin-atelie`
- Estado de partida: `/pedidos/montar`

### Condições reais

| Dimensão    | Valor                         |
| ----------- | ----------------------------- |
| Modalidade  | só-teclado + snapshot de acessibilidade |

### Categoria

Acessibilidade.

### Metas

| Observável | Alvo | Aceitável |
| ---------- | ---- | --------- |
| foco ao abrir/fechar folha | entra na folha; volta ao gatilho | — |
| motivo do botão desligado | no nome/descrição acessível do botão | — |
| "Lido do texto — confira." | associada ao campo | — |
| toasts e erros | região viva (`status`/`alert`) | — |
| controles | nome que descreve a ação ("Fechar a montagem", "Passo n: Nome", "Editar <nome>", "Remover <nome>") | — |
| movimento | sem animação decorativa com `reducedMotion: reduce` | — |

### Passos

1. Percorre J-01 só pelo teclado, conferindo o snapshot a cada folha
   - **Esperado:** as metas
2. Repete o pedido montado (J-04)
   - **Esperado:** as metas; Esc ou voltar fecha a folha

### Esperado e fonte

Fonte: cfr.md › Acessibilidade; spec Design (os nomes acessíveis); `apps/mobile-adm/CLAUDE.md` › Montar pedido (`aria-describedby`).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| contraste do cartão escuro | lê as cores computadas | ≥ 4,5:1 |
