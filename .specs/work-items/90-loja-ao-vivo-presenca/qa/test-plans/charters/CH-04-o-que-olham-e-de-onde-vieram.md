# CH-04 · O que estão olhando, de onde vieram e em que aparelho

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | exploratório |
| Prioridade   | P1 |
| Persona      | PER-01 Adri |
| Tour         | Feature |
| Modo         | por técnica (partição: 0 · 1 · 5 · 6 joias; cada faixa de origem; cada aparelho) |
| Time-box     | 60 min · orçamento 50 ações |
| Mudança      | bloco C "Joias sendo vistas agora" com o Guia de envio do material (LAV-30, LAV-31, LAV-32); bloco D "De onde vieram" (LAV-40); bloco E "No celular" em linha inteira (LAV-45, D-19); nenhum dado que identifique a cliente (LAV-65) |
| Viewport     | 390 × 844 no app; a loja em contextos com UA de iPhone, de iPad e de computador |
| Entrada      | app: http://localhost:8084/ao-vivo como `admin-atelie`; loja em contextos separados |
| Jornadas     | J-02 |
| TC           | TC-FUNC-009, TC-FUNC-010, TC-FUNC-011, TC-FUNC-012, TC-FUNC-013, TC-SEC-005 |

**Ambiente:** o mesmo do CH-01. Massa: pelo menos 6 joias ativas com foto e nomes que empatem em número de
pessoas. As origens se simulam no pouso: `?utm_source=instagram|google|whatsapp`, o cabeçalho `Referer` de
`https://l.instagram.com/`, `https://www.google.com/`, `https://wa.me/`, um referrer qualquer de outro site
(Outros) e nenhum (Direto). Para TC-SEC-005, uma cliente **logada** na loja, com nome e e-mail conhecidos.

## Missão

Confirmar que a Adri vê quais joias estão sendo vistas (com foto, nome e quantas pessoas), o Guia quando alguém
está nele, de onde cada pessoa veio e quantas estão no celular — e nada que diga quem é a pessoa.

## Deve tentar

1. Seis contextos em seis joias diferentes, com empates: só 5 joias, ordem por pessoas e empate por nome
2. Uma pessoa só no Guia de envio do material; depois Guia + joias
3. Uma pessoa por faixa de origem, e uma que navega depois do pouso (a faixa fica a do pouso)
4. Contextos de celular, tablet e computador: "{m} de {n}" e "o resto pelo computador ou tablet"

## Edge cases sugeridos

- Pessoa numa categoria, na busca e na sacola (não entram em C)
- Joia com nome longo a 390 (não pode rolar de lado)
- Joia sem foto
- Todos no celular ("o resto…" some)
- Ninguém na loja: C, D e E com as frases de vazio
- Cliente logada com nome — nada dela no app

## Fora do escopo

- Cidades (LAV-48) — fora do Work Item; a grade de E fica sem a célula de Cidades (D-19)
- A página do produto e o Guia na loja em si — a mudança só lê de onde a pessoa está
- O bloco B e o número grande (CH-01); Acessos (CH-05)
