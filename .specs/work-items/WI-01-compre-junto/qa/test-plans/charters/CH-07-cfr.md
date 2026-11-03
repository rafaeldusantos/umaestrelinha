# CH-07 · CFR — montar o conjunto (J-01) e fechar o pedido (J-02)

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | cfr                                                                           |
| Prioridade   | P1                                                                            |
| Persona      | PER-03 Helena                                                                 |
| Tour         | —                                                                             |
| Modo         | —                                                                             |
| Time-box     | 45 min · orçamento: 35 ações                                                  |
| Mudança      | O bloco Compre Junto, a barra fixa com o conjunto e a frase "acompanha" na sacola. Critérios: CA-03.11, CA-03.12, RNF-01, RNF-02, RNF-05, RNF-06 |
| Viewport     | 390 × 844 (fonte 100%, 130% e 200%), 768 × 1024, 1440 × 900                   |
| Entrada      | `/produtos/<slug do pingente com três adicionais de nome longo>` · anônima, sacola vazia |
| Jornadas     | J-01, J-02                                                                    |
| TC           | TC-CFR-001, TC-CFR-002, TC-CFR-003, TC-CFR-004, TC-CFR-005                    |

## Missão

Refazer J-01 e J-02 como auditoria das qualidades que a cliente percebe no bloco — largura em 390, alvo de toque, teclado, anúncio, salto de layout, movimento e tom —, só sobre o que o Work Item mudou.

## Deve tentar

1. Em 390 com três adicionais de nome longo, a 100%, 130% e 200% de fonte: medir rolagem horizontal do body e a altura dos controles do bloco e da barra fixa.
2. Percorrer o bloco com Tab: nome acessível de cada caixa ("Levar junto: <peça>, <variação>"), ordem, foco visível, anúncio da falta de escolha.
3. Abrir a página com rede lenta e observar o espaço do bloco enquanto os adicionais carregam.
4. Ler todo texto do bloco e da barra fixa procurando urgência, contagem, escassez, prova social ou emoji.

## Edge cases sugeridos

- `reducedMotion: reduce` ao marcar e abrir as escolhas
- `colorScheme: dark` (cor fixa no código?)
- Viewport 320 × 568
- Zoom 200% em 1440

## Fora do escopo

- Elementos da página que o Work Item não tocou (galeria, frete, acordeão, cabeçalho da loja): o que aparecer ali é `pré-existente` — vai ao log, sem achado (o cabeçalho rolando de lado a 390/200% já é conhecido, `CLAUDE.md` › Estado conhecido)
- O painel (CFR do painel não está nesta rodada; a superfície principal da mudança é a loja)
- Leitor de tela real e outros browsers além do que o driver abrir

## CFR

**Jornadas:** J-01, J-02 — a maior superfície da mudança está na página do produto e no caminho do conjunto até o pedido.

| Categoria             | Na rodada | Por quê, se fora                           |
| --------------------- | --------- | ------------------------------------------ |
| Usabilidade           | sim       |                                            |
| Acessibilidade        | sim       |                                            |
| Performance percebida | sim       |                                            |
| Compatibilidade       | sim       |                                            |
| Recuperação de erro   | sim       |                                            |
| Paridade com produção | sim       | sempre — é a condição da rodada; registrar o desvio: ambiente local (Supabase :54441), dev server e não build de produção, PIX local possivelmente indisponível |
