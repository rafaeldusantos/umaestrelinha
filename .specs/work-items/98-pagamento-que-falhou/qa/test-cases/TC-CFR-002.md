## TC-CFR-002: Registrar e desfazer funcionam só pelo teclado, com rótulos e recusas anunciados

**Tipo:** cfr
**Prioridade:** P2
**Origem:** exploratório — checagem rápida de acessibilidade (WCAG 2.1 AA) na tela nova e no desfazer
**Autor:** dev
**Persona:** PER-01 Adri no celular
**Jornada:** J-01 e J-02
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** teclado e snapshot de acessibilidade; leitor de tela real fora

### Objetivo

A tela nova não depende de mouse nem de olhar a cor para ser entendida.

### Pré-condições

- Conta: `admin`
- Massa: M6, M7
- Estado de partida: `/admin/pedidos/:id/pagamento` em 1440

### Condições reais

| Dimensão    | Valor                                            |
| ----------- | ------------------------------------------------ |
| Dispositivo | desktop 1440                                     |
| Modalidade  | só-teclado                                       |

### Categoria

Acessibilidade.

### Metas (observável · alvo · aceitável)

| Observável | Alvo | Aceitável |
| --- | --- | --- |
| Rótulos | meio, data e hora, observação e comprovantes com rótulo associado | — |
| Campo de arquivo | alcançável por Tab e acionável por Enter/Espaço, com nome | — |
| Recusa de arquivo/data | anunciada (`alert`/`status`/região viva) e não só por cor | — |
| Foco | visível; depois de confirmar, vai a um lugar do pedido (não ao `<body>`) | — |
| Portão e desfazer | Esc fecha; o foco volta a quem abriu | — |
| Movimento reduzido | nenhuma animação decorativa | — |

### Passos

1. Registra só pelo teclado
   - **Esperado:** dentro das metas
2. Provoca a recusa de data e de arquivo
   - **Esperado:** recusas anunciadas
3. Desfaz só pelo teclado
   - **Esperado:** dentro das metas

### Esperado e fonte

Checagem WCAG rápida — fonte: guia de CFR da skill; regra de foco do painel (`shared/lib/foco.ts`).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| — | — | — |
