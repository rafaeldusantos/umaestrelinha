# PRD — Loja ao vivo (app do ateliê)

> Copiado na íntegra do pedido do usuário em 2026-10-26. A feature `83` implementa a **Fase 1
> (Acessos)**; as Fases 2–4 ficam para features seguintes (seção 13).
> O protótipo `Ateliê Admin.dc.html` está descrito em [`prototipo.md`](prototipo.md), com a cópia
> decodificada em [`prototipo/Atelie-Admin.dc.html`](prototipo/Atelie-Admin.dc.html) e capturas em
> `prototipo/*.png` (link do editor no topo de `prototipo.md`). O PRD manda sobre o protótipo.

**Produto:** app do ateliê (`apps/mobile-adm`), PWA Android da Adri
**Referência visual:** protótipo `Ateliê Admin.dc.html`: cartão "Agora na loja" no Início e tela "Loja ao vivo"
**Repositório:** `rafaeldusantos/umaestrelinha` @ `master` (lido em 27/10/2026)
**Prefixo dos requisitos:** `LAV-`

---

## 1. Objetivo

Dar à Adri, pelo celular, a resposta para duas perguntas:

1. **"Tem alguém na loja agora?"** Quantas pessoas, o que estão fazendo (olhando, com joia na sacola, no checkout) e quais joias estão vendo.
2. **"Como foi o movimento?"** Acessos de hoje, ontem e da semana, com conversão e distribuição por horário.

É uma tela de acompanhamento. Ela não pede ação e não deve criar ansiedade: segue o tom memorial do DESIGN.md (nada grita, nada apressa).

## 2. O que já existe (e vamos reaproveitar)

| Peça | Onde | O que entrega | Limite para esta feature |
|---|---|---|---|
| Visitas únicas | `supabase/migrations/20261021120000_71-visitas-unicas.sql` (`store_visits`, `record_store_visit`, `store_movement`) | Visitantes únicos e vendas de **hoje, ontem e semana (desde segunda)** | Guarda só **dia + id aleatório** (VIS-28): sem hora, página, origem nem aparelho |
| Contador da loja | `apps/store/src/app/VisitCounter.tsx` + `supabase/functions/visit` | Grava uma visita por navegador por dia, só com consentimento de estatística, sem robôs, só no host de produção, com opt-out | Uma chamada por dia; não serve como sinal de presença |
| Resumo do ateliê | `store_overview` (feature 73) | Os 7 dias e as joias do Início | Mesma ausência de hora e presença |
| Início do app | `widgets/movement-hero` (`MovementHero`) | Faixa com Hoje / Ontem / Semana | O número "Visitas" daqui **tem de bater** com o da Loja ao vivo |
| GA4 | `core/analytics`, `AnalyticsLoader`, função `google-analytics` (feature 61) | `page_view`, `view_item`, `add_to_cart`, `begin_checkout`, `purchase` via gtag, com consentimento | Não é lido pelo app; a API de tempo real do GA4 exige uma conta de serviço |
| Sacolas abandonadas | `abandoned_carts` + `store_settings.abandoned_cart.threshold_hours` (**4 h** por padrão) | Sacola com e-mail no checkout | Só existe a partir do e-mail; não mede quem está olhando joias |
| Realtime | `useOrdersRealtime` | Recarrega quando um pedido muda | Útil para "Compraram (últimos 30 min)" |

**Conclusão:** a parte de **Acessos** tem base quase pronta. Já a parte **ao vivo** (presença, funil, joias vistas, origem, aparelho, horário) **não tem dado hoje** e precisa de uma fonte nova.

## 3. Decisão de arquitetura (recomendada)

**Opção A — presença própria e efêmera (recomendada para as Fases 1–3)**
- O navegador da loja manda um "estou aqui" leve a cada 60 s, **só com a aba visível e com o mesmo consentimento e as mesmas recusas do `VisitCounter`** (estatística, robô, host interno, opt-out).
- O servidor guarda a última batida por visitante numa tabela efêmera com **TTL de 30 min**, poda contínua e **nenhum IP ou user agent cru**.
- Vantagens: mesma régua de privacidade da feature 71, sem conta Google no app, latência de segundos, números coerentes com "Visitas".

**Opção B — API de tempo real do GA4 (opcional, Fase 4)**
- Função nova que chama a API de tempo real do Google Analytics com uma conta de serviço e devolve contagens por cidade e aparelho.
- Prós: cidade sem tratar IP. Contras: segredo novo, cota da API, bloqueadores de anúncio e consentimento reduzem a amostra, e o número **não vai bater** com o da presença própria. Se entrar, mostrar como bloco separado com a fonte declarada.

**Não recomendado:** pôr hora, página ou origem dentro de `store_visits`. Isso quebra a decisão VIS-28 e os testes da feature 71.

## 4. Fases

| Fase | Entrega | Depende de |
|---|---|---|
| **1 — Acessos** | Tela "Loja ao vivo" só com a seção Acessos; cartão do Início mostra as visitas de hoje (sem "agora") | `store_movement` + um campo novo: hora da primeira visita |
| **2 — Ao vivo** | Presença: "Agora na loja", mini gráfico, "O que estão fazendo", "Joias sendo vistas agora" | Tabela de presença + pulso da loja + RPC de leitura |
| **3 — Origem e aparelho** | "De onde vieram" e "No celular" | Faixas calculadas no servidor a partir do pulso |
| **4 — Cidades (opcional)** | Bloco "Cidades" | Opção B (GA4) ou faixa de região pelo cabeçalho geográfico da hospedagem; decidir com a Adri e com a política de privacidade |

---

## 5. Requisitos funcionais

### 5.1 Cartão "Agora na loja" no Início

Fica logo abaixo da faixa escura do `MovementHero`, antes de "Precisa de você".

- **LAV-01** O cartão é um botão de largura inteira (alvo ≥ 44 px) que abre `/ao-vivo`. Nome acessível: "Agora na loja, {n} pessoas. Abrir loja ao vivo".
- **LAV-02** Conteúdo: eyebrow "Agora na loja" com ponto dourado (`accent`, **estático**, sem pulsar: o DESIGN.md proíbe animação infinita); número em `font-display` 30/700 `primary`; "pessoa" ou "pessoas"; linha "{x} com joia na sacola · {y} no checkout" (cada parte some quando é zero); mini gráfico de 15 barras (últimos 15 min, a barra atual em dourado); chevron.
- **LAV-03** Estados:
  - carregando: traços (`Traco`) no lugar do número e do gráfico;
  - falha: "Não consegui ler agora." + toque relê;
  - **zero pessoas:** "Ninguém na loja agora" e o gráfico continua visível. Nunca esconder o cartão.
- **LAV-04** **Fase 1 (sem presença):** o cartão mostra "Visitas hoje" com o número de `store_movement.periodos.hoje.visitas` e a linha "Ao vivo em breve" **não aparece**. O cartão só passa a "Agora na loja" quando a Fase 2 existir. Não pode haver número inventado.
- **LAV-05** Atualização: lê ao montar, a cada **30 s com a aba em primeiro plano** (Page Visibility) e no puxar para atualizar do Início. Em segundo plano, não lê.

### 5.2 Tela "Loja ao vivo" (`/ao-vivo`)

Cabeçalho com voltar, título "Loja ao vivo" e a linha de frescor "Atualizado agora" / "Atualizado há {s} s", calculada pelo `lido_em` do servidor (mesma régua de `LinhaDeFrescor`). Tem puxar para atualizar e lê a cada 15 s enquanto visível.

#### A. Agora na loja (Fase 2)
- **LAV-10** Cartão `ink`: número grande (56/700) em **dourado sobre ink** (o único lugar onde o ouro vira texto, que a regra permite sobre ink); "pessoas nos últimos 5 minutos".
- **LAV-11** Gráfico de 30 barras, uma por minuto dos últimos 30 min, com a barra atual em dourado e as legendas "30 min atrás" e "agora". Cada barra é o número de visitantes distintos com batida naquele minuto.
- **LAV-12** "Pessoa na loja" = visitante com batida nos **últimos 5 min**. A janela é uma constante única no `core` (`LIVE_WINDOW_MIN = 5`).

#### B. O que estão fazendo (Fase 2)
- **LAV-20** Quatro linhas com barra de proporção (largura = n ÷ total agora):
  1. "Olhando joias": presentes sem sacola;
  2. "Com joia na sacola": presentes com ≥ 1 item na sacola;
  3. "No checkout": presentes na rota de checkout;
  4. "Compraram (últimos 30 min)": pedidos com `paid_at` nos últimos 30 min. Vem de `orders`, não da presença.
- **LAV-21** As três primeiras são **exclusivas e somam o total**. Quem está no checkout conta em "No checkout" e não em "Com joia na sacola". Deixar isso escrito no `core` com teste.
- **LAV-22** Com alguém no checkout, aparece a nota: "Alguém está no checkout agora. Se a compra não fechar em {threshold_hours} horas, a sacola aparece como abandonada no Backoffice." O número vem de `store_settings.abandoned_cart.threshold_hours`. ⚠️ O protótipo diz "1 hora" e está errado: o padrão real é 4.

#### C. Joias sendo vistas agora (Fase 2)
- **LAV-30** Até 5 linhas: foto (`image_url` da joia, molde do `TopJewels`), nome e "{n} pessoa(s)". Ordem: mais pessoas primeiro, empate por nome.
- **LAV-31** Páginas que não são de joia não entram nesta lista. Exceção opcional: o "Guia de envio do material" pode aparecer como linha com ícone `envio`, por ser sinal de intenção de compra.
- **LAV-32** Sem ninguém numa página de joia, a seção mostra "Ninguém olhando uma joia agora."

#### D. De onde vieram (Fase 3)
- **LAV-40** Barra empilhada + legenda em grade 2×2. As faixas são fixas, calculadas **no servidor**, no primeiro pulso da sessão:
  - **Instagram** (`instagram.com`, `l.instagram.com`, `utm_source=instagram`);
  - **Google** (busca e Shopping, `utm_source=google`);
  - **WhatsApp** (`wa.me`, `api.whatsapp.com`, `utm_source=whatsapp`);
  - **Direto** (sem referência);
  - **Outros**.
  As regras moram numa função pura no `core` (`sourceBucket(referrer, utm)`) com teste.
- **LAV-41** Guarda só a **faixa**, nunca o referrer ou a URL de origem.

#### E. No celular (Fase 3)
- **LAV-45** "{m} de {n}" + "o resto pelo computador". O aparelho é só `celular | computador | tablet`, calculado no servidor a partir do user agent, **sem gravar o user agent**.

#### F. Cidades (Fase 4, opcional)
- **LAV-48** Só entra com a fonte decidida (seção 3, Opção B ou região da hospedagem). Mostra no máximo 3 linhas, a última "Outras". Abaixo de 3 pessoas o bloco não aparece, para não identificar ninguém.

#### G. Acessos (Fase 1)
- **LAV-50** Seletor Hoje / Ontem / Semana (segmentado, `aria-pressed`), começando no mesmo período escolhido no Início quando vier de lá. Trocar de período **não lê de novo**: tudo vem numa resposta, como no `MovementHero`.
- **LAV-51** Quatro números, cada um com a variação contra o período anterior ("+12% vs ontem", "−5% vs semana anterior"; verde `done` para alta, `ink-soft` para baixa, nunca vermelho):
  1. **Visitas**: `store_movement…visitas` (visitantes únicos). **Mesmo número da faixa do Início.**
  2. **Com sacola**: visitantes distintos do período com ≥ 1 item na sacola (agregado diário da presença; Fase 2). Na Fase 1 o número não aparece.
  3. **Vendas**: `store_movement…vendas`.
  4. **Conversão**: vendas ÷ visitas, com 1 casa decimal; "—" quando visitas = 0.
  - ⚠️ O protótipo mostra "Visitas" e "Visitantes únicos" separados. **Unificar em "Visitas"**: a loja só mede visitantes únicos (VIS-15), e dois números para a mesma coisa confundem.
- **LAV-52** Gráfico:
  - **Hoje e Ontem:** "Visitas por horário", 8 faixas de 3 h (0h, 3h … 21h). A faixa em andamento fica em dourado; as futuras aparecem como trilho vazio (`line`). Conta cada visitante **na hora da primeira visita do dia**.
  - **Semana:** "Visitas por dia", **de segunda até hoje**, a mesma régua da `store_movement`. O protótipo mostra 7 dias corridos; seguir a régua do banco para o total bater com o gráfico.
- **LAV-53** A nota sob o gráfico explica a régua: "Faixas de 3 horas, pela hora da primeira visita." / "Desde segunda-feira."
- **LAV-54** Contagem limitada: se `teto_dia` vier preenchido, mostrar "Mais de 5.000 visitas neste dia — o número é um mínimo." Se a contagem começou depois do início do período (`contagem_desde_dia`), mostrar "Contando desde {data}."

### 5.3 Comportamentos gerais
- **LAV-60** Uma leitura por ciclo com confirmação de papel (`lerComPapel`). Recusa `42501` cai no episódio único do app.
- **LAV-61** Nenhum número calculado no aparelho com o relógio do aparelho. Janelas, faixas e "agora" vêm do servidor.
- **LAV-62** O `h1` "Loja ao vivo" existe em todos os estados; `document.title = "Loja ao vivo · Ateliê"`.
- **LAV-63** Com a fonte do sistema grande, as grades 2×2 caem para uma coluna (`auto-fit`, piso `9rem`, como no `MovementHero`).
- **LAV-64** `prefers-reduced-motion`: as barras não animam a largura.
- **LAV-65** Sem dado de cliente: a tela nunca mostra nome, e-mail, cidade abaixo do mínimo ou qualquer coisa que identifique uma pessoa (teste-guarda `semDadoSensivelDeClienteNoApp`).

---

## 6. Dados e contratos

### 6.1 Fase 1 — hora da primeira visita
- Coluna nova `store_visits.first_hour smallint` (0–23, hora de Brasília), preenchida em `record_store_visit` **só na inserção**. A repetição do mesmo dia não altera.
- Reavaliar VIS-28 com o usuário: guarda a **hora**, não o instante, e continua sem IP, user agent ou página. Registrar como emenda da feature 71.
- `store_movement` passa a devolver, por período, `por_faixa` (8 inteiros) para hoje e ontem, e `por_dia` (seg..hoje) para a semana. Isso entra na mesma chamada, sem RPC nova.

### 6.2 Fase 2 — presença
(fora do escopo da feature 83 — não antecipar tabelas de presença)

### 6.3 Regras no `core` (um dono só, com teste)
- `packages/core/src/live/`: `LIVE_WINDOW_MIN`; `funnelOf(agora)`; `sourceBucket(referrer, utm)` e `deviceBucket(ua)`; `accessDelta(atual, anterior)`; `conversion(vendas, visitas)`; frases (`liveCardLine`, `checkoutNote(horas)`, estados vazios).
- `pageKind(pathname)` em `core/routes` para a loja e o servidor classificarem do mesmo jeito.
- **Na Fase 1 entram só os que a Fase 1 usa** (`accessDelta`, `conversion`, as frases da seção Acessos e do cartão do Início, as faixas de 3 h).

## 7. Privacidade (LGPD)
- Sem consentimento de estatística, nenhum pulso, como já acontece com o `VisitCounter`. Deixar claro na tela, em letra pequena: "Conta só quem aceitou cookies de estatística."
- Nenhum IP, user agent, referrer ou URL completa no banco. Só faixas.
- Atualizar a Política de Privacidade da loja para mencionar o que passa a ser guardado (a hora da primeira visita, na Fase 1).

## 8. Não funcionais
- **Testes-guarda que não podem quebrar:** `contadorSemGa`, `visitasSchema`, `fraseDaAcaoSoNoCore`, `regraDePedidoSoNoCore`, `semDadoSensivelDeClienteNoApp`, `tomMemorialDosAvisos`.

## 9. Textos (copy)
- Cartão: "Agora na loja" · "{n} pessoas" · "{x} com joias na sacola · {y} no checkout" · "Ninguém na loja agora".
- Tela: "Loja ao vivo" · "Acessos" · "Visitas" · "Com sacola" · "Vendas" · "Conversão" · "Visitas por horário" · "Visitas por dia".
- Sem exclamação, sem emoji, sem "corra" ou "não perca".

## 10. Critérios de aceite (resumo)
1. Os números de Visitas e Vendas da Loja ao vivo são **idênticos** aos da faixa do Início para o mesmo período.
3. Um navegador sem consentimento, robô, host interno ou com opt-out nunca aparece em nenhum número.
5. Com o app em segundo plano, não sai nenhuma leitura.
6. O banco não guarda IP, user agent, referrer nem URL (teste de esquema).
7. O cartão do Início na Fase 1 não mostra nenhum número ao vivo.

## 11. Fora do escopo
- Mapa de calor, gravação de sessão, identificação de clientes logadas.
- Notificação push de "alguém no checkout".
- Histórico além de 7 dias (a poda da feature 71 continua valendo).
- **Toda a Fase 2, 3 e 4** nesta feature.

## 12. Perguntas abertas para a Adri
1. Guardar a **hora** da primeira visita (emenda à VIS-28) está ok? — **seguimos com "sim" como assunção `n — confirmar`**.
2. Cidades: vale a conta de serviço do GA4? (Fase 4)
3. O "Guia de envio do material" entra em "Joias sendo vistas agora"? (Fase 2)
4. A nota de checkout cita o Backoffice? (Fase 2)
