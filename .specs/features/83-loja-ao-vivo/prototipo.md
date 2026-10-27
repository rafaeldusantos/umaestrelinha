# Protótipo — cartão do Início e tela "Loja ao vivo"

> Fonte: Claude Design, projeto `a780eec8-8aba-4d6e-8b4c-2c485e2750c7`, arquivo `Ateliê Admin.dc.html`
> (lido em 2026-10-26, etag `1793064028832969`, 1.526 linhas). Cópia decodificada, sem o script
> que o servidor de prévia injeta: [`prototipo/Atelie-Admin.dc.html`](prototipo/Atelie-Admin.dc.html).
> Link durável do editor: https://claude.ai/design/p/a780eec8-8aba-4d6e-8b4c-2c485e2750c7?file=Ateli%C3%AA+Admin.dc.html
>
> **O PRD manda sobre o protótipo.** Este arquivo descreve o protótipo com fidelidade, e a seção
> *Divergências* diz onde a feature `83` **não** o segue.

## Capturas (Chromium, viewport 390 × 844)

O protótipo desenha um aparelho de 412 × 892 com moldura. Para medir em 390, a moldura foi
reduzida a 390 × 844, sem cantos e sem padding (só CSS de inspeção; nenhum conteúdo alterado).
Sem rolagem horizontal do body nas duas telas (`scrollWidth` = 390).

| Arquivo | O quê |
| --- | --- |
| `prototipo/01-inicio-390.png` | Início inteiro acima da dobra |
| `prototipo/02-inicio-cartao-agora-na-loja.png` | o cartão "Agora na loja" (350 × 125 px) |
| `prototipo/03-ao-vivo-topo-390.png` | Loja ao vivo, topo (Fase 2+) |
| `prototipo/04-acessos-hoje.png` · `-ontem.png` · `-semana.png` | a seção Acessos nos três períodos |
| `prototipo/05-ao-vivo-fim-390.png` | Loja ao vivo rolada até o fim |

Os números "ao vivo" do protótipo são simulados (`setInterval` de 5 s, valor entre 3 e 12 com
passo aleatório), então as capturas mostram 7 no Início e 4 na tela — é o mock, não regra.

## Tokens que aparecem (resolvidos do design system no navegador)

| Token | Valor | | Token | Valor |
| --- | --- | --- | --- | --- |
| `ink` | `#23303a` | | `on-primary` | `#f7f3ec` |
| `ink-soft` | `#54616b` | | `on-ink` | `rgba(255,255,255,.62)` |
| `primary` | `#34495e` | | `on-ink-strong` | `rgba(255,255,255,.8)` |
| `primary-strong` | `#283a4a` | | `on-ink-border` | `rgba(255,255,255,.12)` |
| `accent` (dourado) | `#b8945f` | | `on-ink-surface` | `rgba(255,255,255,.08)` |
| `surface` | `#ffffff` | | `line` | `#e6dfd4` |
| `ground` | `#faf8f4` | | `ground-deep` | `#f1ebe1` |
| `field` | `#8c8073` | | `done` | `#3f5a3b` |
| `--font-display` | Libre Baskerville | | `--font-body` | Outfit |
| `--shadow-soft` | `0 14px 28px -10px rgba(52,73,94,.16)` | | | |

**Eyebrow** (padrão repetido em toda a tela): 11px, peso 600, `letter-spacing .1em`, caixa alta.
**Cartão** (padrão): fundo `surface`, borda `1px line`, raio **20px**, padding 16px.

---

## 1. Início — onde o cartão mora

Ordem no Início: faixa escura (`primary-strong`, padding `12px 20px 24px`) com logo, "Bom dia, Adri.",
a data, o seletor **Hoje / Ontem / Semana** (pílulas, 36px de altura, flex 1, gap 8; ligada =
fundo `on-primary`, texto `primary-strong`; desligada = transparente, texto `on-ink-strong`, borda
`on-ink-border`) e a grade 2×2 Faturamento · Vendas · Ticket médio · **Visitas** (eyebrow `on-ink`;
número display 700, 24px nas duas primeiras e 20px nas duas últimas) →
**o cartão "Agora na loja"** (wrapper com padding `16px 20px 0`) → "Precisa de você" (padding
`24px 0 8px`) → Vendas · 7 dias → … .

Valores de "Visitas" na faixa do protótipo: hoje **184**, ontem **212**, semana **1.240** (o
mesmo número que a tela chama "Visitas", não "Visitantes únicos" — ver Divergências).

## 2. Cartão "Agora na loja" (Início) — Fase 2 no protótipo

Elemento: **`<button>`** de largura inteira, `text-align:left`, fundo `surface`, borda `1px line`,
raio 20px, padding 16px, `box-shadow: var(--shadow-soft)`, layout `flex` alinhado ao centro com
`gap:14px`. Medido em 390: **350 × 125 px**. Toque → abre a tela "Loja ao vivo".

Três colunas, da esquerda para a direita:

1. **Texto** (`flex:1; min-width:0`, coluna com `gap:4px`):
   - eyebrow **"Agora na loja"** em `ink-soft`, precedido por um ponto de **8 × 8px** `accent`,
     redondo, `gap:8px`. O ponto é **estático** no protótipo (nenhuma animação).
   - linha do número (`align-items: baseline; gap:8px`): **`{n}`** em display 700, **30px**,
     `letter-spacing -0.02em`, cor `primary`; ao lado **"pessoa" / "pessoas"** 14px `ink-soft`.
   - linha 13px `ink-soft`: **"{x} com joia na sacola" / "{x} com joias na sacola"** e, se houver
     checkout, **" · {y} no checkout"**. Em 390 essa linha **quebra em duas** ("3 com joias na
     sacola · 1 no / checkout") — ver captura 02.
2. **Mini gráfico**: caixa 96 × 40px, `align-items:flex-end`, `gap:2px`, **15 barras** (`flex:1`,
   raio 2px). Altura = `max(3, round(v / max * 40))`. Cor: a última (atual) `accent`; as outras `line`.
3. **Chevron** `chevron-right` 20px, `ink-soft`.

Estados no protótipo: só o "carregado". **Não há** carregando, falha, zero pessoas nem a variante
da Fase 1 — esses vêm do PRD (LAV-03/LAV-04).

### 2.1 O que a Fase 1 entrega no lugar (PRD, LAV-04 e critério 7)

Mesma casca (botão, raio 20, padding 16, sombra, chevron, eyebrow com ponto), mas com o conteúdo
**"Visitas hoje"**: o número de `store_movement.periodos.hoje.visitas`, sem "pessoas", **sem**
linha de sacola/checkout, **sem** mini gráfico de minutos e **sem** a frase "Ao vivo em breve".
Nenhum número ao vivo. O cartão continua abrindo `/ao-vivo`. O desenho exato do eyebrow e da linha
de apoio da Fase 1 não existe no protótipo e é decisão de `design.md`.

---

## 3. Tela "Loja ao vivo"

Tela cheia por cima das abas (`position:absolute; inset:0; z-index:10`, fundo `ground`), **sem a
barra de abas**.

### 3.1 Cabeçalho (todas as fases)

Altura **60px**, fundo `surface`, borda inferior `1px line`, padding `0 8px`, `gap:6px`.
- Botão **voltar**: 44 × 44, redondo, transparente, ícone `chevron-left` 22px `ink`,
  `aria-label="Voltar"`. Volta ao Início.
- Título **"Loja ao vivo"**: display 700, **17px** (é um `<div>`, não `h1`; o PRD pede `h1`, LAV-62).
- Linha de frescor 12px `ink-soft`: **"Atualizado agora"** (menos de 2 s) / **"Atualizado há {s} s"**.

Corpo: rolagem vertical com padding **16px** e `gap:12px` entre blocos. Ordem dos blocos:

| # | Bloco | Fase |
| --- | --- | --- |
| 1 | Agora na loja (cartão `ink`) | 2 |
| 2 | O que estão fazendo | 2 |
| 3 | Joias sendo vistas agora | 2 |
| 4 | De onde vieram | 3 |
| 5 | No celular · Cidades (grade 2 colunas) | 3 · 4 |
| 6 | **Acessos** | **1** |

Na Fase 1 só existe o bloco 6 (e o cabeçalho). O PRD exige a seção Acessos sozinha.

### 3.2 Blocos da Fase 2+ (descrição resumida, para não serem antecipados)

1. **Agora na loja** — fundo `ink`, texto `on-primary`, raio 20, padding 20. Eyebrow com ponto
   `accent` em `on-ink-strong`. Número **56px** display 700, `line-height 1`, `letter-spacing -0.03em`,
   cor **`accent`** (ouro como texto sobre ink); ao lado 15px/300 `on-ink-strong`: "{pessoas} nos
   últimos 5 minutos". Gráfico de **30 barras**, 56px de altura, `gap:3px`, a última `accent`, as
   outras `on-ink-border`; legendas 11px `on-ink`: "30 min atrás" · "agora".
2. **O que estão fazendo** (h3 17px): quatro linhas (14px, número display 700 `primary`) com trilho
   de 6px `ground-deep` e barra (`transition: width 300ms`): "Olhando joias" (`field`), "Com joia na
   sacola" (`primary`), "No checkout" (`accent`), "Compraram (últimos 30 min)" (`primary`). Com
   checkout > 0, nota 13px `ink-soft` acima de uma borda `line`: **"Alguém está no checkout agora. Se
   a compra não fechar em 4 horas, a sacola aparece como abandonada no Backoffice."**
3. **Joias sendo vistas agora** (h3 17px): linhas com miniatura 40 × 40 raio 6 `ground-deep` e
   **ícone** (não foto) 22px `primary`, nome 14px, "{n} pessoa(s)" 13px `ink-soft`; separador
   `1px line` a partir da 2ª. Inclui "Guia de envio do material" com ícone `envio`.
4. **De onde vieram** (h3 17px): barra empilhada de 10px (raio pílula, `gap:2px`) + legenda 2×2
   (quadrado 10px raio 3): Instagram `primary`, Google `primary-strong`, WhatsApp `accent`, Direto
   `field`. Faixa com zero some.
5. Grade 2 colunas, `gap:12px`: **No celular** (eyebrow, número 20px display 700 `primary`
   "{m} de {n}", 12px "o resto pelo computador") e **Cidades** (eyebrow; linhas 13px nome · número
   `ink-soft`: Porto Alegre, São Paulo, Outras).

### 3.3 Seção **Acessos** — a Fase 1

Contêiner: `margin-top:12px` a mais (além do `gap:12px`), coluna com `gap:12px`. Medido em 390:
largura **358px**, altura ~544–559px.

1. **Título** `<h2>` **"Acessos"**, 20px, margem 0.
2. **Seletor segmentado** Hoje / Ontem / Semana: grade de 3 colunas iguais, `gap:4px`, padding 4px,
   fundo `ground-deep`, raio 12px. Cada botão: **40px** de altura, raio 6px, sem borda, 14px peso
   600. Ligado: fundo `surface`, texto `ink`, sombra `0 1px 2px rgba(35,48,58,.12)`. Desligado:
   transparente, texto `ink-soft`, sem sombra. Começa em **Hoje** e é **independente** do seletor
   do Início (estado próprio `accPeriod`). Trocar de período **não** relê.
3. **Quatro cartões** em grade **2 colunas fixas** (`1fr 1fr`, `gap:12px`), cartão padrão
   (raio 20, padding 16). Cada um: eyebrow `ink-soft`; número display 700 **22px** `primary`
   (`margin-top:8px`); linha de variação **12px** (`margin-top:4px`), **"+{p}% vs {anterior}"** em
   `done` quando ≥ 0 e **"−{p}% vs {anterior}"** (sinal U+2212) em `ink-soft` quando < 0. Percentual
   arredondado a inteiro. "{anterior}" = **ontem** (Hoje), **anteontem** (Ontem), **semana
   anterior** (Semana).

   | Período | Visitas | Visitantes únicos | Sacolas criadas | Conversão |
   | --- | --- | --- | --- | --- |
   | Hoje | 184 · −13% vs ontem | 142 · −15% vs ontem | 9 · +29% vs ontem | 2,1% · +77% vs ontem |
   | Ontem | 212 · +10% vs anteontem | 168 · +11% vs anteontem | 7 · −12% vs anteontem | 1,2% · +80% vs anteontem |
   | Semana | 1.240 · +12% vs semana anterior | 936 · +10% vs semana anterior | 41 · +14% vs semana anterior | 1,2% · +11% vs semana anterior |

   Conversão do protótipo = **vendas ÷ visitantes únicos** (hoje 3/142), formato pt-BR com até
   **1 casa decimal** ("2,1%"); a variação da conversão é relativa (2,1% contra 1,2% = +77%).
4. **Cartão do gráfico** (padrão, padding 16):
   - h3 17px: **"Visitas por horário"** (Hoje, Ontem) / **"Visitas por dia"** (Semana).
   - área de **120px**, barras alinhadas embaixo, `gap:6px`, cada coluna `flex:1; min-width:0`, em
     coluna com `gap:6px`: valor 11px/500 `ink-soft` em cima; barra com raio 6px e altura
     `max(4, round(v / máx * 84))` px; rótulo 11px/600 sem quebra embaixo.
   - **Hoje**: 8 faixas `0h 3h 6h 9h 12h 15h 18h 21h`; valores 12 · 4 · 18 · 46 · 52 · 52; a faixa
     **em andamento (15h)** em `accent` com rótulo `ink`; as passadas em `primary` com rótulo
     `ink-soft`; as **futuras (18h, 21h)** sem valor, barra de 4px em `line` (trilho vazio).
   - **Ontem**: as 8 faixas, todas `primary` (10 · 5 · 20 · 38 · 44 · 41 · 36 · 18), nenhuma dourada.
   - **Semana**: **7 dias corridos** terminando hoje (`sex sáb dom seg ter qua hoje` para uma
     quinta, 22/10): 168 · 142 · 151 · 190 · 193 · 212 · 184; "hoje" em `accent` com rótulo `ink`.
   - Nota 12px `ink-soft` (`margin-top:14px`): **"Faixas de 3 horas. A atual em dourado, ainda em
     andamento."** (Hoje) · **"Faixas de 3 horas."** (Ontem) · **"Últimos 7 dias. Hoje em dourado."**
     (Semana).
   - Barras sem animação no protótipo.

Estados da seção no protótipo: só o carregado. Carregando, falha, zero visitas, teto de 5.000 e
"Contando desde" vêm do PRD (LAV-51/LAV-54).

---

## 4. Divergências protótipo × PRD (vale o PRD)

| # | Protótipo | PRD / feature 83 | Ref. |
| --- | --- | --- | --- |
| D1 | Cartão do Início "Agora na loja" com pessoas, sacola/checkout e 15 barras | Fase 1: **"Visitas hoje"** com o número de `store_movement`, sem nada ao vivo, sem "Ao vivo em breve" | LAV-04, critério 7 |
| D2 | Quatro cartões: **Visitas** · **Visitantes únicos** · **Sacolas criadas** · Conversão | **Visitas** (= visitantes únicos) · **Com sacola** (Fase 2; **some na Fase 1**) · **Vendas** · Conversão | LAV-51 |
| D3 | "Visitas" (184) ≠ "Visitantes únicos" (142); a faixa do Início mostra 184 | Um número só, **idêntico** ao da faixa do Início para o mesmo período | LAV-51, critério 1 |
| D4 | Conversão = vendas ÷ visitantes únicos, sem caso de zero | vendas ÷ visitas, 1 casa, **"—" quando visitas = 0**; regra em `core` (`conversion`) | LAV-51, §6.3 |
| D5 | Semana = **7 dias corridos** ("Últimos 7 dias") | **Segunda até hoje**, a régua de `store_movement`; nota "Desde segunda-feira." | LAV-52, LAV-53 |
| D6 | Nota de hoje "A atual em dourado, ainda em andamento." | "Faixas de 3 horas, pela hora da primeira visita." | LAV-53 |
| D7 | Faixa "atual" e "hoje" decididas pelo relógio do protótipo | Janela, faixa em andamento e "hoje" vêm do **servidor** | LAV-61 |
| D8 | Seletor de Acessos começa sempre em Hoje, independente do Início | Começa no período escolhido no Início quando se chega de lá | LAV-50 |
| D9 | Seletor sem `aria-pressed` | Segmentado com `aria-pressed` | LAV-50 |
| D10 | Grade 2×2 fixa (`1fr 1fr`) | `auto-fit`, piso `9rem`, cai para 1 coluna com fonte grande | LAV-63 |
| D11 | Título "Loja ao vivo" é `<div>` 17px | `h1` em todos os estados; `document.title = "Loja ao vivo · Ateliê"` | LAV-62 |
| D12 | Sem teto nem "Contando desde" | "Mais de 5.000 visitas neste dia — o número é um mínimo." / "Contando desde {data}." | LAV-54 |
| D13 | Sem aviso de consentimento | Letra pequena: "Conta só quem aceitou cookies de estatística." | §7 |
| D14 | Sem estados de carregando / falha / vazio | Traços (`Traco`) carregando; "Não consegui ler agora." + toque relê | LAV-03 |
| D15 | Frescor pelo relógio do aparelho (contador de segundos local) | Pelo `lido_em` do servidor (régua de `LinhaDeFrescor`); relê a cada 15 s visível, 30 s no cartão, nada em segundo plano | LAV-05, cabeçalho §5.2 |
| D16 | Nota de checkout já diz **"4 horas"** | PRD avisa que o protótipo dizia "1 hora" — **já corrigido** no arquivo atual; na Fase 2 o número vem de `threshold_hours` | LAV-22 (Fase 2) |
| D17 | "Joias sendo vistas agora" com **ícone** | Foto (`image_url`, molde do `TopJewels`) | LAV-30 (Fase 2) |
| D18 | Linha do cartão quebra em duas em 390 | Conferir em navegador na Fase 2; na Fase 1 a linha não existe | — |
| D19 | Ponto dourado estático | Igual — o PRD proíbe pulsar | LAV-02 (acordo) |

Fora da Fase 1, e por isso **não** implementados pela `83`: blocos 1–5 da tela (§3.2), o cartão
"Agora na loja" com presença, e a nota de checkout.

## 5. Regras de cópia observadas no protótipo

- Sem exclamação, sem emoji, sem urgência. Plurais: "pessoa/pessoas", "com joia/joias na sacola".
- Sinal de queda é U+2212 ("−13%"), não hífen.
- Números em pt-BR (`1.240`, `2,1%`).
