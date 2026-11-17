# CH-05 · CFR — o editor de cor e o rótulo colorido na loja

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | cfr                                                                           |
| Prioridade   | P1                                                                            |
| Persona      | PER-01 Adri, a dona                                                           |
| Tour         | —                                                                             |
| Modo         | —                                                                             |
| Time-box     | 45 min · orçamento 35 ações                                                   |
| Mudança      | o seletor de ícone em dois grupos e o bloco "Cor do texto" do editor (C-04, C-06, C-07); o rótulo colorido e o ícone do sistema na barra e na folha da loja (C-03, C-06) |
| Viewport     | painel 1440 × 900, também a 130% e 200% de fonte e a 390 × 844 (abas "Itens do menu" / "Prévia"); loja 390 × 844, 768 × 1024, 1440 × 900 |
| Massa        | altera o menu: só o item C, devolvido **sem cor** no fim; lê A e B            |
| Driver       | —                                                                             |
| Entrada      | `/admin/menu` (`http://localhost:8083`) · logada como `admin`; depois `/` na loja (`http://localhost:8082`), pública |
| Jornadas     | J-01, J-02                                                                    |
| TC           | TC-CFR-001, TC-CFR-002                                                        |

## Missão

Refazer como auditoria a montagem do destaque pela dona e a leitura dele na folha do celular, conferindo se o editor de cor se usa só com teclado e com fonte grande, e se o rótulo colorido se lê e cabe em todas as larguras.

## Deve tentar

1. No editor do item C, só com teclado: chegar ao seletor de ícone, buscar, escolher; chegar aos dois campos de cor, ao hex e ao "Usar a cor padrão"; ouvir pela árvore de acessibilidade o nome de cada campo e se a recusa é anunciada
2. Repetir a 200% de fonte e a 390 × 844 no painel: nada cortado, os campos e o seletor alcançáveis, alvos ≥ 44 px
3. Na loja (a dona conferindo a vitrine dela, como no passo 8 da J-01): contraste computado do rótulo de A e B em cada superfície; rolagem horizontal a 390, 768 e 1440
4. Devolver o item C sem cor

## Edge cases sugeridos

- Movimento reduzido
- Viewport mínima 320 × 568 na loja
- Zoom 200% na barra do computador (1280 a 200% ≈ 640 de largura)
- Recusa seguida de correção: o que foi digitado continua?

## Fora do escopo

- Elementos do painel e da loja que a mudança não tocou, mesmo na mesma tela (lista do menu, banners, chrome da loja) — o que aparecer ali é `pré-existente`
- Leitor de tela real — fora do browser da sessão; registre em Fora da cobertura
- Safari, Firefox e browsers móveis reais — só o engine do driver

## CFR

**Jornadas:** J-01, J-02 — a J-01 é a maior superfície nova (seletor em dois grupos, editor de cor, recusa, prévia); a J-02 é a superfície que responde por ≈90% dos acessos. A loja na J-02 é pública: a dona a confere sem trocar de conta, como faz no passo 8 da J-01.

| Categoria             | Na rodada | Por quê, se fora                           |
| --------------------- | --------- | ------------------------------------------ |
| Usabilidade           | sim       |                                            |
| Acessibilidade        | sim       |                                            |
| Performance percebida | sim       |                                            |
| Compatibilidade       | sim       |                                            |
| Recuperação de erro   | sim       |                                            |
| Paridade com produção | sim       | sempre — é a condição da rodada            |
