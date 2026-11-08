```json
{
  "schema": "qa-plan/v1",
  "title": "Plano de QA — Montar pedido no app do ateliê, com a leitura dos dados da cliente por IA",
  "summary": {
    "total_cases": 58,
    "by_priority": { "P0": 24, "P1": 29, "P2": 5, "P3": 0 }
  },
  "acceptance_criteria_covered": 10,
  "strategy": [
    "Exploração por charter no browser real (Playwright MCP ou playwright-cli), uma persona por sessão, em 390 × 844 (o painel em 1440)",
    "E2E (Playwright) pedido à automação p/ fluxos P0/P1 determinísticos — sem a leitura real por IA",
    "Manual p/ a leitura por IA (modelo real), usabilidade, acessibilidade, fonte grande e conferência contra o protótipo"
  ],
  "cases": [
    { "id": "TC-SMOKE-001", "title": "Pedidos abre com Montar pedido e o chip Montados", "priority": "P0", "type": "smoke", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-SMOKE-002", "title": "Um pedido mínimo para cliente cadastrada chega ao link", "priority": "P0", "type": "smoke", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-SMOKE-003", "title": "Um pedido montado aberto mostra o link para copiar", "priority": "P0", "type": "smoke", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-001", "title": "Adri monta pelo celular o pedido de uma cliente nova a partir da conversa e manda o link pelo WhatsApp", "priority": "P0", "type": "journey", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-JOURNEY-002", "title": "Adri monta pelo celular o pedido de uma cliente cadastrada, com desconto combinado, e cria o link", "priority": "P0", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-003", "title": "Adri retoma a montagem depois de o celular bloquear e cria o link", "priority": "P1", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-004", "title": "Adri reabre um pedido montado dias depois, copia o mesmo link e a cliente o abre na loja", "priority": "P0", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-005", "title": "Adri reabre no computador um pedido montado pelo app, copia o link e renova o vencido", "priority": "P1", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-006", "title": "Quem entra no app com uma conta sem acesso ao ateliê é barrado sem ver dado de cliente e troca para a conta certa", "priority": "P1", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-001", "title": "A visão Montados mostra o chip com os abertos ao fim dos chips e um cartão por pedido montado", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-002", "title": "A barra da montagem diz por que não dá para seguir e libera o botão quando o motivo some", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-003", "title": "O voltar do Android recua um passo, fecha a folha aberta e o indicador só leva até o passo já alcançado", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-004", "title": "Fechar a montagem com algo preenchido pergunta antes e oferece guardar o rascunho quando há peças", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-005", "title": "O rascunho volta só com as peças e os descontos depois de o app fechar", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-006", "title": "A busca de cliente cadastrada acha por nome, e-mail ou telefone e põe a entrega no endereço padrão", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-007", "title": "A entrega da cliente cadastrada aceita outro endereço salvo, um endereço novo ou deixar a cliente preencher no link", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-008", "title": "A cliente nova exige nome, e-mail válido e endereço completo, com o CPF opcional", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-009", "title": "E-mail que já tem ficha oferece usar a ficha dela ou corrigir, sem nascer uma segunda ficha", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-010", "title": "O CEP com 8 dígitos completa o endereço, e o CEP não achado libera os campos para digitar", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-011", "title": "Ler o texto da conversa preenche contato e endereço, marca cada campo lido e diz o que faltou", "priority": "P0", "type": "functional", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-FUNC-012", "title": "Editar um campo lido tira a marca, e Desfazer devolve exatamente o que havia antes da leitura", "priority": "P1", "type": "functional", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-FUNC-013", "title": "Colar o endereço de uma cliente cadastrada preenche só o endereço e nunca muda a ficha dela", "priority": "P0", "type": "functional", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-FUNC-014", "title": "Texto sem dados deixa a folha aberta com a frase e o botão Preencher à mão", "priority": "P1", "type": "functional", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-FUNC-015", "title": "Com a leitura fora do ar ou no limite, a Adri preenche à mão sem perder nada do que já fez", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-016", "title": "A busca de peças mostra a capa, o preço a partir de, o estoque e se pede material", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-017", "title": "A folha da variação troca a foto, desliga a esgotada e não deixa passar do estoque somando a sacola", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-018", "title": "A gravação aparece só na peça que aceita, com o teto, e a peça que pede material avisa", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-019", "title": "A sacola mostra a foto da variação escolhida e deixa editar e remover cada peça", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-020", "title": "A promoção vigente aparece na folha da variação e na linha da sacola", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-021", "title": "O cupom segue a regra da loja com o e-mail da cliente e recusa com o texto da loja", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-022", "title": "O desconto combinado exige motivo e o que zeraria o pedido fica fora da conta", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-023", "title": "O resumo acompanha cada mudança na ordem promoção, cupom, combinado, com o valor no PIX", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-024", "title": "A revisão mostra as peças com foto primeiro, a cliente, a entrega com a prévia da cotação e a observação", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-025", "title": "Criar link grava uma vez só e abre o pedido montado", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-026", "title": "Preço que mudou enquanto a Adri montava recusa o link e mostra o resumo relido", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-027", "title": "O pedido montado aberto mostra o link sempre, também ao reabrir, e copiar ou WhatsApp ficam no histórico", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-028", "title": "As ações do pedido montado seguem o estado: cancelar a aberta, renovar só a vencida, ver o pedido da concluída", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-029", "title": "Editar um pedido montado aberto reabre a montagem com o que foi gravado e mantém o mesmo link", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-030", "title": "A observação interna se edita no pedido montado em todo estado menos o concluído", "priority": "P2", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-031", "title": "Pedido montado aberto sem link guardado oferece Gerar link novo", "priority": "P2", "type": "functional", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-FUNC-032", "title": "No painel, o pedido montado reaberto mostra o link para copiar e só oferece renovar depois de vencer", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-033", "title": "No painel, Salvar no cadastro grava o endereço junto com o pedido montado, numa gravação só", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-INT-001", "title": "Criar link com uma cliente nova cria a ficha com CPF e endereço uma vez só, e nada antes disso", "priority": "P0", "type": "integration", "automation": { "target": "integration", "status": "missing" } },
    { "id": "TC-INT-002", "title": "O link copiado de um pedido montado reaberto abre na loja com os preços travados, e o renovado ou cancelado deixa de abrir", "priority": "P0", "type": "integration", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-INT-003", "title": "Quando a cliente conclui no link, o pedido montado vira Concluída com o número do pedido nos dois apps", "priority": "P1", "type": "integration", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-SEC-001", "title": "Conta sem acesso ao ateliê vê a recusa na montagem, em Montados e no pedido montado, sem dado de cliente", "priority": "P0", "type": "security", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-SEC-002", "title": "Nada da cliente fica guardado no celular nem no endereço das telas da montagem", "priority": "P0", "type": "security", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-SEC-003", "title": "CPF e endereço completo aparecem só na montagem e no pedido montado, nunca em Clientes nem no detalhe do pedido", "priority": "P1", "type": "security", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-UI-001", "title": "As telas da montagem e do pedido montado conferem com o protótipo no celular", "priority": "P1", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-UI-002", "title": "Peça sem foto aparece no fundo areia com a estrela da marca em todo lugar da montagem", "priority": "P2", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-001", "title": "No celular, a montagem e o pedido montado não rolam de lado e os alvos têm 44 px, com a fonte a 100, 130 e 200 %", "priority": "P1", "type": "cfr", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-002", "title": "Folhas, barra e marcas de leitura são operáveis e anunciadas pela árvore de acessibilidade", "priority": "P1", "type": "cfr", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-003", "title": "Cada espera da montagem mostra que está trabalhando", "priority": "P2", "type": "cfr", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-004", "title": "Rede que cai no meio da montagem não perde o que a Adri digitou e diz o próximo passo", "priority": "P1", "type": "cfr", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-PERSONA-001", "title": "Adri monta e manda um pedido inteiro com uma mão, no celular, sem ajuda", "priority": "P1", "type": "persona", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-PERSONA-002", "title": "Adri com a fonte do sistema a 200 % conclui a montagem", "priority": "P2", "type": "persona", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-REG-001", "title": "A lista de Pedidos e os recortes de antes seguem iguais, e a barra de abas some só nas telas novas", "priority": "P1", "type": "regression", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-REG-002", "title": "A montagem do painel segue criando o pedido montado que a cliente conclui no link", "priority": "P1", "type": "regression", "automation": { "target": "e2e", "status": "missing" } }
  ]
}
```

# Plano de QA — 94 · Montar pedido no app do ateliê, com a leitura dos dados da cliente por IA

**Work Item:** 94 (feature) · **Escopo:** completo · **Foco:** —
**Versão do plano:** 2 · **Escrito em:** 2026-11-08 · **Modo:** revisar (resposta da Q-01)
**Gate 1:** aprovado em 2026-11-08 (árbitro do orquestrador, pela política do humano)

## Resumo

- **Valor para o usuário:** a Adri monta, no celular, o pedido que a cliente acertou no WhatsApp — escolhe a
  cliente (ou cola a conversa e deixa a IA preencher contato e endereço para ela conferir), escolhe as peças
  pela foto, aplica cupom e desconto combinado, e cria um link de pagamento com o preço travado. Dias depois,
  reabre o pedido montado e reenvia o MESMO link, no app ou no painel. A cliente conclui no link, na loja.
- **Maior risco para o usuário:** o link que a Adri reenvia não ser o que a cliente tem (abre "não
  disponível"), ou a leitura do texto preencher um campo errado — ou mexer na ficha de quem já é cliente —
  sem a Adri perceber antes de criar o link.
- **Contagens:** personas 6 · jornadas 6 · charters 9 (CFR 1 · design-check 1) · TC 58 (P0 24 · P1 29 · P2 5 · P3 0)
- **Automação:** e2e 41 (missing 41 · existing 0 · blocked 0) · integration 1 · manual 16

## Escopo

**Dentro:** no app do ateliê (`apps/mobile-adm`, :8084): "Montar pedido" e a visão Montados em Pedidos; a
montagem em 4 passos (barra, motivos, voltar — inclusive o voltar depois de "Criar link", D-43 —, sair,
rascunho); passo 1 cadastrada e nova (busca, entrega, MON-03, CEP); a folha "Colar texto" e a function
`customer-parse`; passo 2 (busca, folha da variação, sacola, foto, promoção); passo 3 (cupom, combinado,
resumo, PIX); passo 4 (revisão, cotação, observação, Criar link, PRC-02); o pedido montado (link sempre,
WhatsApp/Copiar, histórico, ações por estado, Editar, observação). No painel (:8083): o cartão do link sempre,
Renovar só no vencido, o endereço salvo pela function. Na loja (:8082): só abrir `/pedido-montado` pelo link e
a conclusão como efeito.

**Fora:** a Política de Privacidade (risco aceito no PRD); "Colar texto" no painel (WI seguinte); registrar
pedido já pago por fora (PRD); o checkout da loja além de abrir o link e concluir com PIX (feature 89); a aba
Clientes e o detalhe do pedido além da conferência de privacidade (TC-SEC-003); "Duplicar" do painel (só no
desenho); o Android real (gesto físico de voltar, PWA instalado, TalkBack, fonte do sistema) — simulado no
browser e registrado em Fora da cobertura.

## Fontes

| Fonte      | Caminho                             | Uso                                        |
| ---------- | ----------------------------------- | ------------------------------------------ |
| PRD        | `.specs/work-items/94-montar-pedido-no-app/prd.md` (r1) | os comportamentos e os textos — sem IDs; a régua usa os UC da costura |
| Costura    | `spec.md` (UC-01..UC-10; Design; Decisões D-01..D-43) | os critérios numerados (UC), o que ficou fora, as decisões que vencem o protótipo; D-43 é a resposta da Q-01 |
| Fontes de design | `claude_design` · projeto `a780eec8-8aba-4d6e-8b4c-2c485e2750c7`, `Montar Pedido.dc.html` + `montado-dados.js` (base `Ateliê Admin.dc.html`) · de item.md › Insumos e prd.md | telas do app; charter CH-09 |
| Insumos    | `tasks/01..10`, `session-summary.md`, `waves.md`; `.specs/features/89-pedido-montado-pelo-painel/spec.md`; `apps/mobile-adm/CLAUDE.md` | pendências de ambiente, comportamentos a observar, rotas, editar mantém o link (89) |
| Validation | `qa-report.md` (PASS, 2026-11-08)   | gate técnico; "o que só o navegador prova" |
| Projeto    | `.specs/project/PROJECT.md`         | ambiente local (Supabase 54441), restrições |
| Respostas  | página de perguntas, 2026-11-08     | Q-01 → D-43 (voltar depois de "Criar link") |

## Personas

Detalhe em [personas.md](personas.md).

| ID     | Nome                       | Arquétipo                       | Objetivo                                                          | Conta               | Jornadas         |
| ------ | -------------------------- | ------------------------------- | ----------------------------------------------------------------- | ------------------- | ---------------- |
| PER-01 | Adri no WhatsApp           | Usuário mobile                  | montar no celular e mandar o link sem sair do aparelho            | `admin-atelie`      | J-01, J-02       |
| PER-02 | Adri interrompida          | Usuário ocasional               | não perder a montagem e reenviar o link dias depois               | `admin-atelie`      | J-03, J-04       |
| PER-03 | Adri com a fonte grande    | Usuário de tecnologia assistiva | montar com a fonte a 130/200 % sem nada cortado                    | `admin-atelie`      | J-01, J-04 (sec.) |
| PER-04 | Adri no computador         | Usuário avançado                | reenviar o link pelo painel e salvar o endereço na ficha          | `admin-atelie`      | J-05             |
| PER-05 | Conta sem acesso ao ateliê | Usuário ocasional (permissão restrita) | ser barrada sem ver cliente e trocar de conta              | `cliente-sem-papel` | J-06             |
| PER-06 | Juliana, a cliente do link | Novo usuário                    | abrir o link reenviado e concluir                                 | `anonima`           | J-04 (sec.)      |

**Não cobertas:** usuário em recuperação — o WI não corrige falha anterior; os estados de erro estão com a
PER-01 e a PER-02. Leitor de tela real — fora do browser da sessão.

## Jornadas

| ID   | Jornada (pelo valor)                                                         | Persona principal · secundária | Prioridade | Abandono/erro              | Cruza fronteira                          | Arquivo |
| ---- | ---------------------------------------------------------------------------- | ------------------------------ | ---------- | -------------------------- | ---------------------------------------- | ------- |
| J-01 | Montar pelo celular o pedido de uma cliente nova a partir da conversa e mandar o link — saída natural: Montados (D-43) | PER-01 · PER-03          | P0         | J-01a, J-01b, J-01c, J-01d | sim: Claude API (`customer-parse`), CEP, cotação, WhatsApp | [J-01](journeys/J-01-montar-cliente-nova-pela-conversa.md) |
| J-02 | Montar pelo celular o pedido de uma cliente que já comprou, com o desconto combinado | PER-01 · —               | P0         | J-02a, J-02b, J-02c        | sim: CEP, cotação                         | [J-02](journeys/J-02-montar-cliente-cadastrada.md) |
| J-03 | Retomar a montagem depois de o celular bloquear e criar o link               | PER-02 · —                     | P1         | J-03a, J-03b, J-03c, J-03d | não                                      | [J-03](journeys/J-03-retomar-a-montagem-interrompida.md) |
| J-04 | Reabrir um pedido montado dias depois, mandar o mesmo link e a cliente abri-lo na loja | PER-02 · PER-06, PER-03 | P0        | J-04a..J-04e               | **sim: a loja** (`/pedido-montado`, hash + cifra do token) | [J-04](journeys/J-04-reenviar-o-link-dias-depois.md) |
| J-05 | Reabrir no computador um pedido montado, copiar o link e renovar o vencido   | PER-04 · —                     | P1         | J-05a, J-05b               | sim: app e loja                          | [J-05](journeys/J-05-link-no-painel.md) |
| J-06 | Perceber que entrou com a conta errada e trocar para a do ateliê sem ver dado de cliente | PER-05 · —          | P1         | J-06a                      | sim: functions com recusa por papel       | [J-06](journeys/J-06-conta-sem-acesso.md) |

## Charters

Ordem de execução — a Fase 2 despacha nesta sequência. O smoke abre o CH-01: falhou, pare.

| Ordem | ID    | Missão                                                                 | Persona | Tour        | Time-box | Prioridade | TC | Arquivo |
| ----- | ----- | ---------------------------------------------------------------------- | ------- | ----------- | -------- | ---------- | -- | ------- |
| 1     | CH-01 | montar de ponta a ponta no celular, cliente nova (digitando) e cadastrada, sem parar sem saber por quê; depois do link, o voltar cai em Montados (D-43) | PER-01 | Feature | 90 min | P0 | TC-SMOKE-001, TC-SMOKE-002, TC-JOURNEY-002, TC-FUNC-001, 002, 006–010, 016–019, 024, 025, TC-INT-001, TC-PERSONA-001 | [CH-01](charters/CH-01-montagem-ponta-a-ponta.md) |
| 2     | CH-06 | reabrir o pedido montado, reenviar o MESMO link e vê-lo abrir na loja; nenhuma ação mata o link sem aviso | PER-02 | Feature | 60 min | P0 | TC-SMOKE-003, TC-JOURNEY-004, TC-FUNC-001, 027–031, TC-INT-002, TC-INT-003, TC-SEC-003 | [CH-06](charters/CH-06-pedido-montado-e-o-link.md) |
| 3     | CH-02 | texto colado do WhatsApp nunca preenche errado sem aviso, nunca grava antes do link, nunca mexe na ficha; fora do ar segue à mão | PER-01 | Paste | 60 min | P0 | TC-JOURNEY-001, TC-FUNC-011–015 | [CH-02](charters/CH-02-leitura-do-texto-colado.md) |
| 4     | CH-03 | o total do pedido montado nunca diverge da revisão (estoque, promoção, cupom, combinado, duplo toque, preço que mudou) | PER-01 | Money | 60 min | P0 | TC-FUNC-017, 020–023, 025, 026 | [CH-03](charters/CH-03-o-dinheiro-da-montagem.md) |
| 5     | CH-04 | voltar, "x", F5 e app fechado nunca jogam a sacola fora sem perguntar; depois do link o voltar leva a Montados sem reabrir a montagem (D-43); o aparelho guarda só peças e descontos | PER-02 | Back-Button | 90 min | P1 | TC-JOURNEY-003, TC-FUNC-003–005, TC-SEC-002, TC-REG-001 | [CH-04](charters/CH-04-voltar-sair-e-rascunho.md) |
| 6     | CH-07 | no painel, o mesmo link do app, renovar só o vencido, endereço na ficha uma vez e só com o pedido gravado | PER-04 | Feature | 60 min | P1 | TC-JOURNEY-005, TC-FUNC-032, 033, TC-REG-002 | [CH-07](charters/CH-07-painel-link-e-endereco.md) |
| 7     | CH-05 | conta sem papel vê a recusa em toda tela nova, sem dado de cliente, e acha a saída | PER-05 | Feature | 30 min | P1 | TC-SEC-001, TC-JOURNEY-006 | [CH-05](charters/CH-05-conta-sem-acesso.md) |
| 8     | CH-08 | CFR — J-01 e J-04 em 390 a 100/130/200 %: rolagem lateral, 44 px, anúncios, esperas, rede que cai, tom | PER-03 | — | 45 min | P1 | TC-CFR-001–004, TC-PERSONA-002 | [CH-08](charters/CH-08-cfr-montagem-e-pedido-montado.md) |
| 9     | CH-09 | design-check — Montados, os 4 passos, as folhas e o pedido montado · `Montar Pedido.dc.html` | PER-01 | — | 60 min | P1 | TC-UI-001, TC-UI-002 | [CH-09](charters/CH-09-design-check-montar-pedido.md) |

**Sete exploratórios, um acima do teto de 6 do WI grande**, e o porquê: a mudança toca **dois apps** (o app
do ateliê e o painel, UC-10, com persona e viewport próprios — CH-07) e **uma recusa por papel nova em três
rotas e três portas** (CH-05, 30 min, que só a PER-05 pode explorar). Juntá-los a outro charter obrigaria a
trocar de persona no meio da sessão.

## Estratégia

- **Como se exercitam as jornadas:** um charter por área de risco, uma persona por sessão, no browser real
  pelo Playwright (MCP ou CLI), em 390 × 844 (painel em 1440); os `TC-*` são conferidos dentro do charter que
  os cita. Ambiente só local: app :8084, painel :8083, loja :8082, Supabase local API 54441 e functions
  servidas pelo edge runtime local. **Nunca** `*.supabase.co`.
- **CFR:** usabilidade (inclui o tom memorial, D-08), acessibilidade, performance percebida, compatibilidade
  (390 a 100/130/200 % e 320; sem tema escuro — o app não tem) e recuperação de erro, sobre J-01 e J-04.
  Paridade com produção é registrada: é ambiente local, com as chaves que estiverem presentes.
- **Conferência visual:** as telas do app × `Montar Pedido.dc.html` (CH-09), com o PRD e as Decisões vencendo
  o protótipo nas divergências listadas no charter. O painel não tem charter de design: a mudança ali é de
  comportamento (CH-07).
- **Onde termina o simulado:** a leitura por IA é real só com `ANTHROPIC_API_KEY` local — sem ela, os casos
  de leitura ficam `blocked` (ambiente) e só o "fora do ar" roda; o link sempre disponível exige
  `PROPOSAL_TOKEN_KEY` local — sem ela, o comportamento é "Gerar link novo" (TC-FUNC-031); o voltar do
  Android é `history.back`; a fonte do sistema é a fonte da raiz; o processo encerrado pelo Android é fechar a
  aba; a conclusão no link passa pelo PIX local da feature 89 (pode exigir o `mercado-pago` local). O PWA
  instalado, o TalkBack e o gesto físico ficam fora.
- **Falha esperada conhecida:** o voltar depois de "Criar link" cai hoje na montagem vazia; pela D-43 o
  esperado é Montados. A rodada registra a divergência como bug P1 (TC-FUNC-003, TC-FUNC-025, passo 6b da
  TC-JOURNEY-001), com as URLs e o `history.length` de cada voltar.
- **Automação:** 41 casos `e2e` + `missing` ficam como pedido de automação E2E (sem a leitura real por IA) —
  o pedido de TC-FUNC-003 e TC-FUNC-025 inclui o voltar depois do link (D-43); 1 `integration` fica com o Dev
  (o efeito na ficha); `blocked`: nenhum.

### Suíte smoke

| Ordem | TC           | Jornada | O que prova                                                  |
| ----- | ------------ | ------- | ------------------------------------------------------------ |
| 1     | TC-SMOKE-001 | J-01    | Pedidos tem "Montar pedido" e o chip Montados; a montagem abre |
| 2     | TC-SMOKE-002 | J-02    | um pedido mínimo chega ao link (a gravação pelo app de pé)    |
| 3     | TC-SMOKE-003 | J-04    | o pedido montado reaberto entrega o link para copiar          |

## Critérios de entrada

- [ ] Validation do Dev com `Status: PASS` no `qa-report.md` — **feito** (2026-11-08)
- [ ] O app do branch `feature/94` rodando no ambiente local (app :8084, painel :8083, loja :8082) contra o
      Supabase local (54441), com a migration `20261111120000_94-link-sempre-e-endereco.sql` aplicada
- [ ] Functions locais servidas: `order-proposals`, `customer-parse`, `melhor-envio`, `get-proposal`/`checkout`
      (e `mercado-pago` para a conclusão)
- [ ] `.env` das functions locais com `PROPOSAL_TOKEN_KEY` (32 bytes em base64) e `ANTHROPIC_API_KEY` — sem
      cada um, os casos listados em **Onde termina o simulado** ficam `blocked`; o app com
      `VITE_STORE_URL=http://localhost:8082`
- [ ] Credenciais por referência: `QA_ADMIN_ATELIE_USUARIO`/`_SENHA` e `QA_CLIENTE_SEM_PAPEL_USUARIO`/`_SENHA`
- [ ] Massa (sintética, no banco local): cliente cadastrada com telefone, endereço padrão e um segundo
      endereço; cliente sem endereço; convidada; cliente "Juliana Prates" com e-mail e 2 pedidos; peça com 3
      variações (uma com foto própria e estoque 3, uma sem foto própria, uma esgotada); peça sem foto
      nenhuma; peça com gravação; peça que pede material; promoção vigente de 15 % e uma vencida; cupons 10 %,
      frete grátis e `first_order_only`; pedidos montados Aberta (com e sem telefone, criados com a chave),
      Vista, Concluída, Expirada (validade passada no banco) e Cancelada; uma Aberta criada sem a chave; CEP
      de Porto Alegre e um inexistente
- [ ] Driver de browser disponível — Playwright MCP headless, ou `playwright-cli` como fallback
- [ ] Para o CH-09: o MCP `claude-design` acessível na sessão; sem ele, `not-run`

## Critérios de saída

- **`pass`** — toda jornada `P0` chega ao objetivo, nenhum bug `critical`/`high` aberto, todos os charters rodaram
- **`partial`** — caso `P0`/`P1` `blocked` (inclusive por chave ausente) ou charter que não rodou
- **`fail`** — caso `P0` falhou, ou bug `critical`/`high` aberto
- Todo caso `e2e` + `missing`/`blocked` com o pedido de automação registrado

## Cobertura

Os critérios são os UC da costura (`spec.md` › Escopo), que numeram os comportamentos do PRD — o PRD não traz
IDs. As Decisões que mudam o comportamento visível (D-xx) aparecem na **Origem** de cada caso.

| Critério | Fonte | Resumo do critério | TC |
| -------- | ----- | ------------------ | -- |
| UC-01 | spec (PRD › Pedidos · Montados) | "Montar pedido" e a visão "Montados · N abertos" com os cartões | TC-SMOKE-001, TC-FUNC-001, TC-JOURNEY-004, TC-INT-003, TC-SEC-001, TC-REG-001 |
| UC-02 | spec (PRD › O que é novo 1; Pedido montado) | montagem em 4 passos: barra e motivo, voltar do Android (inclusive depois de "Criar link", D-43), confirmação de fechar, rascunho | TC-FUNC-002, TC-FUNC-003, TC-FUNC-004, TC-FUNC-005, TC-FUNC-025, TC-JOURNEY-001, TC-JOURNEY-003, TC-SEC-001, TC-SEC-002 |
| UC-03 | spec (PRD › Passo 1) | cliente cadastrada: busca, endereço padrão, outro salvo, "Outro endereço", "preenche no link" | TC-FUNC-006, TC-FUNC-007, TC-JOURNEY-002, TC-SMOKE-002 |
| UC-04 | spec (PRD › Passo 1) | cliente nova: contato e entrega, CPF, "Salvar no cadastro", MON-03, CEP | TC-FUNC-008, TC-FUNC-009, TC-FUNC-010, TC-INT-001, TC-SEC-003 |
| UC-05 | spec (PRD › Ler os dados de uma mensagem) | a leitura do texto por IA: escopos, marcas, aviso, Desfazer, CEP manda, sem dados, fora do ar, limite | TC-FUNC-011, TC-FUNC-012, TC-FUNC-013, TC-FUNC-014, TC-FUNC-015, TC-JOURNEY-001 |
| UC-06 | spec (PRD › Passo 2) | peças: busca com foto, folha da variação, sacola com a foto, promoção, peça sem foto | TC-FUNC-016, TC-FUNC-017, TC-FUNC-018, TC-FUNC-019, TC-FUNC-020, TC-UI-002 |
| UC-07 | spec (PRD › Passo 3) | descontos: cupom, combinado, resumo vivo e PIX | TC-FUNC-021, TC-FUNC-022, TC-FUNC-023 |
| UC-08 | spec (PRD › Passo 4) | revisar: peças com foto, cliente, entrega com prévia, observação, Criar link, PRC-02 | TC-FUNC-024, TC-FUNC-025, TC-FUNC-026, TC-SMOKE-002 |
| UC-09 | spec (PRD › Pedido montado) | pedido montado: link sempre, WhatsApp/Copiar com histórico, observação, ações por estado | TC-FUNC-027, TC-FUNC-028, TC-FUNC-029, TC-FUNC-030, TC-FUNC-031, TC-INT-002, TC-SMOKE-003, TC-JOURNEY-004 |
| UC-10 | spec (PRD › Pedido montado "no app e no painel") | painel: link sempre, Renovar só depois de expirar, endereço salvo pela function | TC-FUNC-032, TC-FUNC-033, TC-JOURNEY-005, TC-REG-002 |

**Sem cobertura:** nada.

## Riscos

| Risco (para o usuário) | Probabilidade | Impacto na persona | Mitigação no plano |
| ---------------------- | ------------- | ------------------ | ------------------ |
| o link reenviado não é o que a cliente tem, ou "Gerar link novo" mata o link em uso | média | abala confiança · impede concluir | CH-06, TC-FUNC-027, TC-INT-002, TC-FUNC-031 |
| a leitura preenche um campo errado sem a Adri notar, ou muda a ficha de quem já é cliente | média | perde dado · abala confiança | CH-02, TC-FUNC-011, TC-FUNC-013 |
| segunda ficha para o mesmo e-mail, ou endereço duplicado/gravado com o pedido recusado | baixa | perde dado | TC-FUNC-009, TC-INT-001, TC-FUNC-033 |
| total do link diverge do que a Adri viu (estoque, promoção, cupom, combinado, preço que mudou) | média | abala confiança · cobra errado | CH-03 |
| o voltar do Android ou o app fechado jogam a sacola fora | média | fricção · perde trabalho | CH-04, TC-FUNC-003..005 |
| o voltar depois de "Criar link" cai na montagem vazia em vez de Montados (D-43; é o código de hoje) | alta | fricção · dúvida se o link foi criado | CH-01, CH-04, TC-FUNC-003, TC-FUNC-025, TC-JOURNEY-001 |
| dado da cliente (CPF, endereço, texto colado) fica no celular | baixa | perde dado (privacidade) | TC-SEC-002, TC-SEC-003 |
| a barra fixa, o teclado e a fonte grande escondem o botão ou rolam de lado | alta | fricção · impede concluir | CH-08, TC-CFR-001 |
| chave da IA ou da cifra ausente no ambiente local deixa parte do plano sem rodar | alta | — (rodada `partial`) | Critérios de entrada; `blocked` explícito |

## Perguntas

- ✅ **Q-01** (respondida pelo humano, 2026-11-08): "O que o voltar do Android faz logo depois de 'Criar
  link'?" → **volta a Montados, com a montagem fora do histórico** (D-43 na costura). Aplicado: esperado P1
  `e2e` na variação de TC-FUNC-003 e TC-FUNC-025; passo 6b e saída natural de J-01 (TC-JOURNEY-001); "Deve
  tentar" no CH-01 e no CH-04. O código de hoje cai na montagem vazia — falha esperada, registrada como bug
  na rodada.
- 🟡 Montados vazio, carregando e com erro: o protótipo não desenha e nenhuma fonte dá texto — o plano confere
  só que existem, no tom do app, e não falham em silêncio (TC-FUNC-001).
- 🟡 A frase do limite de leituras (429): D-11 a deixou à implementação — o plano confere só o tom e a saída
  "Preencher à mão" (TC-FUNC-015).
- 🟡 "Ver o pedido #NNNN" da Concluída leva ao detalhe do pedido no app (o protótipo não navega; o PRD só dá o
  rótulo) — TC-FUNC-028, TC-INT-003.
- 🟡 Ambiente: `PROPOSAL_TOKEN_KEY` e `ANTHROPIC_API_KEY` no `.env` das functions locais e `VITE_STORE_URL` do
  app na loja local; a conta `cliente-sem-papel` existe no banco local; a Expirada da massa é preparada com a
  validade passada no banco local.
- 🟡 Android simulado: voltar = `history.back`; fonte do sistema = fonte da raiz; processo encerrado = fechar a
  aba.
- 🟢 F5 durante o Editar recomeça como montagem vazia (D-41) e o Editar não tem rascunho: a Adri perde a edição
  em andamento numa interrupção — candidato a backlog.
- 🟢 O selo "Aberta — vista pela cliente" (D-35) e a observação não editável na concluída (D-36) divergem da
  letra do desenho e do PRD; decididos na costura.
- 🟢 A Política de Privacidade não cita o serviço de IA que lê o texto colado (risco aceito no PRD) — vale
  revisitar antes de publicar.
