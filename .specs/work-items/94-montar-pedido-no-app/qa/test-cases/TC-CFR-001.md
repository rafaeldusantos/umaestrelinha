## TC-CFR-001: No celular, a montagem e o pedido montado não rolam de lado e os alvos têm 44 px, com a fonte a 100, 130 e 200 %

**Tipo:** cfr
**Prioridade:** P1
**Origem:** exploratório — convenção do projeto (mobile primeiro; 390 a 100/130/200 %, alvos de 44 px); spec Obrigações transversais
**Autor:** dev
**Persona:** PER-03 Adri com a fonte grande
**Jornada:** J-01 e J-04, todos os passos
**Charter:** CH-08
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** jsdom não mede layout; só o browser prova

### Objetivo

A Adri alcança todo botão com o dedo e lê tudo sem rolar de lado, com a fonte que ela usa.

### Pré-condições

- Conta: `admin-atelie`
- Massa: nome de cliente e de joia longos; 4 peças no cartão de Montados
- Estado de partida: `/pedidos`

### Condições reais

| Dimensão    | Valor                                    |
| ----------- | ---------------------------------------- |
| Dispositivo | celular 390 × 844 (e 320 × 568)          |
| Modalidade  | toque                                    |

### Categoria

Compatibilidade (viewport, fonte) e usabilidade.

### Metas

| Observável | Alvo | Aceitável |
| ---------- | ---- | --------- |
| `scrollWidth` do `body` | = largura da viewport em toda tela e folha | — |
| altura do alvo de toque | ≥ 44 px | — |
| barra fixa com o teclado aberto | o campo focado e o botão visíveis | o campo visível rolando |
| chip "Montados · N abertos" e cartão escuro do link | texto inteiro, sem corte | quebra em duas linhas sem cobrir nada |

### Passos

1. Percorre J-01 e J-04 a 100 %, 130 % e 200 %
   - **Esperado:** as metas em cada passo e em cada folha (colar texto, variação, sair com três botões, cancelar, renovar, observação)

### Esperado e fonte

Fonte: CLAUDE.md da raiz › Convenções (mobile); spec Obrigações transversais; qa-report › "O que só o navegador prova".

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| girar o celular | 844 × 390 no passo 2 | a folha e o estado ficam |
