# Sessão CH-05 · Adri com uma configuração que a loja não conhece e a rede caindo ao salvar

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-05-adri-com-configuracao-estranha-e-rede-caida.md` · exploratório · P1 |
| Status      | done                                                                   |
| Persona     | PER-01 Adri · conta: `admin-loja` — `QA_ADMIN_LOJA_*`                  |
| Tour · modo | Network · por técnica (adivinhação de erro)                            |
| Rodada      | confirmação (rodada 2): só o TC-FUNC-013 e o entorno de BUG-001 e BUG-002 |
| Orçamento   | 20 ações de browser de 25 (contadas por chamada encadeada; o login e a saída contam) |
| Ambiente    | painel http://localhost:8183/admin · loja http://localhost:8182 · build não exposto · Chromium (agent-browser 0.39.1) · viewport 1440 × 900 |
| Paridade    | dev server local do worktree; rotas abortadas `*.supabase.co` e `**/g/collect*`; rede caída por `set offline on`; leitura da configuração cortada por rota abortada em `**/rest/v1/store_settings?select=*` (o driver não responde 500, só aborta) |

## Missão

Como a dona num dia de conexão ruim, achar qualquer jeito de o card dizer que salvou quando não salvou, de a loja
quebrar com uma configuração estranha, ou de a escolha ficar num estado que não é nem o salvo nem o marcado.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entra no painel e abre Configurações › Dados da loja, com S2 (`neon`) | Card: "Padrão" marcado com "Em uso", "Black Friday" sem selo, "Salvar alterações" do card desabilitado | — |
| 02 | Marca Black Friday, corta a rede (offline) e clica em "Salvar alterações" | Na hora (mesmo segundo), aviso: "Sem conexão. O perfil ainda não foi salvo: ele é gravado quando a conexão voltar, com esta página aberta." Nenhuma "Perfil salvo"; "Em uso" segue no Padrão; botão do card desabilitado (gravação pendente) | `screenshots/2026-11-14-r2/CH-05-01-offline-salvar-aviso.png` |
| 03 | Devolve a rede | A gravação pendente sai sozinha, como o aviso disse: `POST /rest/v1/store_settings?on_conflict=key → 200`, seguido de `GET …?select=key,value → 200`; aparece "Perfil salvo"; "Em uso" passa a Black Friday. Enquanto offline, nenhum `POST` chegou ao servidor | — |
| 04 | Com Black Friday salvo, recarrega a seção com a leitura da configuração cortada (`GET /rest/v1/store_settings?select=…` abortado) | Card **sem nenhum "Em uso"**, as duas opções desabilitadas, aviso "Não foi possível ler o perfil salvo da loja. Enquanto ele não carregar, as opções ficam desabilitadas." e botão "Tentar de novo"; "Salvar alterações" desabilitado. O rádio Padrão aparece com `checked` (desabilitado), sem selo | `screenshots/2026-11-14-r2/CH-05-02-leitura-abortada-card.png` |
| 05 | Clica em "Tentar de novo" com a leitura ainda cortada | Mesmo estado do passo 04, sem "Em uso" falso | — |
| 06 | Devolve a leitura e clica em "Tentar de novo" | Card: Black Friday marcado com "Em uso", opções habilitadas, botão desabilitado (nada a salvar) | — |
| 07 | Repete o passo 04 (recarregar com a leitura cortada) e depois recarrega com a leitura de volta | 2 de 2: aviso de leitura, nenhum "Em uso"; com a leitura de volta, Black Friday "Em uso" | — |
| 08 | Duas abas do painel na seção (ambas Black Friday "Em uso"); na aba 2 marca Padrão e salva | "Perfil salvo"; aba 2: Padrão "Em uso" | — |
| 09 | Volta à aba 1, sem recarregar | Aba 1 segue com Black Friday "Em uso" (agora falso) e Black Friday marcado; "Salvar alterações" desabilitado, então a dona não consegue gravar Black Friday dali sem recarregar. Não atualiza ao voltar à aba | `screenshots/2026-11-14-r2/CH-05-03-aba1-desatualizada.png` |
| 10 | Recarrega a aba 1, marca Black Friday e salva com rede | "Perfil salvo. Quem abrir a loja vê o perfil novo em até 1 hora."; Black Friday "Em uso" | `screenshots/2026-11-14-r2/CH-05-04-bf-salvo-com-rede.png` |
| 11 | Volta à aba 2, sem recarregar | Aba 2 mostra Padrão "Em uso" (falso: Black Friday está salvo), Padrão marcado e "Salvar alterações" desabilitado: dali a dona não consegue desligar a campanha sem recarregar | `screenshots/2026-11-14-r2/CH-05-05-aba2-padrao-em-uso-falso.png` |
| 12 | Fecha a aba 2 e abre a loja numa aba nova | Black Friday: cabeçalho `rgb(13, 12, 11)`, `data-perfil="black-friday"`. **Estado final: Black Friday salvo pela tela** | `screenshots/2026-11-14-r2/CH-05-06-loja-bf-nova-aba.png` |
| 13 | Sai da conta (Sua conta › Sair) e fecha o browser | Volta ao login | — |

**Edge cases tentados:** só os do foco da confirmação — salvar offline (passo 02), rede de volta (03), leitura da
configuração abortada na carga e no "Tentar de novo" (04–07), duas abas desatualizadas (08–11). Nenhum edge case novo.

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-013 | pass | 02–07, 10, 12 | `screenshots/2026-11-14-r2/CH-05-01-offline-salvar-aviso.png`, `screenshots/2026-11-14-r2/CH-05-02-leitura-abortada-card.png`, `screenshots/2026-11-14-r2/CH-05-04-bf-salvo-com-rede.png` | Passo 1: aviso de falha imediato, sem "Perfil salvo", "Em uso" no anterior (BUG-002 não se repete). Passo 2: com a página aberta, a gravação pendente sai ao voltar a rede — o próprio aviso do passo 1 diz isso, então não é sucesso falso; o "Em uso no perfil anterior" do TC só vale se a dona fechar a aba antes da rede voltar (o TC foi escrito antes desse comportamento: ajuste de redação para a triagem). Passo 3: frase de H8 e "Em uso" no novo. Variação "carregando": com a leitura falhando, opções desabilitadas e nenhum "Em uso" (BUG-001 não se repete, 2 de 2). Variação "duas abas": depois de recarregar, "Em uso" bate com a loja |

Contagem: pass 1 · fail 0 · blocked 0 · skip 0

## Achados

nada

**Sugestão de backlog (não é regressão nem critical/high; registrada a pedido do árbitro):** aba do painel
desatualizada afirma o perfil antigo como "Em uso" e deixa o botão do card desabilitado, de modo que a dona não grava
dali o perfil que a aba mostra como já salvo (passos 09 e 11). Na direção perigosa (passo 11: Black Friday salvo em
outra aba, esta mostra Padrão "Em uso"), ela não consegue desligar a campanha sem recarregar. Mesmo comportamento da
rodada 1 (spec-gap já registrado lá); recarregar resolve. Ideia: reler a configuração ao voltar o foco à aba, ou
habilitar salvar quando a escolha difere do que o servidor tem.

## Spec-gaps

nada

## Fora da cobertura

- Leitura da configuração respondendo 500 (em vez de abortada): o `network route` do agent-browser só aborta ou
  responde corpo fixo com 200; testado só o abortar
- Rede lenta (resposta atrasada) e clique duplo com rede lenta: o driver não atrasa resposta
- Segunda repetição do salvar offline (passo 02): não refeita para preservar orçamento e o estado final; reproduziu 1 de 1
  nesta rodada, sem achado
- Viewport 390 × 844: o foco da confirmação não pedia; rodado só em 1440 × 900
- TC-FUNC-012: já passou na rodada 1, não refeito (briefing)

## Debrief

- **Surpresas:** o aviso offline promete gravar quando a conexão voltar e cumpre — a redação do passo 2 do
  TC-FUNC-013 ("Em uso no perfil anterior" depois de devolver a rede) não prevê isso
- **Próximo charter:** nada
- **Padrão novo:** nada
