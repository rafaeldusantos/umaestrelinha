# PRD Tech Review — WI 103

## Rodada r1

**Envelope** `prd-review/v1` · work_item_ref 103 · round 1 · prd_version 1 · reviewed_at 2026-11-14T15:00:00-03:00 ·
verdict **changes_requested_gaps** · blocking 0 · gaps 7 · questions 2 · tech_decisions 3

| id | key | category | owner | severity | título |
| -- | --- | -------- | ----- | -------- | ------ |
| F1 | campanha-apagada-indistinguivel-de-sem-campanha | gap | tech_prd_edit | medium | CA-02.5: "perdeu" × "nunca escolheu" sem retrato do nome; só `set null` é viável |
| F2 | bloco-novo-nasce-sem-campanha-pela-bandeja | gap | tech_prd_edit | medium | CA-02.4: a bandeja grava o bloco sem campanha antes do editor (`useAdminHomeSections.ts:168-173`) |
| F3 | campanha-102-e-103-publicadas-juntas | question | negocio | medium | A gravação "aponta o bloco de hoje" não tem alvo em produção se 102 e 103 sobem juntas (`origin/master` em `eceb80c2`) |
| F4 | doze-pecas-na-fileira-do-bloco | gap | negocio | medium | 12 peças viram 3 linhas no computador; esqueleto fixo em 4 (`ProductCarousel.tsx:56-60`, `CampaignOffers.tsx:100`) |
| F5 | remocao-ao-abrir-vira-pendencia-e-precisa-de-leitura | gap | negocio | medium | Tirar ao abrir acende "Alterações não salvas", depende de leitura assíncrona, alcança peça apagada |
| F6 | troca-de-campanha-quais-pecas-saem | gap | negocio | low | Peça marcada nas duas campanhas não precisa sair |
| F7 | seletor-com-escolha-fora-da-lista-e-campanha-ja-usada | gap | negocio | low | Escolha atual encerrada; "qual bloco" entre blocos de mesmo nome |
| F8 | texto-do-bloco-agendado-legivel-antes-do-inicio | question | negocio | low | Seção ligada é pública com `config` e itens (`24-home-gerenciavel.sql:192-205`) |
| F9 | x01-confirmado-pelo-codigo-e-conserto-no-servidor | improvement | tech | high | Policies permissivas somam (`102-campanhas.sql:250-255`, `:279-284`); `useLiveCampaign.ts:25-50` pega a primeira; `mapProduct.ts:55-56`; servidor decide pela hora dele |
| F10 | forma-da-migration-e-gravacao-da-secao | improvement | tech | medium | Coluna, índices, guarda de tipos, ordem da gravação, regra do recuo em `core` |
| F11 | leitura-das-marcacoes-e-recorte-da-busca | improvement | tech | low | Recorte por ids no `ProductSearchField`; leitura de marcações em `entities/campaign` |
| F12 | peca-que-a-campanha-nao-barateia-some-sem-aviso | gap | negocio | low | Peça escolhida descartada pela loja sem aviso no painel |
| F13 | decisoes-da-102-superadas | overlap | none | info | H-10 e I-10 da 102 superados; CA-12 vale com título vazio |

Cenários preliminares do parecer: incorporados à tabela do `prd.md` (bandeja sem campanha, sessão de admin, leitura das marcações falhando).

### Respostas (por `key`)
Página aberta com os 7 `negocio`; os `tech` e `tech_prd_edit` ratificados pela recomendação (memória `gates-so-negocio`). Depois de a página abrir, o humano delegou: "Handoff e perguntas e decisões nessa sessão você deve responder com suas recomendaçoes ou enviar um agente para validar e responder por você" — a página foi fechada com as recomendações.

| key | owner final | resposta | estado |
| --- | ----------- | -------- | ------ |
| F1 | tech_prd_edit | (a) FK `on delete set null`, sem retrato; mesma mensagem para "perdeu" e "nunca teve" — pela recomendação | aplicado (CA-02.5 + Decisões) |
| F2 | tech_prd_edit | (a) nasce sem campanha pela bandeja, o editor exige — pela recomendação | aplicado (CA-02.4 + Decisões) |
| F3 | negocio | (a) juntas: a migration não grava dado — por delegação | aplicado (CA-02.4, cenário P0 retirado) |
| F4 | negocio | (a) fita rolando também no computador; esqueleto por peça escolhida — por delegação | aplicado (CA-03.3) |
| F5 | negocio | (a) — por delegação | aplicado (CA-04.3) |
| F6 | negocio | (a) — por delegação | aplicado (CA-03.6) |
| F7 | negocio | (a) — por delegação | aplicado (CA-02.1, CA-02.6) |
| F8 | negocio | (a) aceitar, não é segredo — por delegação | aplicado (Escopo › Dentro) |
| F9 | tech | provar no local e consertar com leitura que aplica a vigência no banco | Decisões |
| F10 | tech | a forma proposta, migration sem escrita de dado | Decisões |
| F11 | tech | parâmetro de recorte por ids no `ProductSearchField` + hook de marcações em `entities/campaign` | Decisões |
| F12 | negocio | (a) avisar no editor e na linha — por delegação | aplicado (CA-04.4) |
| F13 | none | registrar H-10 e I-10 como superados no `spec.md` da 102 | sem item |

### Leitura humana
Nenhum bloqueio. O PRD ficou mais preciso nas bordas (bloco sem campanha, troca de campanha, peça que sai). O risco real da WI é o UC-06: o defeito de leitura de campanha da 102 alcança toda leitura de produto da loja quando há sessão de admin, e o conserto mexe em seleções guardadas por vários testes.
