# Sessão CH-01 (rodada 2) · Pôr no ar o bloco da campanha em vigência

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-01-por-o-bloco-da-vigente-no-ar.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-01 Adri · conta: admin-loja — `QA_ADMIN_LOJA_*`                    |
| Tour · modo | Feature · por cenário (J-01) — rodada de confirmação, sem tour         |
| Rodada      | confirmação                                                            |
| Orçamento   | 43 ações de browser de 35 — 37 até o fim da conferência (7 gastas porque a primeira navegação a `/admin/home` saiu antes do login concluir, e o login foi refeito) e 6 para sair da conta e fechar o browser |
| Ambiente    | painel http://localhost:8083 · build não exposto · Chromium (agent-browser 0.39.1, sessão `CH-01-r2`) · viewport 1440 × 900 · rotas `**/*.supabase.co/**` e `**/g/collect*` abortadas |
| Paridade    | Supabase local, massa sintética do manifesto do QA                    |

## Missão

Confirmar que a dona, sozinha e sem ajuda, tira o bloco "Joias em oferta" do estado "sem campanha" em que a
atualização o deixou, escreve o título e a descrição, escolhe e ordena três peças da campanha em vigência,
confere na prévia e o vê na loja com as palavras e a ordem dela.

Rodada 2: conferir a correção do BUG-001 (o Salvar com peça acrescentada não mostrava "Salvo") pelo TC-FUNC-006
e pelo TC-JOURNEY-001, e o TC-FUNC-007 que ficou sem veredito. Massa: B-2 ("Natal", agendada, título
"Natal QA"), não B-1.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrar no painel como admin-loja e abrir a Home | A primeira ida a `/admin/home` saiu antes do login concluir e voltou ao login; entrou na segunda tentativa. A lista mostra B-1 "Campanha “Dia das Mães” · em vigência até 30/11 às 23:59" e B-2 "Campanha “Natal” · agendada — começa em 01/12 às 00:00" | — |
| 02 | Abrir B-2 (17º bloco) | Editor com título "Natal QA", descrição vazia, "Natal" marcada ("Dia das Mães" desabilitada com o motivo "já está no 4º bloco…"), 2 peças: "Colar Afetivo Redonda…" e "Colar Afetivo Pata…" (aparecem como "já está no bloco" na busca); prévia da Home ao lado | — |
| 03 | Acrescentar "Colar Afetivo Corações Gravatinha com Cinzas de Cremação em Prata 925" (peça de Natal) e Salvar com um clique | O botão vira "Salvo ⌘S"; a lista tem 3 peças; o quadro da prévia continua o mesmo (o iframe e os nós de dentro mantêm as mesmas referências — não recarregou) | `screenshots/CH-01-r2-01-salvo-com-peca.png` |
| 04 | Tirar a 3ª peça ("Remover a 3ª peça") e Salvar logo em seguida | Depois de 25 s o botão continua "Salvar seção ⌘S", sem "Salvo", sem "Alterações não salvas" na tela, sem alerta (A-1, intermitente) | `screenshots/CH-01-r2-02-salvo-sem-peca.png` |
| 05 | Clicar Salvar de novo | "Salvo ⌘S". B-2 fica com "Natal QA" e as duas peças na ordem inicial (Redonda, Pata); a Gravatinha volta a ser oferecida na busca | — |
| 06 | Sair da conta (Sua conta → Sair) e fechar o browser | Volta a `/admin/login` | — |

**Edge cases tentados:** nada (rodada de confirmação)

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-006 | pass | 03, 05 | `screenshots/CH-01-r2-01-salvo-com-peca.png` | Salvar com peça acrescentada mostra "Salvo" e a prévia não desmonta — BUG-001 corrigido no caso que falhava. Passos 2 e 3 do TC (linha e reabrir) não reconferidos nesta rodada (passaram na rodada 1). Ver A-1 no entorno: o Salvar logo após remover uma peça não deu recibo uma vez |
| TC-JOURNEY-001 | pass | 03 | `screenshots/CH-01-r2-01-salvo-com-peca.png` | o passo 5 (que falhou na rodada 1) agora mostra "Salvo", conferido em B-2. O passo 6 (a loja como visitante com B-1, texto e ordem P-3, P-1, P-2) não foi reconferido nesta rodada — orçamento; passou na rodada 1, e a prévia do painel nesta sessão mostrava B-1 "Joias para guardar quem a gente ama" com Colméia (P-3), 6 Corações (P-1), Amor Mãe e Bebê (P-2), nessa ordem |
| TC-FUNC-007 | skip | — | — | orçamento esgotado; título 61, descrição 161, 13ª peça e Cancelar não tentados |

Contagem: pass 2 · fail 0 · blocked 0 · skip 1

## Achados

### A-1 · [Editor do bloco] Salvar logo depois de remover uma peça não deu "Salvo" nem gravou recibo — a dona não sabe se salvou

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-01, passo 8 (salvar) · passo 04 do log                              |
| TC                  | TC-FUNC-006 (entorno da correção do BUG-001)                         |
| Gravidade proposta  | high — sem recibo, a dona não sabe se a peça saiu do bloco; o segundo clique resolveu |
| Reproduziu          | intermitente (1 de 1; não houve orçamento para a segunda tentativa de estado limpo) |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:
1. Como admin-loja, em `http://localhost:8083/admin/home`, abrir B-2 (17º bloco, "Natal")
2. Acrescentar uma peça de Natal e Salvar — aparece "Salvo ⌘S"
3. Clicar "Remover a 3ª peça" e, logo em seguida, "Salvar seção ⌘S"
4. Esperar: o botão continua "Salvar seção ⌘S", sem "Salvo" e sem alerta (25 s); um segundo clique em Salvar mostra "Salvo"

**Esperado:** o selo "Salvo" depois de salvar — **fonte:** PRD CA-01.2 · TC-FUNC-006 passo 1

**Observado:** no primeiro clique depois da remoção, nada mudou na tela: nem "Salvo", nem "Alterações não salvas",
nem mensagem. Não se sabe se a primeira tentativa gravou (a loja não mostra B-2, que é de campanha agendada). Os
dois cliques foram enviados em sequência imediata pelo driver; é possível que o clique em Salvar tenha caído
enquanto a lista ainda se refazia depois da remoção.

**Evidência:**
- `screenshots/CH-01-r2-02-salvo-sem-peca.png` — o botão "Salvar seção" depois de 25 s, com 2 peças na lista
- console: não lido
- rede: não lida

## Spec-gaps

nada

## Fora da cobertura

- TC-FUNC-007 inteiro (título 61, descrição 161, 13ª peça, Cancelar) — orçamento. A 13ª peça não seria
  alcançável em B-2 de qualquer modo: a busca de "Natal" oferecia só 4 peças
- TC-JOURNEY-001 passo 6 na loja como visitante (sessão `CH-01-r2-anon`, B-1 com texto e ordem P-3, P-1, P-2) —
  orçamento; não aberta
- Segunda tentativa de A-1 de estado limpo — orçamento
- TC-FUNC-006 passos 2 e 3 (linha da lista e reabrir depois de recarregar) — não reconferidos; passaram na
  rodada 1

## Debrief

- **Surpresas:** a primeira ida a `/admin/home` disparou antes do login terminar e custou 7 ações; o Salvar
  logo depois de remover uma peça ficou sem recibo uma vez (A-1)
- **Próximo charter:** uma sessão curta (≈ 20 ações) só para o TC-FUNC-007 em B-2 e a reprodução de A-1
  (remover → Salvar, duas vezes de estado limpo, com console e rede), e a conferência da loja como visitante
- **Padrão novo:** remover e salvar em sequência imediata — candidato a edge case do editor
