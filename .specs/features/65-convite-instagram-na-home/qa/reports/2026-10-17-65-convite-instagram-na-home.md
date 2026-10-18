# QA Run Report — 2026-10-17 — 65-convite-instagram-na-home

- **Scope:** a feature 65 na árvore de trabalho, com a T01 implementada e sem commit. O que muda para quem usa a loja: na primeira visita à Home aparece o convite para o Instagram, e o link do Instagram no rodapé passa a usar `www`.
- **Cadence tier:** targeted
- **Build:** HEAD `536da5e` + árvore de trabalho com a T01 (sem commit) · **Environment:** dev server Vite em `http://localhost:8082`, Supabase local (`supabase status` OK), `agent-browser` (Chromium)
- **Started:** 2026-10-17 · **Status:** closed

## Personas

| Persona | Base | Device / Network / Locale | Sessions |
|---|---|---|---|
| Luciana | New User | phone-small 390×844 / 4g (sem throttle — ver paridade) / pt-BR | CH-celular-primeira-visita-convite, CH-celular-convite-interrompido |
| Teresa | Accessibility-Reliant | desktop 1440×900 / wifi-fast / pt-BR, teclado | CH-computador-convite-teclado |
| Carla | Casual User | desktop / wifi-fast / pt-BR | (cenários de retorno dentro dos charters acima) |

## Flows in Scope

- `J-conhecer-o-trabalho-no-instagram` — quem chega descobre onde acompanhar a joia sendo feita, sem pressão e sem ser incomodada de novo (`../journeys/J-conhecer-o-trabalho-no-instagram.md`)

## Session Matrix & Results

| # | Charter | Journey / Scenario | Persona | Tour | Status | Issue | Fix commit |
|---|---|---|---|---|---|---|---|
| 1 | CH-celular-primeira-visita-convite | J-conhecer-o-trabalho-no-instagram / IG-convite-primeira-visita-celular | Luciana | Feature Tour | Pass | | |
| 2 | CH-celular-primeira-visita-convite | … / IG-convite-espera-cookies | Luciana | Feature Tour | Pass | | |
| 3 | CH-celular-primeira-visita-convite | … / IG-convite-abre-perfil | Luciana | Feature Tour | Pass | | |
| 4 | CH-celular-primeira-visita-convite | … / IG-convite-fecha-quatro-formas | Luciana | Feature Tour | Pass | | |
| 5 | CH-celular-primeira-visita-convite | … / IG-convite-convive-avisos | Luciana | Feature Tour | Pass | | |
| 6 | CH-celular-convite-interrompido | … / IG-convite-nao-volta | Luciana | Interrupt Tour | Pass | | |
| 7 | CH-celular-convite-interrompido | … / IG-convite-fora-da-home | Luciana | Interrupt Tour | Pass | | |
| 8 | CH-celular-convite-interrompido | … / IG-convite-sem-armazenamento | Luciana | Interrupt Tour | Blocked (human decision) | BUG-20261017-loja-em-branco-sem-armazenamento | |
| 9 | CH-computador-convite-teclado | … / IG-convite-cartao-computador | Teresa | Feature Tour | Pass | BUG-20261017-home-rola-na-horizontal-em-768 (anterior à feature) | |
| 10 | CH-computador-convite-teclado | … / IG-convite-teclado-e-leitor | Teresa | Feature Tour | Pass | | |
| 11 | CH-computador-convite-teclado | … / IG-rodape-link-instagram | Teresa | Feature Tour | Pass | | |

Status legend: `Pending | Pass | Fixed | Skipped | Blocked (needs human verify) | Blocked (human decision)`

## Session Debriefs

### CH-celular-primeira-visita-convite — Luciana

- **Ran:** sessão 1, em 390×844 (box respeitado: sim)
- **Paridade:** na primeira abertura o worktree não tinha `apps/store/.env` e a loja abriu em branco (`#root` vazio; o client do Supabase lança erro sem as variáveis). Copiei o `.env` do checkout principal: Supabase **local** e só a chave publicável. Não é defeito do produto, e está registrado em Learnings.
- **Findings:**
  - Com a cookie notice pendente, o convite não abre: 5 s esperados, nenhum `role=dialog`. Aceitar, salvar as Preferências ou fechar a cookie notice no X libera o convite. Com as Preferências abertas, ele espera: depois de mais 4,5 s, só o diálogo "Preferências de cookies" estava aberto.
  - O convite abre como folha presa ao rodapé (`y=408`, `390×436`), com véu `rgba(35,48,58,0.55)` em `z-50`. O véu cobre header, banner, `MobileNav` e a bolha do WhatsApp (conferido com `elementFromPoint` em quatro pontos). Nenhuma rolagem horizontal (`scrollWidth` 390).
  - Copy literal certa: "NO INSTAGRAM", título em duas linhas ("Acompanhe de perto / o meu trabalho"), o texto, "@umaestrelinha.adri", nenhuma `<img>` e nenhuma exclamação.
  - Nome acessível = título, descrição = texto, e o foco entra no diálogo ao abrir.
  - A marca `estrelinha-instagram-invite = "1"` é gravada **ao abrir**. Recarregar e esperar 6 s não traz o convite de volta.
  - "Ver o perfil no Instagram": `href` `https://www.instagram.com/umaestrelinha.adri`, `target=_blank`, `rel="noopener noreferrer"`. Abriu a aba `t2` com o título "Adri Muniz (@umaestrelinha.adri) • fotos e vídeos do Instagram", que é a leitura independente. A aba da loja ficou na Home com o convite fechado.
  - As quatro saídas, X, "Agora não", Esc e toque no véu, fecham o convite. O estado aberto foi registrado antes de cada uma, e depois a URL continua `/` com `scrollY` 0.
  - Alvos de toque: X 44×44; primário 342×52; "Agora não" com 44px de altura efetiva (o toque responde a ±20px do centro e falha a ±23px), pelo pseudo-elemento do `TAP_ROW`, com a largura do rótulo.
  - CLS 0,0995, com o `<footer>` como única fonte aos 134 ms, que é o valor já conhecido da Home (`CLAUDE.md`). O convite não desloca nada. LCP = imagem do banner, aos 164 ms; o convite não é candidato.
- **Bugs filed/updated:** nenhum
- **Scenarios settled:** IG-convite-primeira-visita-celular → pass · IG-convite-espera-cookies → pass · IG-convite-abre-perfil → pass · IG-convite-fecha-quatro-formas → pass · IG-convite-convive-avisos → pass
- **Paper cuts:** respondida a cookie notice, o convite sobe **no mesmo instante**, porque os 3 s já tinham passado (é a premissa 3 do implementador). Para a Luciana, "fechei um aviso e veio outro na hora". Sharp; vai para Decisions for a Human.
- **Surprises:** o banner continua girando por trás do véu. Não incomoda, mas é movimento atrás de um diálogo modal.
- **Suggested next charter:** a mesma jornada em rede lenta (Network Tour), em que a Home resolve mais tarde e os 3 s contam a partir daí.

### CH-celular-convite-interrompido — Luciana

- **Ran:** sessão 2, em 390×844, num navegador limpo por bloco (box respeitado: sim)
- **Findings:**
  - **Saiu antes do tempo:** com a cookie notice aceita, ela foi para um produto antes dos 3 s. Lá não há convite e nenhuma marca foi gravada (`null`). Ao voltar para a Home, o convite aparece, como manda o abandono X1 da jornada.
  - **Saiu com o convite aberto:** ao avançar para o produto, o convite fecha sem deixar resíduo (sem véu, `pointer-events` e `overflow` do body normais, `scrollWidth` 390). Ao voltar para a Home, ele não reabre (marca `"1"`, abandono X2). Voltar a partir da primeira página sai do site; avançar de volta traz a Home sem convite e sem trava.
  - **Entrada direta** por `/produtos/<slug>`, com a marca apagada e 6 s de espera: sem convite e sem marca.
  - **Prévia do painel:** um iframe com `/?preview=1` renderiza a Home (28 KB) **sem** convite. O iframe de controle, sem `?preview=1` e lado a lado, **mostra** o convite, o que prova que o teste distingue os dois casos.
  - **Armazenamento bloqueado por inteiro** (Web Storage lançando `SecurityError` na leitura e na escrita): **a loja inteira fica em branco** (`#root` vazio). A causa é `AbandonedCartTracker`, código anterior à feature 65. → `BUG-20261017-loja-em-branco-sem-armazenamento`.
  - **Só a escrita falhando** (`QuotaExceededError`): a loja renderiza, o convite abre uma vez, não grava a marca (`null`) e não reabre ao voltar para a Home dentro da sessão. É o fallback em memória da `inviteSeen` funcionando.
- **Bugs filed/updated:** BUG-20261017-loja-em-branco-sem-armazenamento (novo; defeito anterior à feature)
- **Scenarios settled:** IG-convite-nao-volta → pass · IG-convite-fora-da-home → pass · IG-convite-sem-armazenamento → blocked-decision
- **Paper cuts:** nenhum novo
- **Surprises:** o bloqueio total do armazenamento derruba a loja antes de qualquer coisa da feature rodar. O convite cumpre a parte dele, mas o cenário só fecha quando o defeito anterior for decidido.
- **Suggested next charter:** um passeio de resiliência pela loja inteira com o armazenamento bloqueado (carrinho, wishlist, busca recente, checkout). Os outros donos de storage nunca foram andados nessa condição.

### CH-computador-convite-teclado — Teresa

- **Ran:** sessão 3, em 1440×900, mais 1024, 768 e 767 (box respeitado: sim)
- **Findings:**
  - **Cartão central**, igual em 1440, 1024 e 768: 480×429, centro exato nos dois eixos (desvio 0/0), raio 20 em todos os cantos, título com 32px, sem puxador. Em 767 vira folha de largura toda, com raio só no topo, título de 28px e puxador visível. O corte em `md` está certo.
  - **Teclado:** ao abrir, o foco cai no X. Tab percorre X → "Ver o perfil" → "Agora não" → X, e Shift+Tab volta: o foco não sai do diálogo. Anel de foco visível, 2px `ground` mais 4px `primary` com `:focus-visible`. Enter no botão abriu a aba do perfil (título "Adri Muniz (@umaestrelinha.adri)…") e fechou o convite. Esc fecha. Depois de fechar, o foco vai para o `body`, e o primeiro Tab cai no logo, o começo da página. Não existe gatilho de origem para onde devolver o foco, então o destino é razoável.
  - **Leitor de tela (pela árvore de acessibilidade):** `role=dialog`, nome = "Acompanhe de perto o meu trabalho", descrição = o texto, X com o rótulo "Fechar convite do Instagram". O resto da página fica inerte (o véu é o elemento no topo em todos os pontos medidos, inclusive sobre a bolha do WhatsApp em 1440).
  - **Canário do rodapé:** os dois links ("Siga-nos no Instagram / @umaestrelinha.adri" e "Instagram") apontam para `https://www.instagram.com/umaestrelinha.adri` com `target=_blank`.
  - **Fora da feature:** em 768, a Home rola 34px na horizontal (`scrollWidth` 802), igual com o convite fechado. A causa é a faixa de departamentos. → `BUG-20261017-home-rola-na-horizontal-em-768`.
- **Bugs filed/updated:** BUG-20261017-home-rola-na-horizontal-em-768 (novo; defeito anterior à feature)
- **Scenarios settled:** IG-convite-cartao-computador → pass · IG-convite-teclado-e-leitor → pass · IG-rodape-link-instagram → pass
- **Paper cuts:** (1) o rodapé diz "Siga-**nos**", e o convite, logo acima, fala "o **meu** trabalho". São duas vozes na mesma tela, contra a regra de primeira pessoa da Adri. Dull. (2) Em 767, a folha estica o botão por 743px. Dull.
- **Surprises:** em 1440 a bolha do WhatsApp parece "acesa" através do véu, porque o verde saturado atravessa os 55%. Ela está coberta e não é clicável.
- **Suggested next charter:** VoiceOver de verdade no Safari (iOS e macOS). A árvore de acessibilidade não prova o que o leitor anuncia.

### Lentes experienciais (passe condensado)

Não houve um segundo passe de 45 min, e isso fica declarado: as seis lentes foram mantidas ao longo das três sessões, e o veredito abaixo é sobre elas.

| Lente | Veredito | Por quê |
|---|---|---|
| Usabilidade | friction | o convite sobe no mesmo instante em que a cookie notice fecha (paper cut sharp, em Decisions) |
| Acessibilidade | pass | nome, descrição, foco preso, Esc, anel visível, alvos de 44px |
| Performance percebida | pass | CLS 0,0995, já conhecido e vindo do rodapé; LCP no banner, aos 164 ms; o convite entra sem deslocar nada |
| Compatibilidade | pass | só Chromium; Safari/WebKit não foi andado (ver Human Verifications) |
| Recuperação de erro | friction | com o armazenamento bloqueado, a loja fica em branco (defeito anterior, em Decisions) |
| Paridade com produção | friction | dev server, não build; sem throttle de 4G; `.env` copiado do checkout principal |

## What Was Fixed

Nada. Nenhum achado passou pelo governador: os dois bugs são de código anterior e fora do escopo da feature 65, e o paper cut sharp é decisão de produto. E, por regra do usuário, nada é commitado sem pedido.

## Paper Cuts

| Persona | Where (journey/step) | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Luciana | J-conhecer-o-trabalho-no-instagram step 2 | "fechei o aviso de cookies e na mesma hora subiu outro" | sharp | deferred → Decisions for a Human |
| Teresa | J-conhecer-o-trabalho-no-instagram step 3 | "o convite fala 'o meu trabalho' e o rodapé logo abaixo diz 'Siga-nos'" | dull | watching (em Decisions, como copy) |
| Teresa | J-conhecer-o-trabalho-no-instagram step 3 (767) | "o botão atravessa a tela inteira" | dull | watching |

## Runtime Errors Observed

- `The above error occurred in the <AbandonedCartTracker> component`, duas vezes, **só** com o Web Storage bloqueado. Registrado como BUG-20261017-loja-em-branco-sem-armazenamento.
- No caminho normal, o console ficou limpo de erros: só avisos de *future flags* do React Router e as mensagens do Vite e do React DevTools.

## Human Verifications Needed

- [ ] **Safari no iPhone (390):** em aba anônima, abrir a loja, aceitar os cookies e conferir que a folha sobe do rodapé sem brigar com a barra do Safari, e que o toque no véu fecha. Rows 1 e 4 foram andadas só no Chromium.
- [ ] **VoiceOver:** abrir o convite e conferir que o VoiceOver anuncia "Acompanhe de perto o meu trabalho, diálogo" e o texto. Row 10 foi provada pela árvore de acessibilidade, não pelo leitor.

## Decisions for a Human

### Com o armazenamento do site bloqueado, a loja inteira fica em branco (BUG-20261017-loja-em-branco-sem-armazenamento)
- What's broken: quem bloqueia os dados do site vê página em branco. A causa é `useAbandonedCartTracker.ts:45-46`, que lê `sessionStorage` sem `try/catch` durante a renderização, sem error boundary acima. O cenário `IG-convite-sem-armazenamento` fica bloqueado por isso, embora o convite cumpra a parte dele.
- Why not auto-fixed: está fora do escopo da feature 65 (código anterior, outra feature) e o usuário pediu nada de commit sem pedido. A correção é pequena, mas abre a pergunta de como os outros donos de storage se comportam.
- Options:
  1. Corrigir só o `useAbandonedCartTracker` com `try/catch` (molde `cookieConsentStore`), com teste que falha antes. Barato, mas pode haver outro leitor sem guarda logo depois.
  2. Uma feature curta de resiliência de storage: varrer todo `localStorage`/`sessionStorage` da loja, mais um error boundary no `App`. É mais trabalho, e fecha a classe.
- Recommendation: **2**. A sessão só testou um caminho, e um error boundary transforma a próxima ocorrência em mensagem em vez de página em branco.

### A Home rola na horizontal em 768 (BUG-20261017-home-rola-na-horizontal-em-768)
- What's broken: o `scrollWidth` fica em 802 numa janela de 768, e a página desliza 34px. Vem da faixa de departamentos.
- Why not auto-fixed: anterior à feature e fora do escopo dela; a causa exata não foi investigada.
- Options: 1. Corrigir agora, numa tarefa curta do chrome. 2. Registrar no backlog e corrigir com a próxima mexida no header.
- Recommendation: **1**. O `CLAUDE.md` trata rolagem horizontal do body como inaceitável, e o tablet em pé é um tamanho real.

### O convite sobe no mesmo instante em que a cookie notice fecha (paper cut sharp)
- What's broken: como os 3 s contam a partir da Home resolvida (premissa 3 da T01), quem demora mais de 3 s para responder aos cookies recebe o convite colado na resposta: um aviso fecha e o outro sobe.
- Why not auto-fixed: é decisão de produto. A premissa 3 foi uma escolha consciente do implementador ("assim que o aviso é respondido, o convite abre"), e a revisão a aceitou.
- Options:
  1. Reiniciar os 3 s depois da resposta aos cookies. É uma constante e um efeito a mais, e dá um respiro entre os dois avisos.
  2. Manter como está. É mais simples, e o convite chega enquanto a pessoa ainda está atenta.
- Recommendation: **1**. Para quem chega de luto, dois avisos em sequência imediata leem como insistência, e o tom da loja (`DESIGN.md › 1`) é não apressar.

### "Siga-nos" no rodapé (paper cut dull)
- What's broken: o rótulo do rodapé usa "nós", e o convite usa a primeira pessoa da Adri. Desde 2026-10-17, a regra da copy da loja é a primeira pessoa.
- Options: 1. Trocar para "Me siga no Instagram" (ou equivalente) junto com a varredura de copy. 2. Deixar.
- Recommendation: **1**, na próxima varredura de copy. Não pertence a esta feature.

## Learnings

- **O worktree não herda o `.env` do checkout principal.** A loja abriu em branco até o `apps/store/.env` ser copiado. Vale escrever no `CLAUDE.md`, ou no `specflow.yaml › ambiente_local`, que um worktree novo precisa desse arquivo: quem subir a loja num worktree vai ver tela branca e achar que é defeito.
- **O bloqueio de storage deve ser medido em duas formas.** Só a escrita (cota do Safari) e tudo bloqueado (bloqueio de dados de sites) dão resultados opostos aqui: a primeira passa, a segunda derruba a loja. Fica como candidata a padrão de tour.
- **O iframe de controle é o que dá dente à prova da prévia.** Sem o par sem `?preview=1`, "não há convite na prévia" seria verdade também se o convite estivesse quebrado.
- **Medir o puxador pelo tamanho falhou** (o detector disse "ausente" e o screenshot mostrou o contrário). Para presença visual, o screenshot ganha do seletor.

## Final Status

- **Exit gate (full automated suite):** `pnpm --filter @estrelinha/store test --testTimeout=20000` → `Test Files  277 passed (277)` · `Tests  4773 passed (4773)` · `exit=0`
- **Issues by user impact:** Blocks-Completion 1 (anterior à feature) · Data-Loss 0 · Trust-Damage 0 · Friction 1 bug (anterior à feature) + 1 paper cut sharp · Cosmetic 0
- **Coverage:** 1/1 jornada andada pelas três sessões, com Luciana (2 sessões) e Teresa (1). Carla foi coberta só como cenário de retorno, dentro das sessões. 11/11 cenários terminais: 10 `pass` e 1 `blocked-decision`. Ficaram de fora e declarados: Safari/WebKit, VoiceOver real, throttle de rede e build de produção.
- **Paridade:** dev server Vite, e não build; Chromium headless; sem throttle de 4G; `apps/store/.env` copiado do checkout principal (Supabase local).
- **Verdict:** **ready with blocked items.** O convite da feature 65 cumpre os sete comportamentos no Chromium, em 390, 767, 768, 1024 e 1440. O que segura é anterior a ela: a loja em branco com o armazenamento bloqueado e a rolagem em 768. Há também uma decisão de produto sobre o intervalo depois da cookie notice. As três estão em Decisions for a Human.
- **Status:** closed
