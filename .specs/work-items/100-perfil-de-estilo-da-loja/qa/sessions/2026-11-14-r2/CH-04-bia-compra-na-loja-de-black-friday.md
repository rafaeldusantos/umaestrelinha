# Sessão CH-04 · Bia percorre a loja de Black Friday do celular ao computador

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-04-bia-compra-na-loja-de-black-friday.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-02 Bia · conta: anonima                                            |
| Tour · modo | Feature · por cenário (J-03) — rodada de confirmação, só o TC-FUNC-009 |
| Rodada      | confirmação (rodada 2)                                                 |
| Orçamento   | 35 ações de browser de 35                                              |
| Ambiente    | http://localhost:8182 · build não exposto · Chromium (agent-browser 0.39.1) · viewports 390 × 844, 1440 × 900 |
| Paridade    | dev server local; rotas `*.supabase.co` e `**/g/collect*` abortadas; perfil salvo Black Friday (S1, `data-perfil="black-friday"` lido no `<html>` em todas as cargas) |

## Missão

Como cliente no celular, confirmar que dá para ir da Home ao checkout com a loja de preto e ouro lendo tudo — e que o
desconto continua saltando aos olhos —, procurando texto que sumiu no fundo, selo de oferta confundido com os outros e
a marca com a cor errada. Nesta rodada: só o TC-FUNC-009, que ficou `blocked` por massa na rodada 1.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | em 390, busca "prata 925" (`/busca?q=prata 925`) e procura cartão em oferta | 3 cartões com selo de desconto de/por: Corrente Veneziana "-11%" (R$ 74,90 · R$ 84,00), Joia Afetiva Esfera com Cinzas "-9%" (R$ 199,90 · R$ 219,90), Pingente Afetivo Esfera com Leite Materno "-9%". Os três: fundo `#C2A063`, texto `#161514`, 12 px, sólido (opacidade 1, sem imagem de fundo). Outros 4 cartões trazem o selo da campanha "DIA DAS MÃES −15%/−10%" (`#6E2433` sobre `#F6DCD8`), do WI 102, fora do escopo | `screenshots/2026-11-14-r2/CH-04-01-cartao-busca-390.png` |
| 02 | procura "Novo"/"Últimas" em `/busca?sort=novidades` | a lista não trouxe nenhum cartão na leitura (0 links de produto lidos, sem espera própria); não repetido por orçamento | — |
| 03 | abre a Corrente Veneziana (o cartão com "-11%") | a página mostra "R$ 74,90 · R$ 69,66 com Pix ou 3x de R$ 24,97", tamanho 45cm/50cm, **sem "De R$ 84,00" e sem selo "-X%"** — ver A-1 | `screenshots/2026-11-14-r2/CH-04-02-produto-390.png` |
| 04 | abre a Joia Afetiva Esfera com Cinzas (o cartão com "-9%", candidata do briefing) | "R$ 199,90 · R$ 185,91 com Pix ou 4x de R$ 49,98", tipo Prata 925, **sem "De R$ 219,90" e sem selo** — A-1 reproduzido no segundo produto | `screenshots/2026-11-14-r2/CH-04-03-produto-cinzas-390.png` |
| 05 | em 1440 × 900, repete a busca "prata 925" | os mesmos 3 cartões com "-11%"/"-9%": fundo `#C2A063`, texto `#161514`, 12 px | — |

**Edge cases tentados:** nada (rodada de confirmação)

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-009 | pass | 01, 05 (e r1 03, 15) | `screenshots/2026-11-14-r2/CH-04-01-cartao-busca-390.png`; r1: `screenshots/2026-11-14-r1/CH-04-03-produto-ouro-branco-390.png`, `CH-04-11-produto-1440.png` | Passo 1 (cartão da lista): `#C2A063`/`#161514` sólido em 390 e 1440 — desbloqueado. Passo 3 (galeria): ouro com texto escuro na rodada 1, em 390 e 1440, na variação com de/por; nesta rodada os produtos cujo cartão mostra "-X%" abrem sem de/por e sem selo (A-1, preço, não cor — não muda o veredito). Passo 2 ("Novo"/"Últimas" no papel de sempre): nenhum desses selos encontrado nas listas lidas — não conferível, sem selo que tenha virado ouro. Barra do frete não refeita (TC-FUNC-010 passou na r1) |

Contagem: pass 1 · fail 0 · blocked 0 · skip 0

## Achados

### A-1 · [Produto] O cartão anuncia "-X%" e "de/por", e a página do produto abre sem o desconto — para a cliente que clicou na oferta

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-02 Bia                                                            |
| Jornada e passo     | J-03, passo 3 (abre o produto em oferta) · passos 03 e 04 do log      |
| TC                  | TC-FUNC-009 (passo 3, entorno)                                        |
| Gravidade proposta  | low — o preço cobrado é o mesmo do cartão; a Bia só perde a confirmação do desconto que a fez clicar. Não é regressão do WI 100 comprovada (é preço, não cor) nem critical/high ⇒ sugestão de backlog |
| Reproduziu          | sim (2 produtos, 2 de 2)                                              |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Anônima, sacola vazia, perfil Black Friday salvo; abrir `http://localhost:8182/busca?q=prata%20925` em 390 × 844
2. Ver o cartão "Corrente Veneziana em Prata 925": "-11%", R$ 74,90, R$ 84,00
3. Abrir o produto (`/produtos/corrente-veneziana-em-prata-925`)

**Esperado:** a página mostra o mesmo de/por e o selo "-X%" da galeria com o fundo e o texto do cartão — **fonte:** TC-FUNC-009, passo 3

**Observado:** "R$ 74,90 · R$ 69,66 com Pix ou 3x de R$ 24,97 sem juros", sem "De R$ 84,00" e sem selo na galeria. O mesmo em `/produtos/joia-afetiva-com-cinzas-de-cremacao-esfera-prata925` (cartão "-9%", R$ 199,90 de R$ 219,90; página "R$ 199,90" sem de/por nem selo). Hipótese de quem lê a tela: o cartão usa o de/por de uma variação e a página abre noutra (45cm / Prata 925) que não o tem; não conferido escolhendo outra variação (orçamento)

**Evidência:**

- `screenshots/2026-11-14-r2/CH-04-01-cartao-busca-390.png` — o cartão com "-11%" e o de/por
- `screenshots/2026-11-14-r2/CH-04-02-produto-390.png` — a página da Corrente Veneziana sem de/por nem selo
- `screenshots/2026-11-14-r2/CH-04-03-produto-cinzas-390.png` — a página da Joia Esfera com Cinzas sem de/por nem selo
- console: não lido
- rede: não lido

## Spec-gaps

nada

## Fora da cobertura

- Comparação de A-1 com a loja de antes (`http://localhost:8092`) — orçamento; decide se A-1 é pré-existente (provável: o WI troca cores, não preço)
- Escolher a outra variação (50cm) na página da Corrente Veneziana para ver se o de/por e o selo aparecem — orçamento
- Selo "-X%" da galeria nesta rodada — nenhum produto aberto mostrou de/por na variação padrão; vale a evidência da r1 (variação "Folheado a Ouro Branco", 390 e 1440)
- "Novo"/"Últimas" e "-X%" + "Novo" no mesmo cartão — nenhum cartão com esses selos nas listas lidas (`/busca?sort=novidades` não trouxe produtos na leitura, sem nova tentativa por orçamento)
- Barra do frete grátis na sacola em 390 e 1440 — orçamento (gasto em achar o cartão e em A-1); a barra passou na r1 (TC-FUNC-010, `#9A7A45`, parcial e completa, 390). A nota do briefing sobre o botão da barra fixa do celular não foi testada: nenhuma peça foi posta na sacola
- Screenshot do cartão em 1440 — orçamento (os valores computados estão no passo 05)

## Debrief

- **Surpresas:** os candidatos do briefing com de/por na variação 1 não abrem com o desconto na página; o cartão mostra "-X%" mas a página não (A-1)
- **Próximo charter:** conferir A-1 na loja de antes (8092) e trocando a variação; barra do frete em 1440 e o botão da barra fixa em 390
- **Padrão novo:** comparar o preço do cartão com o da página do produto que ele abre
