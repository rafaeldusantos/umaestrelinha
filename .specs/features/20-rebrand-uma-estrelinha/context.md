# Contexto — 20 · Rebrand Uma Estrelinha

Decisões tomadas com o usuário na abertura da feature (2026-08-08). Cada uma fechou uma área
cinzenta que teria mudado materialmente o trabalho. Este arquivo é a fonte das restrições que a
`spec.md` traduz em requisito.

---

## O ponto de partida

Este diretório (`c:/Projetos/uma-estrelinha/store`) é uma **cópia sem git** do monorepo
`nanapin-store` — a loja Nanita de bottons de cultura pop, fechada na feature `19-identidade-papelaria`
com 979 testes na loja, `tsc` zerado nos dois apps e lint em 30 err / 9 warn.

O `.git` ficou em `/c/Projetos/nanapin-store`; aqui não há histórico nenhum.

## O destino

**Uma Estrelinha** — joias afetivas artesanais em resina, feitas à mão por Adri Muniz em Porto
Alegre/RS, incorporando material do cliente: **cinzas de cremação, leite materno, cabelo, pelos de
pet, dente de leite, placenta, flores**. Tom sensível, memorial, humanizado. Hoje a loja roda em
**Nuvemshop** (`umaestrelinha.com.br`).

**Isto não é um rebrand — é troca de domínio de negócio.** Um pin de cultura pop se compra e chega;
uma joia afetiva exige que a cliente **envie um material insubstituível pelo correio**. Essa
diferença é a origem de quase todo requisito não-cosmético desta feature.

## Ativos que já existem e não devem ser reinventados

| Ativo | Onde | O que é |
| --- | --- | --- |
| Design system | `../landing-pages/src/styles/global.css` | Tokens exportados do Paper: paleta, tipografia, escala, espaçamento, raios |
| Boards do produto | Paper, arquivo **Uma Estrelinha** (`01KVZTRJXYB9S4M2EXA8BSV5EW`) | `5MC-0` / `6AU-0` "Loja — Como Enviar o Material" (desktop + mobile), completos |
| Marca em vetor | Paper, `78R-0` "Logotipo oficial completo" + `734-0` + `6RF-0` | Logotipo completo (símbolo + tipografia + assinatura), versão negativa, **selo circular** 420px |
| Logo raster | `../landing-pages/public/` | `uma-estrelinha-logo.png`, `logo-uma-estrelinha-white.webp`, `favicon.svg` |
| Cliente Nuvemshop | `../landing-pages/src/lib/nuvemshop.ts` | Auth, paginação, retry/backoff, normalização de produto |
| Credenciais Nuvemshop | `../landing-pages/.env` | `NUVEMSHOP_STORE_ID`, `NUVEMSHOP_ACCESS_TOKEN`, `NUVEMSHOP_USER_AGENT` — **preenchidas** |
| Conteúdo de linha | `../landing-pages/src/content/categorias/uma-estrelinha.json` | Copy institucional, contatos, FAQ, provas sociais |

**Os dois node IDs informados na abertura (`516-0` "Home Loja — Desktop (re-skin)" e `5I2-0` "Kit de
Ícones Custom") existem como frames nomeados mas estão VAZIOS** — zero filhos via MCP. A referência
visual utilizável hoje é a `5MC-0`/`6AU-0`, que já traz header, nav, breadcrumb, hero, seções,
newsletter e footer na identidade nova. A home re-skinada entra quando o board for desenhado.

---

## Decisões

### C-01 · Renomear TUDO, inclusive o identificador técnico

`@nanapin/*` → **`@estrelinha/*`**; tokens `--nana-*` / `--nanita-*` → **`--estrelinha-*`**;
`project_id` → `uma-estrelinha-store`; chaves de `localStorage`/`sessionStorage` → prefixo
`estrelinha-`; `admin@nanapin.dev` → `admin@umaestrelinha.dev`.

**Por que a proibição do `CLAUDE.md` não se aplica.** Aquela regra existe para proteger o carrinho e
a wishlist de clientes **vivos** da Nanita, que ficariam órfãos se as chaves mudassem. A Uma
Estrelinha não tem um único navegador com estado desta loja — o risco que a regra protege não existe
aqui. O `CLAUDE.md` deste repo passa a dizer o contrário, com este motivo registrado.

### C-02 · Domínio: rebrand + limpeza de botton + modelagem de joia afetiva + **remoção dos Mockups**

O Mockup Studio inteiro sai: loja, backoffice, `@estrelinha/core`, tipos, tabela e bucket. Ele gera
mockup de **botton** (relevo, cartela, alfinete) — não tem leitura possível no domínio de joia.

### C-03 · Modelagem de joia afetiva vai até o rastreio do material no pedido

Não basta a página institucional. O escopo inclui: campos por item no carrinho (material declarado,
personalização de texto, eixo de metal) **e** um estado de material por pedido no backoffice
(`aguardando material` → `material recebido` → `em produção`), com e-mail transacional.

### C-04 · Import da Nuvemshop: catálogo + imagens para o Storage, one-shot

Categorias, produtos, variantes, preços e imagens — as imagens **baixadas e regravadas no Supabase
Storage**, para a loja nova não depender de uma conta que pode ser cancelada. Depois do import, o
Supabase é a fonte da verdade.

**Clientes e histórico de pedidos ficam para uma feature futura** — registrar no `BACKLOG.md` com o
motivo (dado pessoal/LGPD, reconciliação de identidade, superfície de erro grande).

### C-05 · Backoffice: só renomear tokens; o visual do admin fica

A paleta roxo/rosa/navy de `packages/ui` permanece, com os tokens renomeados. Painel interno não
precisa carregar marca, e a separação de temas entre os dois apps já está travada por
`importOrder.test.ts`. O re-skin do admin vai para o `BACKLOG.md` com decisão registrada.

### C-06 · `git init` novo + arquivar as specs da Nanita

Repositório novo, commit inicial "baseline herdada da Nanita". As 19 specs, `docs/qa/` e `.lovable/`
vão para `.specs/archive/nanita/`. O `STATE.md` **mantém** as decisões `AD-001`..`AD-015` — todas
seguem válidas (pagamento, e-mail, categorias, descontos não dependem do domínio de produto).

### C-07 · A loja vai substituir a Nuvemshop; preservar slugs e URLs

O importador **preserva o slug da Nuvemshop** e a feature inclui redirects, para não queimar o SEO
orgânico que as landing pages estão alimentando. `product_redirects` já existe no schema
(`20260801120300`); redirect de **categoria** não existe e precisa nascer.

### C-08 · Credenciais de produção: algumas existem, chegam durante a execução

Desenvolvimento roda contra Supabase local, Mercado Pago em sandbox e e-mail no Mailpit. Cada
credencial de produção tem o passo exato de troca documentado. O usuário fornece conforme sai.

### C-09 · Uma paleta só na loja — sem tema por categoria

As landing pages seguem com os 4 temas (`uma-estrelinha`, `leite-materno`, `dente-de-leite`, `pet`)
porque cada uma é página de entrada isolada. Dentro da loja, trocar cor a cada categoria confunde a
navegação e multiplica por 4 toda checagem de contraste — com um carrinho podendo conter itens de
linhas diferentes, não existe resposta certa para "de que cor é esta tela".

### C-10 · Nomenclatura: `@estrelinha/*` e `--estrelinha-*`

Repo `uma-estrelinha-store`, `project_id` `uma-estrelinha-store`, `localStorage` `estrelinha-cart`.

### C-11 · Supabase local na faixa 54341–54349

Levantamento dos `config.toml` da máquina em 2026-08-08:

| Faixa | Projeto |
| --- | --- |
| 54320–54329 | `nanapin-store`, `Volú`, `Numbuz` |
| 54330–54339 | `EducaPro/ingressos` |
| **54340–54349** | **livre — Uma Estrelinha** |

Apps em **8082** (loja) e **8083** (backoffice); `inspector_port` **8085**.

---

## O que a medição da paleta já revelou

Contraste WCAG 2.1 medido sobre `--color-ground #FAF8F4`:

| token | ratio | consequência |
| --- | --- | --- |
| `ink #23303A` | 12,73:1 | AAA — texto primário |
| `ink-soft #54616B` | 6,00:1 | AA — texto secundário, é o piso |
| `primary #34495E` | 8,76:1 | AA — link, botão primário, aba ativa |
| `primary-strong #283A4A` | 11,03:1 | hover/pressed |
| `accent #B8945F` (ouro) | **2,66:1** | **nunca texto, nunca borda de campo** |
| `accent-strong #A07E4C` | **3,55:1** | detalhe gráfico ≥24px e borda — **não** texto de corpo |
| `line #E6DFD4` | **1,25:1** | divisor apenas |
| `serenity #DCE6EC` | 1,19:1 | faixa/palco — nunca texto |
| `on-primary #F7F3EC` sobre `primary` | 8,40:1 | texto sobre superfície escura |

**O DS herdado não tem token de borda de campo.** As landing pages quase não têm formulário; a loja
tem checkout inteiro. `line` a 1,25:1 falha a WCAG 1.4.11 (contorno de controle pede 3:1) e `accent`
a 2,66:1 também. É exatamente o defeito que a Nanita já pagou e resolveu criando `--nanita-rule`
(Papelão, 3,95:1), guardado por `fieldBorder.test.ts`. Nasce token equivalente aqui, com teste.
