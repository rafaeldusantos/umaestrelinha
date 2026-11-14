# Sessão CH-05 · Adri com uma configuração que a loja não conhece e a rede caindo ao salvar

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-05-adri-com-configuracao-estranha-e-rede-caida.md` · exploratório · P1 |
| Status      | done                                                                   |
| Persona     | PER-01 Adri · conta: `admin-loja` — `QA_ADMIN_LOJA_*`                  |
| Tour · modo | Network · por técnica (adivinhação de erro)                            |
| Rodada      | exploração                                                             |
| Orçamento   | 37 ações de browser de 50 (contadas por chamada encadeada, como o briefing pede; o login conta) |
| Ambiente    | loja http://localhost:8082 · painel http://localhost:8083/admin · build não exposto · Chromium (agent-browser 0.39.1) · viewport 1440 × 900 |
| Paridade    | dev server local: o `<html>` não vem marcado por `api/page` (fora do alcance local, como o ambiente avisa); rotas abortadas `*.supabase.co` e `**/g/collect*`; falhas de rede provocadas por `set offline` e por rota abortada |

## Missão

Como a dona num dia de conexão ruim, achar qualquer jeito de o card dizer que salvou quando não salvou, de a loja
quebrar com uma configuração estranha, ou de a escolha ficar num estado que não é nem o salvo nem o marcado.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Com S2 (`neon`), abre a loja (Home) | Paleta Padrão (cabeçalho `rgb(40, 58, 74)` = `#283A4A`), `data-perfil="padrao"`, sem erro na tela nem no console. A faixa "Black Friday · novembro inteiro…" é conteúdo da faixa de avisos, não o perfil | `screenshots/2026-11-14-r1/CH-05-01-home-padrao-neon.png` |
| 02 | Abre um produto (Joia Afetiva Árvore da Vida…) | Padrão, cabeçalho `#283A4A`, sem erro | `screenshots/2026-11-14-r1/CH-05-02-produto-padrao-neon.png` |
| 03 | Entra no painel e abre Configurações › Dados da loja, card "Perfil de estilo da loja" | "Padrão" marcado com "Em uso"; "Black Friday" sem selo; "Salvar alterações" do card desabilitado; sem erro | `screenshots/2026-11-14-r1/CH-05-03-card-neon-padrao-em-uso.png` |
| 04 | Marca Black Friday, corta a rede (offline) e clica em Salvar | O botão fica desabilitado (opacidade 0,5) com um spinner, o rótulo segue "Salvar alterações", nenhuma mensagem (nem de erro, nem de "sem conexão"); "Em uso" continua no Padrão. Nenhuma "Perfil salvo" enquanto offline | `screenshots/2026-11-14-r1/CH-05-04-offline-salvar.png` |
| 05 | Devolve a rede | A gravação que estava parada sai sozinha (`POST /rest/v1/store_settings?on_conflict=key → 200`), aparece "Perfil salvo. Quem abrir a loja vê o perfil novo em até 1 hora." e "Em uso" passa a Black Friday | — |
| 06 | Repete: marca Padrão, corta a rede, salva e espera 46 s | Mesmo estado do passo 04 por 46 s: spinner, botão desabilitado, nenhuma mensagem. Ao devolver a rede, salva Padrão e mostra a frase de H8 | `screenshots/2026-11-14-r1/CH-05-05-offline-45s-sem-aviso.png` |
| 07 | Salva Black Friday com a gravação abortada (a requisição falha em vez de ficar parada) | Aviso "Erro ao salvar — Tente novamente."; "Em uso" segue no Padrão; Black Friday segue marcado; botão volta a habilitado | `screenshots/2026-11-14-r1/CH-05-06-gravacao-abortada-erro.png` |
| 08 | Recarrega logo depois da falha; abre a loja numa aba nova | Card: Padrão marcado com "Em uso", botão desabilitado (a escolha não salva foi descartada); loja em Padrão (`#283A4A`) | — |
| 09 | Marca Black Friday e dá duplo clique em Salvar (rede normal) | Uma gravação só (um `POST … → 200`), um aviso "Perfil salvo. Quem abrir a loja vê o perfil novo em até 1 hora."; "Em uso" em Black Friday | `screenshots/2026-11-14-r1/CH-05-07-bf-salvo-com-rede.png` |
| 10 | Abre a loja numa aba nova | Black Friday (`data-perfil="black-friday"`, cabeçalho `rgb(13, 12, 11)`) | `screenshots/2026-11-14-r1/CH-05-08-loja-bf-nova-aba.png` |
| 11 | Recarrega a seção com a leitura da configuração cortada (`GET /rest/v1/store_settings?select=…` abortado), com Black Friday salvo | O card mostra "Padrão" marcado com "Em uso", as opções habilitadas, nenhum aviso de que a configuração não carregou. A loja está em Black Friday. Repetido: mesmo resultado (A-2) | `screenshots/2026-11-14-r1/CH-05-09-carga-sem-config.png` |
| 12 | Duas abas do painel na seção (ambas Black Friday "Em uso"); salva Padrão na aba 1 e olha a aba 2 | A aba 2 segue mostrando Black Friday "Em uso" com o botão desabilitado, sem atualizar ao voltar a ela (spec-gap) | `screenshots/2026-11-14-r1/CH-05-10-aba2-desatualizada.png` |
| 13 | Na aba 2, marca Padrão e salva; recarrega as duas | As duas mostram Padrão "Em uso" depois de recarregar | — |
| 14 | Salva Black Friday na aba 2; na aba 1 (que mostra Padrão "Em uso") tenta voltar ao Padrão | Aba 1 diz Padrão "Em uso" com a loja em Black Friday; o botão fica desabilitado, não há como desligar a campanha sem recarregar (spec-gap) | `screenshots/2026-11-14-r1/CH-05-11-aba1-nao-desliga-bf.png` |
| 15 | Recarrega a aba 1, marca Padrão e salva; loja numa aba nova | Card: Padrão "Em uso"; loja em Padrão (`#283A4A`). **Estado final: Padrão salvo pela tela** | `screenshots/2026-11-14-r1/CH-05-12-padrao-final.png` |
| 16 | Marca Black Friday sem salvar, vai ao Dashboard e volta | A escolha não salva some sem aviso; o card volta ao salvo (Padrão "Em uso") — nenhuma fonte pede aviso | — |
| 17 | Sai da conta (Sua conta › Sair) | Volta ao login | — |

**Edge cases tentados:**

- Cortar a rede antes de salvar e esperar (passos 04 e 06) — a gravação fica parada sem aviso (A-1)
- Gravação que falha de fato (rota abortada, passo 07) — erro no molde do painel, sem sucesso falso
- Recarregar logo depois de uma falha (passo 08) — volta ao salvo
- Duplo clique em Salvar com rede normal (passo 09) — uma gravação, uma mensagem
- Configuração que não chega na carga (passo 11) — A-2
- Duas abas (passos 12 a 14) — spec-gap
- Sair da seção com escolha não salva e voltar (passo 16)
- Mensagem de erro em linguagem simples: "Erro ao salvar — Tente novamente." (passo 07) — não culpa a pessoa, não diz sucesso

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-012 | pass | 01–03, 05, 10 | `screenshots/2026-11-14-r1/CH-05-01-home-padrao-neon.png`, `screenshots/2026-11-14-r1/CH-05-03-card-neon-padrao-em-uso.png`, `screenshots/2026-11-14-r1/CH-05-08-loja-bf-nova-aba.png` | Loja e card em Padrão com `neon`, sem erro; botão do card desabilitado. Variação "salvar a partir dele": Black Friday gravou e a loja nova abre em Black Friday |
| TC-FUNC-013 | fail | 04–11 | `screenshots/2026-11-14-r1/CH-05-04-offline-salvar.png`, `screenshots/2026-11-14-r1/CH-05-05-offline-45s-sem-aviso.png`, `screenshots/2026-11-14-r1/CH-05-09-carga-sem-config.png` | Passo 1: offline não há indicação de falha (A-1); com a requisição abortada há ("Erro ao salvar"). Passos 2 e 3 passam. Variação "carregando": falha (A-2). Variação "duas abas": passa depois de recarregar. Variação "clique duplo com rede lenta": só com rede normal (uma gravação) — rede lenta fora da cobertura |

Contagem: pass 1 · fail 1 · blocked 0 · skip 0

## Achados

### A-1 · [Card do perfil · salvar sem conexão] A gravação fica parada com spinner, sem nenhum aviso, enquanto a rede está fora — a dona não sabe se salvou

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-01, ramo J-01b (salvar sem conexão) · passos 04 e 06 do log         |
| TC                  | TC-FUNC-013                                                           |
| Gravidade proposta  | medium — nada diz sucesso falso, mas a dona fica diante de um spinner sem fim e sem saber se a campanha entrou; se ela fecha a aba, nada salvou e ela não sabe. Ponto de partida Dano à confiança (high), descido um degrau porque, se a rede volta com a aba aberta, o produto salva e avisa sozinho |
| Reproduziu          | sim (2 de 2)                                                          |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. Como `admin-loja`, abrir `http://localhost:8083/admin/configuracoes/dados-da-loja` com rede normal
2. No card "Perfil de estilo da loja", marcar o perfil que não está "Em uso"
3. Cortar a rede (modo offline do browser) e clicar em "Salvar alterações" do card
4. Esperar (testado até 46 s)

**Esperado:** nenhuma "Perfil salvo…"; **uma indicação de falha (molde do painel)**; "Em uso" no perfil anterior — **fonte:** TC-FUNC-013 passo 1; spec H9 (estado de erro, molde `SettingsSaveButton`/`useSettingsSave`)

**Observado:** o botão fica desabilitado (opacidade 0,5) com um ícone girando, o rótulo segue "Salvar alterações", e nenhuma mensagem aparece — nem erro, nem "sem conexão" — por pelo menos 46 s. "Em uso" segue no perfil anterior (correto). Ao devolver a rede, a mesma gravação sai sozinha e aparece "Perfil salvo. Quem abrir a loja vê o perfil novo em até 1 hora.". Com a requisição abortada (falha imediata), o erro aparece certo: "Erro ao salvar — Tente novamente." (passo 07) — o problema é só a espera sem fim offline.

**Evidência:**

- `screenshots/2026-11-14-r1/CH-05-04-offline-salvar.png` — spinner, nenhuma mensagem, "Em uso" no Padrão
- `screenshots/2026-11-14-r1/CH-05-05-offline-45s-sem-aviso.png` — o mesmo estado depois de 46 s
- console: nada (só avisos de dev do React Router)
- rede: nenhum `POST` enquanto offline; ao reconectar, `POST /rest/v1/store_settings?on_conflict=key → 200`

### A-2 · [Card do perfil · carga] Se a configuração não chega, o card mostra "Padrão · Em uso" com as opções habilitadas — com a loja em Black Friday

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-01 (voltar ao Padrão depois da campanha) · passo 11 do log          |
| TC                  | TC-FUNC-013 (variação "carregando")                                    |
| Gravidade proposta  | high — a dona vem desligar a campanha, lê "Padrão · Em uso", o botão está desabilitado e ela conclui que a loja já voltou; a loja segue em Black Friday. Pode subir a critical pela regra "contorna e chega a um estado errado"; ficou em high porque depende de a leitura falhar e um recarregar com rede corrige |
| Reproduziu          | sim (2 de 2)                                                          |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. Como `admin-loja`, salvar "Black Friday" no card (rede normal); conferir a loja em Black Friday numa aba nova
2. Fazer a leitura da configuração falhar (no teste: abortar `GET /rest/v1/store_settings?select=key,value`; na vida real, a rede caindo na carga)
3. Recarregar `http://localhost:8083/admin/configuracoes/dados-da-loja` e esperar

**Esperado:** as opções desabilitadas enquanto a configuração não chega, e o card não mostra "Em uso" errado — **fonte:** spec H9; TC-FUNC-013 variação "carregando"; charter CH-05, "Deve tentar" 3

**Observado:** o card mostra "Padrão" marcado com o selo "Em uso", "Black Friday" sem selo, as duas opções habilitadas e "Salvar alterações" desabilitado; nenhuma mensagem de que a configuração não carregou. A loja, numa aba nova, está em Black Friday.

**Evidência:**

- `screenshots/2026-11-14-r1/CH-05-09-carga-sem-config.png` — card "Padrão · Em uso" com Black Friday salvo
- console: nada
- rede: `GET /rest/v1/store_settings?select=key,value` abortado (provocado)

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| Uma segunda aba do painel não atualiza "Em uso" depois que a outra salva, nem ao voltar o foco: mostra o perfil antigo como "Em uso" e o botão fica desabilitado, então dali a dona não consegue desligar a campanha que a outra aba ligou sem recarregar. O TC só define o estado depois de recarregar | 12, 14 | mudança |
| O botão de fechar do aviso (toast) do painel não tem nome acessível (`button` sem rótulo no snapshot) | 05, 07, 09 | pré-existente |

## Fora da cobertura

- Rede lenta (resposta atrasada) na carga e na gravação, e o duplo clique com rede lenta — o `agent-browser` só aborta ou responde, não atrasa; o duplo clique foi feito com rede normal (passo 09)
- Cortar a rede "durante a gravação, depois do envio e antes da resposta" — sem atraso não há janela; o corte foi antes do clique (passos 04 e 06) e a falha imediata por rota abortada (passo 07)
- Esperar os 120 s de paciência da persona no estado offline — parado em 46 s
- Rede cortada na carga pelo modo offline — recarregar offline dá a página de erro do browser; a carga sem configuração foi provocada abortando a leitura (passo 11)
- A marca `data-perfil` vinda de `api/page` na primeira pintura — não serve localmente (ambiente)
- Viewport 390 × 844 — o charter e a persona pedem 1440 × 900

## Debrief

- **Surpresas:** offline a gravação não falha, fica parada e sai sozinha quando a rede volta — o "sucesso" chega depois, sem a dona pedir de novo. Na carga com a leitura abortada, o formulário "Dados da loja" acima do card também mostrou valores diferentes dos salvos (ex.: o e-mail de contato) — outra chave de `store_settings`, fora do escopo, só anotado
- **Próximo charter:** carga e gravação com resposta atrasada (driver `cli`/`mcp` com `page.route` e atraso) para o estado "carregando" de H9 e o duplo clique com rede lenta
- **Padrão novo:** abortar a leitura da configuração na carga — achou o "Em uso" falso (A-2)
