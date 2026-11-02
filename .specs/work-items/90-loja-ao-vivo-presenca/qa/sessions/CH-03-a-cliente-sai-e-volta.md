# Sessão CH-03 · A cliente sai, volta, e a loja não engasga

| Campo       | Valor |
| ----------- | ----- |
| Charter     | `test-plans/charters/CH-03-a-cliente-sai-e-volta.md` · exploratório · P0 |
| Status      | done |
| Persona     | PER-03 Lúcia · conta: `anonima` (loja sem login) · oráculo: `admin-atelie` (credencial do arquivo de credenciais do QA local, nunca o valor) num contexto isolado separado |
| Tour · modo | Interrupt · por cenário (J-05, J-02a) |
| Rodada      | exploração |
| Orçamento   | 50 ações de browser de 50 |
| Ambiente    | app http://localhost:8084 (dev) · loja http://localhost:8082 (build, `vite preview`) · build não exposto · Chromium headless (Playwright MCP) · viewport da loja 390 × 844 |
| Paridade    | banco local com `production_host = localhost`; contexto da Lúcia com `navigator.webdriver` neutralizado e UA de iPhone (cabeçalho e `navigator`); `*.supabase.co` e `**/g/collect*` bloqueados (os 4–13 erros de console da loja são só o GA abortado); rede da loja limitada por CDP a ~Slow 4G (562 ms de latência, ~1,4 Mbit/s); "aba em segundo plano" emulada redefinindo `document.visibilityState`/`hidden` e disparando `visibilitychange` (no headless toda aba fica visível); vários cliques na loja só funcionaram por `el.click()` (o Playwright acusa "element is outside of the viewport", como no CH-02); a leitura do oráculo e os avisos da loja à function `visit` foram observados por `browser_run_code_unsafe` (sondagem do texto da Loja ao vivo a cada 5–10 s, e o corpo do aviso com o código trocado por `<id>`) para não gastar uma ação por espera de 30 s |

## Missão

Confirmar que a Lúcia pode sair e voltar à loja quando quiser — a sacola de antes continua lá, o checkout não
engasga — e que a Adri a vê sair do total em até 5 min e voltar com o estado certo.

## Passos

Horários em UTC (o relógio da máquina), para medir as janelas.

| #  | A persona tentou | Viu | Evidência |
| -- | ---------------- | --- | --------- |
| 01 | (oráculo) a Adri entra no app e abre a Loja ao vivo, antes da Lúcia | 1 pessoa (Olhando 1, Direto 1) — resto das sessões anteriores, que saiu sozinho antes do passo 05 | — |
| 02 | Lúcia (contexto novo, Slow 4G) abre a Home e depois a joia "Joia Afetiva Árvore da Vida Flores com Leite Materno e Cabelo" por `?utm_source=instagram`; aceita os cookies e põe a joia na sacola | a gaveta "Sua sacola" abre com 1 item, R$ 259,90 | — |
| 03 | na gaveta, aumenta para 2 e diminui para 1 | o primeiro botão do passo vira "Diminuir" com 2 e "Remover" com 1; total R$ 519,80 → R$ 259,90; cada toque responde na hora | — |
| 04 | toca "Finalizar Pedido" e preenche Contato (nome, e-mail fictício, WhatsApp), toca "Continuar", digita CEP 90010-000 e o número | o CEP completa Rua Siqueira Campos, Centro Histórico, Porto Alegre/RS; aparecem "Correios SEDEX … R$ 15,91" e a retirada no escritório; nenhum aviso de erro, nenhum campo perdido | — |
| 05 | (oráculo, ~75 s depois de abrir o checkout) | 1 pessoa nos últimos 5 minutos; Olhando 0 · Sacola 0 · No checkout 1; a nota "Alguém está no checkout agora. Se a compra não fechar e o e-mail já tiver sido preenchido, a sacola fica em Carrinhos abandonados, no painel."; "De onde vieram": Direto 1 (ver Spec-gaps); No celular 1 de 1 | `screenshots/CH-03-05-ao-vivo-1-checkout.png` |
| 06 | Lúcia fecha a aba do checkout (≈ 04:26:50), sem voltar; o contexto continua aberto noutra aba vazia | — | — |
| 07 | (oráculo) a Adri espera na Loja ao vivo | às 04:34:02 (7 min 12 s depois): "Ninguém na loja agora.", Olhando 0 · Sacola 0 · No checkout 0, a nota sumiu, "Joias sendo vistas agora: Ninguém olhando uma joia agora.", "De onde vieram: Ninguém na loja agora." O instante exato da saída não foi medido (a sondagem desta espera falhou — ver Fora da cobertura) | — |
| 08 | Lúcia reabre a loja na Home, no mesmo navegador, sem tocar em nada (04:34:18) | a loja avisa na hora com `page:"outra", cart:1`; o selo da sacola mostra 1; na Loja ao vivo, 20 s depois: 1 pessoa, Com joia na sacola 1, Olhando 0 | `screenshots/CH-03-08-ao-vivo-sacola-guardada.png` |
| 09 | fecha o convite do Instagram que cobre a Home, abre a sacola e remove a joia (04:36:43) | a gaveta mostra "Sua sacola está vazia · Escolha uma peça — eu embalo com carinho. · Explorar joias"; a loja avisa em ~3 s com `cart:0`. O oráculo não foi lido neste ponto (orçamento) | — |
| 10 | abre a joia de novo (carregou em 3,2 s no Slow 4G), põe na sacola e aumenta para 3 (R$ 779,70), fecha a gaveta | avisos `page:"joia"` com `cart:0`, `cart:1`, `cart:2` em 4 s; o de 3 unidades saiu só no passo 12 | — |
| 11 | põe a aba da loja em segundo plano (04:37:21) e não volta por 5 min | nenhum aviso enquanto oculta; a Loja ao vivo chegou a "Ninguém na loja agora." até 04:42:27 (≤ 5 min 05 s depois de ocultar, já contando a releitura da tela) | — |
| 12 | volta à aba da loja (04:42:39) | aviso imediato `page:"joia", cart:3`; na Loja ao vivo, 5 s depois: 1 pessoa, Com joia na sacola 1, "Joia Afetiva Árvore da Vida Flores com Leite Materno e Cabelo · 1 pessoa", Direto 1 — o mesmo estado de antes; 3 unidades contam como 1 pessoa | `screenshots/CH-03-12-ao-vivo-volta-sacola.png` |

**Edge cases tentados:**

- Fechar a aba no meio do checkout (passos 06–07): saiu do total e de "No checkout"; a nota sumiu — ok (tempo exato não medido)
- Esvaziar a sacola e seguir olhando (passo 09): a loja avisou `cart:0` em segundos; o efeito no oráculo não foi lido
- Sacola com 3 unidades da mesma joia (passos 10–12): uma pessoa só, em "Com joia na sacola" — ok
- Aba em segundo plano mais de 5 min e voltar (passos 11–12): sai e volta no mesmo estado — ok
- Duas abas, recarregar na troca de rota, girar o celular e ficar offline 1 min: não feitos — orçamento

## Casos

| TC | Veredito | Passo | Evidência | Nota |
| -- | -------- | ----- | --------- | ---- |
| TC-JOURNEY-002 | pass | 04–07 | `screenshots/CH-03-05-ao-vivo-1-checkout.png` | passo 1 ok (1, No checkout 1, a nota); passo 3 ok no estado (0, checkout 0, a nota some). O prazo de 5 min + 15 s não foi cronometrado no fechamento da aba (só confirmado o estado aos 7 min 12 s); o mesmo mecanismo — a loja para de avisar — tirou a Lúcia do total em ≤ 5 min 05 s no passo 11. "Ninguém na loja agora" no cartão do Início não foi lido |
| TC-FUNC-014 | pass | 10–12 | `screenshots/CH-03-12-ao-vivo-volta-sacola.png` | oculta: nenhum aviso, sai do total em ≤ 5 min 05 s; visível de novo: volta em 5 s no mesmo estado (na joia, com sacola). Segundo plano emulado por `visibilitychange`. Variação de 2 min não feita |
| TC-FUNC-015 | pass | 08–12 | `screenshots/CH-03-08-ao-vivo-sacola-guardada.png` · `CH-03-12-ao-vivo-volta-sacola.png` | passo 1 ok (sacola guardada, "Com joia na sacola" 1 em 20 s sem tocar); passo 3 ok (volta a 1); variação 1 → 3 ok (uma pessoa). Passo 2 só pela rede: o aviso `cart:0` saiu, mas "Sacola 0 · Olhando 1" no oráculo não foi lido (orçamento) |
| TC-FUNC-016 | skip | — | — | duas abas da mesma loja: orçamento |
| TC-REG-003 | pass | 02–04, 09–10 | — | passos 1 e 2 ok no Slow 4G: pôr, aumentar, diminuir, remover e pôr de novo responderam na hora; checkout com contato, CEP e frete sem engasgo nem aviso de erro (console só com o GA bloqueado). Passo 3 (aviso de presença bloqueado) e a variação de recusa no checkout não feitos — orçamento |

Contagem: pass 4 · fail 0 · blocked 0 · skip 1

## Achados

nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta |
| ----------------------- | ------------ | --------------- |
| A Lúcia abriu a Home (sem marcação) e, minutos depois, a joia por `?utm_source=instagram`; a Loja ao vivo a contou em "De onde vieram" como **Direto** a sessão inteira, e todos os avisos levaram `source:"direto"`. A origem parece ficar presa à primeira página do dia; nenhuma fonte lida diz se uma chegada posterior marcada (outro post do Instagram no mesmo dia) troca a origem. Neste charter a Home foi aberta antes por preparo do ambiente, não pela persona | 02, 05, 12 | polimento |

## Fora da cobertura

- O tempo exato de saída depois de **fechar** a aba (TC-JOURNEY-002 passo 3): a sondagem da espera falhou por um erro meu de leitura (o texto do título vem em caixa alta), e só se confirmou o estado aos 7 min 12 s. O limite de 5 min foi medido no caminho da aba oculta (passo 11), que usa o mesmo corte
- "Ninguém na loja agora" no cartão do Início ao fim do TC-JOURNEY-002 — só a Loja ao vivo foi lida
- O oráculo depois de esvaziar a sacola (TC-FUNC-015 passo 2) — orçamento
- Duas abas da mesma loja (TC-FUNC-016) — orçamento
- Aviso de presença bloqueado por rota e recusa de cookies no checkout (TC-REG-003 passo 3 e variação) — orçamento
- Recarregar na troca de rota, girar para 844 × 390 com a sacola aberta, ficar offline 1 min — orçamento
- Segundo plano de verdade (troca de app no Android): emulado por `visibilitychange`, fora do alcance do headless
- Sair da conta da Adri: o contexto era isolado e em memória e foi fechado com o browser; o "Sair" não foi tocado (orçamento)
- Restaurar `store_settings.analytics.production_host` — é do orquestrador

## Debrief

- **Surpresas:** a volta é rápida (5 s depois de reexibir a aba, 20 s depois de reabrir a loja) e a sacola guardada conta sem toque; o convite do Instagram cobre a Home e deixa a barra da sacola fora da árvore de acessibilidade até ser fechado
- **Próximo charter:** uma sessão curta só para TC-FUNC-016 (duas abas), TC-REG-003 passo 3 (presença bloqueada) e o cronômetro do fechamento de aba, que cabem em ~25 ações
- **Padrão novo:** sondar o oráculo de dentro de um `run_code` que também mexe no contexto da cliente (`page.context().browser().contexts()`), devolvendo a linha do tempo das mudanças — mede a janela de 5 min numa ação só. Atenção: `innerText` devolve o texto já com `text-transform`, e variáveis globais não sobrevivem entre chamadas
