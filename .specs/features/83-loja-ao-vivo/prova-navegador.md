# 83 — Prova em navegador (T13)

Feita em **2026-10-27, 01:04–01:20 (-03)**, worktree `store-83-loja-ao-vivo` no commit `1f953122`.

## Como

- **Build servido**: `pnpm --filter @estrelinha/mobile-adm build` e `vite preview --port 8093 --strictPort`
  (as portas 8082–8084 são de outras sessões). Conferido no bundle servido que o app aponta para o banco
  local (`127.0.0.1:54441`).
- **Banco local de verdade**, com a migration `20261029120000_83-loja-ao-vivo.sql` aplicada (coluna
  `store_visits.first_hour` presente). **Login real** com o admin do seed (`admin@umaestrelinha.dev`) —
  nenhuma leitura interceptada.
- **Fixtura comprometida e desfeita** (`prova/fixtura.sql` e `prova/limpa.sql`): o contador ligado há 8
  dias; **hoje** com 37 visitas às 0h e 9 à 1h (a prova correu à 1h de Brasília, então só a faixa 0 tem
  número e as outras sete são futuras); **ontem** com uma hora em cada uma das 8 faixas, **seis delas
  com 4 dígitos** (12 · 3 · 1.450 · 2.380 · 3.105 · 2.876 · 1.999 · 1.024 = 12.849); **anteontem** 6.200
  (a base da variação de Ontem); 5 pedidos pagos `PROVA83-*` (1 hoje, 3 ontem, 1 anteontem). As linhas
  foram inseridas direto em `store_visits` (não por `record_store_visit`) para passar do teto de 5.000
  num dia e chegar a 4 dígitos por faixa — é estresse de layout, não um dia possível. Depois da prova,
  `limpa.sql`: `store_visits` 0, `PROVA83-*` 0, contador ausente de novo (como estava), `orders` 78 (como
  estava).
- **Fonte**: `html { font-size }` trocado para 100 / 130 / 200 % (o mesmo método da `76`).
- **Medição**: `prova/medir.js`, rodado por `page.evaluate` em cada combinação; o "texto fora da tela"
  descarta o que está dentro de um contêiner com rolagem lateral própria.
- **O que o banco diz**: `prova/le-movimento.sql` lê `store_movement(now())` como o admin
  (`authenticated` + `sub`); saída em `prova/movimento-banco.json`.

## 1 — Os números da tela contra o banco

| Onde | Tela | `store_movement` |
| --- | --- | --- |
| Início, faixa "Visitas" (Hoje) | 46 | `periodos.hoje.visitas` = 46 |
| Início, cartão "Visitas hoje" | 46 | idem |
| `/ao-vivo` Hoje: Visitas · Vendas · Conversão | 46 · 1 · 2,2 % | 46 · 1 · (1/46 = 2,17 %) |
| `/ao-vivo` Ontem | 12.849 · 3 · 0,0 % | 12.849 · 3 · (3/12.849 = 0,023 %) |
| `/ao-vivo` Semana | 12.895 · 4 · 0,0 % | 12.895 · 4 |
| Gráfico de Ontem | 12 · 3 · 1.450 · 2.380 · 3.105 · 2.876 · 1.999 · 1.024 | `acessos.ontem.por_faixa` idêntico |
| Gráfico de Hoje | 46 e sete trilhos sem número | `acessos.hoje.por_faixa` = `[46, null × 7]` |
| Gráfico da Semana | 12.849 (seg) · 46 (hoje) | `acessos.semana.por_dia` idêntico |
| Variação de Ontem | +107 % · +200 % · +45 % vs anteontem | 12.849/6.200, 3/1, 0,0233/0,0161 |
| Variação de Hoje | nenhuma | `comparacao.hoje.visitas` = 0 (ontem antes da 1h) ⇒ sem base ⇒ sem linha |
| Variação da Semana | nenhuma | Semana = opção (a) |

## 2 — Layout (360 · 390 · 412 × 100 · 130 · 200 %, mais 1440 × 100 · 130 · 200 %)

Início e `/ao-vivo` nos três períodos, em cada uma das 12 combinações (48 telas medidas):

| Régua | Resultado |
| --- | --- |
| `scrollWidth` do documento = largura da tela | **48/48** |
| texto fora da tela (fora de contêiner com rolagem própria), `/ao-vivo` | **0** em todas |
| texto fora da tela, **Início** | **0** a 100 e 130 %; **1 a 200 %** em 360/390/412: o rótulo "Descontos" da barra de abas (`right` 403,7 numa tela de 390). **Anterior à `83`**: a barra não mudou de desenho nesta feature (`git diff 744da7ea..HEAD` só toca `barraNoCaminho`). Registrado como `BL-058` |
| alvos ≥ 44 px: Voltar (44 × 44), os três períodos (44 de altura, ≥ 111 de largura), o cartão "Visitas hoje" (358 × 115,5) | **todos** |
| número do cartão dentro do cartão | sem estouro em nenhuma |
| a 200 % em 360/390/412, os três cartões em **uma coluna** | sim (a 130 % também já é uma coluna) |
| a 100 %, Visitas e Vendas lado a lado e **Conversão em largura inteira** (sem célula vazia) | sim, nas 4 larguras (ex.: 390 → 173 + 173 e 358 = largura da grade) |
| 1440 a 200 % | **duas colunas** + Conversão inteira — a régua "uma coluna a 200 %" é das larguras de celular; a 1440 a grade tem espaço. Sem estouro |
| cabeçalho de borda a borda e sem vão no topo | `left 0`, `right` = largura, `top 0` em todas |
| gráfico: valores sobrepostos ou fora da própria coluna | **0** em todas |
| gráfico de Ontem (4 dígitos) | 100 %: cabe (ex.: 294/294 em 360); 130 %: rola **dentro** do cartão (367/275 em 360); **200 % em 360: rola dentro (564/230)**; o `ol` sempre dentro do cartão e o `body` sem rolagem |

Capturas em `prova/`: `inicio-390-100.png`, `ao-vivo-hoje-390-100.png`, `ao-vivo-ontem-390-100.png`,
`ao-vivo-ontem-360-200.png`, `ao-vivo-semana-412-130.png`, `ao-vivo-ontem-1440-100.png`.

## 3 — O ciclo de leitura, na rede

Contadas as requisições a `/rest/v1/rpc/store_movement`; "oculta" é `document.visibilityState = 'hidden'`
mais o evento `visibilitychange` (com `bubbles: true`: o React Query escuta em `window`, e sem a bolha a
volta não é ouvida — achado do método, não do app).

| Tela | Visível | Oculta | Volta |
| --- | --- | --- | --- |
| `/ao-vivo` | leituras aos 12 s e 27 s (15 s de intervalo) | **0** em 31 s | uma leitura **no instante da volta** (31 s) e a seguinte aos 46 s; o frescor volta a "Atualizado agora" |
| Início | leituras aos 29 s e 59 s (30 s) | **0** em 62 s | — |

Com a aba oculta o frescor seguia contando a partir da última resposta ("Atualizado há 38 s"), sem ler.

## 4 — Puxar, voltar, período e movimento

- **Puxar no topo** (toque emulado por CDP): a dica muda para "Solte para atualizar" e soltar faz **uma**
  leitura (454 ms depois); um puxão curto (30 px, abaixo dos 64) não lê nada.
- **Período**: com "Ontem" escolhido na Início, tocar o cartão abre `/ao-vivo` em **Ontem**
  (`history.state` = `{ doApp: true, periodo: 'ontem' }`, URL sem query); **F5** mantém Ontem; o **voltar
  do Android** (`history.back()`) devolve a Início com **Ontem** ainda escolhido.
- **`prefers-reduced-motion: reduce`**: `document.getAnimations()` vazio, e nenhum elemento com
  `transition-duration` > 0 na tela (nem trocando de período).

## 5 — Observações (não são defeito da `83`)

- **A fonte foi escalada pela raiz** (`html { font-size }`): o que está em `px` fixo (o número 22 px dos
  cartões, os valores 11 px do gráfico, o título 17 px) não cresce. A captura de 360 a 200 % mostra os
  números menores que o texto em volta. É o mesmo método das provas da `73`/`76`; a escala de texto do
  Android/Chrome real pode se comportar diferente — ver o fim.
- **"0,0 %" com "+45 % vs anteontem"** na Conversão de Ontem: 3 vendas em 12.849 visitas arredondam para
  0,0 % e a variação é calculada sobre o valor cheio. Só acontece com volume que a loja não tem (a fixtura
  passa do teto de propósito); fica registrado para a revisão de copy.

## 6 — O que NÃO foi provado

- **Android real**: a escala de fonte do sistema, o gesto de voltar de verdade, o puxar com o dedo e a
  aba em segundo plano do Chrome (aqui `visibilityState` foi forçado por script).
- **A releitura recusada na tela aberta** (a conta perde o papel) em navegador — provada sobre o client
  real em `aoVivoComClientReal.test.tsx` (T11), não aqui.
- **O teto do dia** (`capped_day`) e as visitas **sem hora** (anteriores ao deploy) em navegador: a
  fixtura não os tem; são provados pelos probes (`probes/01-acessos.sql`) e pelos testes de componente.
- **A virada do dia** com a tela aberta.
