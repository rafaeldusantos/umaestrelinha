# CH-04 · A dona cola texto e endereço de outros lugares

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | exploratório |
| Prioridade   | P1 |
| Persona      | PER-01 Adri |
| Tour         | Paste |
| Modo         | por técnica (valor limite) |
| Time-box     | 60 min · orçamento: 50 ações |
| Mudança      | as recusas da tela: destino externo pela régua do Banner principal (que agora recusa `//` e `/\`), rótulo sem destino, tetos 40 / 60 / 20 e 90 somados (UC-01, UC-03, CA-04) |
| Viewport     | 1440 × 900 |
| Massa        | **só lê**: altera o rascunho na tela e **não salva**. Ao terminar, sai da tela descartando (recarrega e confirma a perda das alterações). Se salvar por engano, devolve o manifesto e registra no log |
| Driver       | — |
| Entrada      | `http://localhost:8083/admin/faixa-de-avisos` · logada como `admin-loja`; a faixa do manifesto gravada |
| Jornadas     | J-01 (ramo J-01a) |
| TC           | TC-FUNC-003, TC-FUNC-004, TC-FUNC-008 |

## Missão

Achar qualquer jeito de um texto ou endereço colado de fora (Instagram, barra do navegador, planilha) passar pelo painel e virar um aviso cortado, um link para fora da loja ou um "Ver ofertas" que não leva a nada — e conferir que cada recusa diz à Adri o que corrigir.

## Deve tentar

1. Colar endereços completos e com duas barras no Destino, no aviso de texto e no de imagem.
2. Colar o texto mais longo possível, até a recusa dos 90, e um caractere a mais.
3. Escrever o rótulo sem destino, e o destino sem rótulo.

## Edge cases sugeridos

- Colar de editor de texto: aspas curvas e travessão no texto
- Colar de planilha: quebra de linha e tabulação no texto
- URL em campo de texto: `https://…` no destaque
- Emoji no destaque
- Espaço no começo e no fim do caminho
- Enviar vazio: aviso sem destaque e sem texto

## Fora do escopo

- Salvar — esta sessão não grava
- Montar a faixa do zero: CH-01
- A régua de destino no Banner principal e no Menu (`/admin/home`, `/admin/menu`): a mudança vale lá também (H-12), mas este charter fica na faixa — o que vir lá é sugestão de backlog
- Tom do texto livre (exclamação, "últimas unidades"): o painel não impede (RN-03) — não é achado
- O `InfoBanner` de erro de leitura: conhecido
