```json
{
  "schema": "qa-plan/v1",
  "title": "Plano de QA — 90 · Loja ao vivo, Fases 2 e 3 (presença, funil, joias vistas, origem e aparelho)",
  "summary": {
    "total_cases": 51,
    "by_priority": { "P0": 9, "P1": 34, "P2": 8, "P3": 0 }
  },
  "acceptance_criteria_covered": 29,
  "strategy": [
    "Exploração por charter no browser real (Playwright MCP ou playwright-cli), uma persona por sessão; a loja num segundo contexto como estímulo da presença",
    "E2E (Playwright) pedido à automação p/ fluxos P0/P1 determinísticos, com webdriver neutralizado no contexto da loja",
    "Manual p/ usabilidade, acessibilidade, fonte grande, duas abas, dois apps ao mesmo tempo e conferência contra o protótipo"
  ],
  "cases": [
    { "id": "TC-SMOKE-001", "title": "A Adri abre o Início e a Loja ao vivo e as duas carregam sem falha", "priority": "P0", "type": "smoke", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-001", "title": "A Adri vê no Início a cliente que acabou de entrar na loja e a acompanha na Loja ao vivo", "priority": "P0", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-002", "title": "A cliente fecha a aba da loja e sai do total em até 5 minutos", "priority": "P0", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-003", "title": "Com a rede caindo, a Adri vê que não conseguiu carregar e recupera os números sem sair da tela", "priority": "P1", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-001", "title": "O cartão do Início diz quantas pessoas estão na loja e o que fazem, sem as partes zeradas", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-002", "title": "O cartão do Início se anuncia com o número de pessoas e abre a Loja ao vivo com um toque", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-003", "title": "O número grande da Loja ao vivo é o das pessoas dos últimos 5 minutos, e a barra de agora é igual a ele", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-004", "title": "Olhando, com sacola e no checkout somam o total e ninguém conta duas vezes", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-005", "title": "Quem preenche os dados de compra, num pedido montado ou no pagamento de um pedido, conta \"No checkout\"", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-006", "title": "Com alguém no checkout aparece a nota sobre Carrinhos abandonados, sem prazo", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-007", "title": "\"Compraram (últimos 30 min)\" mostra só o número dos pedidos pagos na última meia hora", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-008", "title": "A Loja ao vivo avisa que conta só quem aceitou cookies de estatística", "priority": "P2", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-009", "title": "As joias sendo vistas aparecem com foto, nome e quantas pessoas, até cinco, as mais vistas primeiro", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-010", "title": "Quem está no Guia de envio do material aparece numa linha própria, junto das joias", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-011", "title": "Sem ninguém numa joia, a lista diz \"Ninguém olhando uma joia agora.\" — categoria, busca e sacola não entram", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-012", "title": "\"De onde vieram\" conta cada pessoa na faixa de onde ela chegou à loja", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-013", "title": "\"No celular\" diz quantas das pessoas na loja usam celular, e o resto pelo computador ou tablet", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-014", "title": "Com a aba da loja escondida, a cliente deixa de contar, e volta a contar ao reabri-la", "priority": "P1", "type": "functional", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-FUNC-015", "title": "A sacola guardada de uma visita anterior conta \"Com joia na sacola\", e esvaziá-la volta a \"Olhando joias\"", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-016", "title": "A mesma cliente com a loja em duas abas conta como uma pessoa", "priority": "P2", "type": "functional", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-FUNC-017", "title": "A Política de Privacidade explica o aviso de presença e o que fica guardado, e por quanto tempo", "priority": "P1", "type": "functional", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-FUNC-018", "title": "O cartão do Início mostra traços ao carregar, a falha com \"Tentar de novo\" e \"Ninguém na loja agora\" sem esconder o gráfico", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-019", "title": "Com a loja ainda não medida, o cartão e a Loja ao vivo dizem isso, com a frase de Acessos", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-020", "title": "Se só uma das leituras falha, só a parte dela mostra a falha, e a outra continua de pé", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-021", "title": "Os números se renovam sozinhos com o app na frente, e o puxar para atualizar relê na hora", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-022", "title": "Com o app do ateliê em segundo plano, nenhuma leitura sai, e ao voltar ele relê", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-023", "title": "O relógio errado do celular não muda os números, as barras nem o frescor", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-024", "title": "A tela sempre se chama \"Loja ao vivo\", no título da página e na aba, em qualquer estado", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-025", "title": "Visitas e Vendas da Loja ao vivo são os mesmos da faixa do Início em Hoje, Ontem e Semana", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-026", "title": "\"Com sacola\" conta cada navegador uma vez no dia e nunca passa de Visitas", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-027", "title": "Na Semana, \"Com sacola\" é a soma dos dias, e a tela diz isso em letra pequena", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-028", "title": "A variação contra o período anterior aparece nos quatro números, verde na alta e cinza na queda", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-029", "title": "Sem o período anterior medido inteiro, nenhuma variação aparece", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-030", "title": "A conversão sai com uma casa decimal, e com zero visitas aparece \"—\"", "priority": "P2", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-SEC-001", "title": "A cliente que recusou cookies de estatística não aparece em número nenhum", "priority": "P0", "type": "security", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-SEC-002", "title": "Recusar estatística numa aba tira a cliente da contagem também na outra aba aberta", "priority": "P1", "type": "security", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-SEC-003", "title": "O link de \"não contar\" tira o navegador da presença, e o de \"contar\" o devolve", "priority": "P1", "type": "security", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-SEC-004", "title": "Robô e loja aberta fora do endereço de produção não aparecem na Loja ao vivo", "priority": "P1", "type": "security", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-SEC-005", "title": "Nada na Loja ao vivo identifica a cliente que está na loja", "priority": "P1", "type": "security", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-SEC-006", "title": "Quem não tem acesso ao ateliê cai na recusa do app sem ver, nem por um instante, o número da loja", "priority": "P0", "type": "security", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-SEC-007", "title": "Se o acesso é retirado com a Loja ao vivo aberta, a próxima leitura cai na recusa e o número some", "priority": "P1", "type": "security", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-REG-001", "title": "Com o aviso de presença saindo a cada minuto, a visita do dia continua contada uma vez", "priority": "P1", "type": "regression", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-REG-002", "title": "O Dashboard do painel mostra as mesmas visitas e vendas que o app do ateliê", "priority": "P2", "type": "regression", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-REG-003", "title": "Com o aviso de presença ligado, a cliente vai da joia ao checkout preenchido sem atraso nem erro", "priority": "P1", "type": "regression", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-001", "title": "Com a fonte do celular grande, o cartão e a Loja ao vivo cabem na tela, sem rolar de lado e sem número sobreposto", "priority": "P1", "type": "cfr", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-002", "title": "Com \"reduzir movimento\" ligado, as barras não animam e o ponto dourado não pulsa", "priority": "P1", "type": "cfr", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-003", "title": "Pelo leitor de tela, o cartão e a Loja ao vivo se anunciam com nome, títulos e alvos que dá para tocar", "priority": "P1", "type": "cfr", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-004", "title": "Nenhum texto da Loja ao vivo grita ou apressa, em nenhum estado", "priority": "P2", "type": "cfr", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-UI-001", "title": "O cartão \"Agora na loja\" do Início confere com o protótipo", "priority": "P2", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-UI-002", "title": "O cabeçalho e os blocos \"Agora na loja\" e \"O que estão fazendo\" conferem com o protótipo", "priority": "P2", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-UI-003", "title": "\"Joias sendo vistas agora\", \"De onde vieram\", \"No celular\" e Acessos conferem com o protótipo", "priority": "P2", "type": "ui", "automation": { "target": "manual", "status": "na" } }
  ]
}
```

# Plano de QA — 90 · Loja ao vivo, Fases 2 e 3

**Work Item:** 90 (feature, entrada prd) · **Escopo:** completo · **Foco:** —
**Versão do plano:** 1 · **Escrito em:** 2026-11-02 · **Modo:** criar
**Gate 1:** aprovado em 2026-11-02 (sob a autorização do humano de orquestrar o QA até o fim; as 🟡 seguem como as assunções do plano)

## Resumo

- **Valor para o usuário:** a Adri passa a ver pelo celular, no Início e na tela Loja ao vivo, quantas pessoas
  estão na loja agora, o que estão fazendo (olhando, com joia na sacola, no checkout), quais joias e o Guia de
  envio estão sendo vistos, de onde vieram e se usam celular — e, em Acessos, quantas visitas puseram joia na
  sacola e como a semana se compara à anterior. Para as clientes, a loja avisa a presença só com o consentimento
  de estatística e a Política diz o que fica guardado
- **Maior risco para o usuário:** a Adri ver gente que não está (ou não ver quem está), o funil somar errado, ou
  uma cliente que recusou ser contada aparecer nos números
- **Contagens:** personas 5 · jornadas 6 · charters 9 (CFR 1 · design-check 1) · TC 51 (P0 9 · P1 34 · P2 8 · P3 0)
- **Automação:** e2e 36 (missing 36 · existing 0 · blocked 0) · integration 0 · manual 15

## Escopo

**Dentro:** a presença que a loja manda (consentimento, recusas, aba visível, saída em 5 min, sacola guardada,
duas abas); o cartão "Agora na loja" no Início; os blocos A–E da Loja ao vivo; "Com sacola", a variação "vs semana
anterior" e os quatro números de Acessos; os estados (carregando, falha, vazio, não medida, recusa); a
atualização e o frescor; o texto novo da Política de Privacidade; a regressão do contador de visitas, do
checkout e do Dashboard do painel.

**Fora:** Cidades (LAV-48, Fase 4 — fora do Work Item); o cartão "Visitas hoje" da Fase 1 (LAV-04, §10.7 —
substituído); o gráfico de Acessos, o seletor de período e as notas de teto e de início da contagem (LAV-50,
LAV-52, LAV-53, LAV-54 — Fase 1, feature 83, sem mudança nesta costura); o pagamento em si (o `mercado-pago`
local não sobe); o que só o esquema do banco prova (LAV-41, §10.6); o Android real e o TalkBack real; o resto do
Início, de Pedidos e de Clientes no app; mapa de calor, gravação de sessão, push de checkout (§11).

## Fontes

| Fonte      | Caminho                             | Uso                                        |
| ---------- | ----------------------------------- | ------------------------------------------ |
| PRD        | `.specs/work-items/90-loja-ao-vivo-presenca/prd.md` (r1a) | critérios LAV-nn e §10 — a régua da cobertura |
| Costura    | `.specs/work-items/90-loja-ao-vivo-presenca/spec.md` | Design, Decisões D-01..D-20, o que ficou fora |
| Fontes de design | `claude_design` · projeto `a780eec8-8aba-4d6e-8b4c-2c485e2750c7`, `Ateliê Admin.dc.html`; cópia local e capturas em `.specs/features/83-loja-ao-vivo/prototipo/` e `prototipo.md` | telas existentes; charter `design-check` (CH-09) |
| Insumos    | `item.md` › Insumos; `.specs/features/83-loja-ao-vivo/spec.md`; `BACKLOG.md` › BL-056, BL-058 | escopo decidido (Fases 2 e 3, Com sacola, Guia, semana anterior, "pessoas") |
| Validation | `.specs/work-items/90-loja-ao-vivo-presenca/qa-report.md` | PASS · 30/30 critérios em escopo; o que fica para o navegador |
| Projeto    | `CLAUDE.md` (raiz) › Convenções; `apps/store/CLAUDE.md` › O contador de visitas únicas | mobile primeiro (390 a 100/130/200 % e 1440), robô do Playwright, portas |

## Personas

Detalhe em [personas.md](personas.md).

| ID     | Nome                      | Arquétipo                        | Objetivo                                                         | Conta              | Jornadas               |
| ------ | ------------------------- | -------------------------------- | ---------------------------------------------------------------- | ------------------ | ---------------------- |
| PER-01 | Adri                      | usuário avançado                 | saber se tem alguém na loja agora e o que fazem                   | `admin-atelie`     | J-01, J-02, J-03, J-06 |
| PER-02 | Adri à noite, fonte 200 % | tecnologia assistiva             | ler os números com a fonte no máximo, sem rolar de lado           | `admin-atelie`     | J-01, J-02             |
| PER-03 | Lúcia                     | novo usuário (mobile)            | escolher uma joia e voltar à sacola depois, contada só com consentimento | `anonima`   | J-01, J-02, J-05       |
| PER-04 | Helena                    | novo usuário, permissão restrita | navegar sem ser contada, porque recusou estatística              | `anonima`          | J-04                   |
| PER-05 | Marina                    | permissão restrita               | sem acesso ao ateliê, não ver número nenhum                       | `admin-secundaria` | J-06                   |

**Não cobertas:** usuário ocasional (a Adri é a única dona e usa o app todo dia); usuário em recuperação (não há
bug anterior a confirmar); leitor de tela real e o Android real (fora do browser da sessão).

## Jornadas

| ID   | Jornada (pelo valor)                                                   | Persona principal · secundária | Prioridade | Abandono/erro        | Cruza fronteira                              | Arquivo |
| ---- | ---------------------------------------------------------------------- | ------------------------------ | ---------- | -------------------- | -------------------------------------------- | ------- |
| J-01 | Saber, pelo Início, se tem alguém na loja agora                         | PER-01 · PER-02                | P0         | J-01a, J-01b, J-01c  | sim: loja → function `visit` → banco → app   | [J-01](journeys/J-01-saber-se-tem-alguem-na-loja.md) |
| J-02 | Entender o que a cliente está fazendo na loja, do pouso ao checkout     | PER-01 · PER-03                | P0         | J-02a, J-02b, J-02c  | sim: loja → function → banco → app; `orders` | [J-02](journeys/J-02-entender-o-que-a-cliente-esta-fazendo.md) |
| J-03 | Comparar o movimento de hoje e da semana com o período anterior         | PER-01 · —                     | P1         | J-03a, J-03b         | sim: o painel lê a mesma leitura             | [J-03](journeys/J-03-comparar-o-movimento.md) |
| J-04 | Olhar joias sem ser contada além do que aceitou                         | PER-04 · PER-03                | P0         | J-04a, J-04b, J-04c  | sim: loja → function `visit`                 | [J-04](journeys/J-04-olhar-joias-sem-ser-contada.md) |
| J-05 | Sair da loja e voltar depois, com a sacola guardada                     | PER-03 · PER-01                | P1         | J-05a, J-05b, J-05c  | sim: loja → function → banco → app           | [J-05](journeys/J-05-voltar-a-loja-com-a-sacola-guardada.md) |
| J-06 | Acompanhar a loja com a rede do celular instável, e sem acesso          | PER-01 · PER-05                | P1         | J-06a, J-06b, J-06c  | sim: painel (remover acesso) → app           | [J-06](journeys/J-06-acompanhar-com-rede-instavel.md) |

## Charters

Ordem de execução — a Fase 2 despacha nesta sequência. São **7 exploratórios**, um acima do teto de 6 de um
Work Item grande: a mudança tem três superfícies em dois apps (a loja, que avisa; o app, que lê; a Política) e a
recusa de acesso pede uma persona própria (PER-05), que não cabe em nenhum outro charter sem trocar de persona no
meio da sessão.

| Ordem | ID    | Missão                                                                     | Persona | Tour        | Time-box | Prioridade | TC | Arquivo |
| ----- | ----- | -------------------------------------------------------------------------- | ------- | ----------- | -------- | ---------- | -- | ------- |
| 1     | CH-01 | o número da loja e o funil batem com o que a cliente faz                    | PER-01  | Feature     | 90 min   | P0 | TC-SMOKE-001, TC-JOURNEY-001, TC-FUNC-001…008 | [CH-01](charters/CH-01-numero-e-funil.md) |
| 2     | CH-02 | quem recusou não aparece em número nenhum                                   | PER-04  | Multi-Tab   | 60 min   | P0 | TC-SEC-001…004, TC-FUNC-017 | [CH-02](charters/CH-02-privacidade-e-recusas.md) |
| 3     | CH-07 | sem acesso ao ateliê, nenhum número da loja                                  | PER-05  | Back-Button | 30 min   | P0 | TC-SEC-006, TC-SEC-007 | [CH-07](charters/CH-07-sem-acesso-ao-atelie.md) |
| 4     | CH-03 | a cliente sai, volta, e a loja não engasga                                  | PER-03  | Interrupt   | 60 min   | P0 | TC-JOURNEY-002, TC-FUNC-014…016, TC-REG-003 | [CH-03](charters/CH-03-a-cliente-sai-e-volta.md) |
| 5     | CH-05 | Acessos: "Com sacola" e a semana anterior                                   | PER-01  | Feature     | 60 min   | P0 | TC-FUNC-025…030, TC-REG-001, TC-REG-002 | [CH-05](charters/CH-05-acessos-com-sacola-e-semana-anterior.md) |
| 6     | CH-04 | o que estão olhando, de onde vieram e em que aparelho                       | PER-01  | Feature     | 60 min   | P1 | TC-FUNC-009…013, TC-SEC-005 | [CH-04](charters/CH-04-o-que-olham-e-de-onde-vieram.md) |
| 7     | CH-06 | a leitura ao vivo com a rede ruim e o celular em segundo plano              | PER-01  | Network     | 60 min   | P1 | TC-JOURNEY-003, TC-FUNC-018…024 | [CH-06](charters/CH-06-leitura-com-rede-ruim.md) |
| 8     | CH-08 | CFR — J-01 e J-02                                                           | PER-02  | —           | 45 min   | P1 | TC-CFR-001…004 | [CH-08](charters/CH-08-cfr.md) |
| 9     | CH-09 | design-check — cartão do Início e Loja ao vivo · `Ateliê Admin.dc.html`    | PER-01  | —           | 45 min   | P2 | TC-UI-001…003 | [CH-09](charters/CH-09-design-check.md) |

## Estratégia

- **Como se exercitam as jornadas:** um charter por área de risco, uma persona por sessão, no browser real pelo
  Playwright (MCP ou CLI); os `TC-*` são conferidos dentro do charter que os cita. Nos charters da Adri, a loja
  aberta num segundo contexto do browser gera a presença — é estímulo, não segunda persona. O atraso declarado
  (até 60 s do aviso + 15 s da leitura na tela, 30 s no cartão) é parte do esperado: "não mudou" e "mudou" só se
  afirmam depois dele
- **CFR:** usabilidade (tom e linguagem dos estados novos), acessibilidade (nome acessível do cartão, `h1`, alvos
  de 44 px, movimento reduzido), performance percebida (traços no lugar do número, sem layout pulando) e
  compatibilidade (390 a 100/130/200 % de fonte, 320, 1440) — a mudança é toda de leitura em tela de celular.
  Recuperação de erro fica no CH-06, na mesma superfície. Paridade registrada no cabeçalho do log
- **Conferência visual:** o cartão "Agora na loja" e a Loja ao vivo (A–E e Acessos) × `Ateliê Admin.dc.html`,
  em 390, só o estado cheio (o único desenhado); as 18 divergências que a `spec.md` resolveu a favor do PRD não
  são achado
- **Onde termina o simulado:** banco e function `visit` locais, `production_host` semeado como `localhost` só no
  banco local e restaurado depois; a loja com `navigator.webdriver` neutralizado e UA de celular (senão o próprio
  filtro de robô recusa o Playwright e nada aparece); `*.supabase.co` e `**/g/collect*` bloqueados; o pagamento
  não roda (o `mercado-pago` local não sobe), então "Compraram" vem de pedido aprovado semeado; aba em segundo
  plano emulada trazendo outra aba à frente; fonte do sistema emulada pela fonte raiz. O Android real, o TalkBack,
  a tela de bloqueio e a function publicada (o `Max-Age` no gateway hospedado) ficam fora
- **Automação:** 36 casos `e2e` + `missing` ficam como pedido de automação E2E (precisam dos dois contextos e da
  neutralização do robô; os de espera de 5 min são longos, não instáveis); `integration` 0 — o que é só de banco
  já está nos probes da Validation; `blocked`: nenhum no planejamento (TC-FUNC-028 fica `blocked` na execução se a
  massa de duas semanas não existir)

### Suíte smoke

| Ordem | TC             | Jornada | O que prova                                                   |
| ----- | -------------- | ------- | ------------------------------------------------------------- |
| 1     | TC-SMOKE-001   | J-01    | o cartão e a Loja ao vivo carregam, com os seis blocos         |
| 2     | TC-JOURNEY-001 | J-01    | a cliente que entra na loja aparece no Início e na tela        |
| 3     | TC-FUNC-004    | J-02    | o funil soma o total                                           |
| 4     | TC-SEC-001     | J-04    | quem recusou estatística não aparece                           |
| 5     | TC-SEC-006     | J-06    | quem não tem acesso não vê número                              |
| 6     | TC-FUNC-025    | J-03    | Visitas e Vendas iguais à faixa do Início                      |

## Critérios de entrada

- [x] Validation do Dev com `Status: PASS` no `qa-report.md`
- [ ] App do branch rodando no ambiente local: loja em http://localhost:8082 (`pnpm dev:store`), app do ateliê em
      http://localhost:8084 (`pnpm dev:mobile-adm`), painel em http://localhost:8083 (`pnpm dev:backoffice`, só
      para CH-05 e CH-07), Supabase local (API 54441) com as migrations `20261104120000`, `…130000` e `…140000`
      aplicadas e a function `visit` servida por `supabase functions serve`
- [ ] `store_settings.analytics.production_host` = `localhost` no banco **local** (molde do probe
      `probes/02-function-ping.sh`), com o valor anterior anotado para restaurar no fim
- [ ] Contexto da loja no Playwright com `navigator.webdriver` neutralizado e UA de celular sem `HeadlessChrome`;
      `*.supabase.co` e `**/g/collect*` bloqueados; cookies habilitados
- [ ] Credencial para cada persona que precisa de conta — `QA_ADMIN_ATELIE_USUARIO`/`_SENHA` (admin do
      `seed.sql`) e `QA_ADMIN_SECUNDARIA_USUARIO`/`_SENHA` (criada em `/admin/usuarios`); referência de onde está,
      nunca o valor
- [ ] Massa de dados: ≥ 6 joias ativas com foto (e uma sem); um pedido aprovado nos últimos 30 min, um aprovado há
      40 min e um cancelado recente; um pedido montado com link e um pedido pendente de PIX; uma cliente de teste
      com conta na loja; visitas, marcas de sacola e vendas em hoje, ontem, nesta semana e na anterior, com o marco
      de início da medição anterior à semana passada (e um segundo estado com o marco nesta semana)
- [ ] Driver de browser disponível — Playwright MCP headless, ou `playwright-cli` como fallback
- [ ] Com charter `design-check`: o Claude Design MCP na sessão, ou a cópia local em
      `.specs/features/83-loja-ao-vivo/prototipo/`

## Critérios de saída

- **`pass`** — toda jornada `P0` chega ao objetivo, nenhum bug `critical`/`high` aberto, todos os charters rodaram
- **`partial`** — caso `P0`/`P1` `blocked` ou charter que não rodou
- **`fail`** — caso `P0` falhou, ou bug `critical`/`high` aberto
- Todo caso `e2e` + `missing`/`blocked` com o pedido de automação registrado
- No fim de toda sessão, `production_host` restaurado no banco local

## Cobertura

| Critério | Fonte | Resumo do critério | TC |
| -------- | ----- | ------------------ | -- |
| LAV-01 | prd | cartão-botão de largura inteira, alvo ≥ 44 px, nome acessível com plural | TC-FUNC-002, TC-CFR-003, TC-SMOKE-001 |
| LAV-02 | prd | eyebrow com ponto estático, número, linha do funil que some no zero, 15 barras | TC-FUNC-001, TC-JOURNEY-001, TC-CFR-002, TC-UI-001 |
| LAV-03 | prd | carregando, falha, zero com gráfico, loja não medida | TC-FUNC-018, TC-FUNC-019, TC-FUNC-020, TC-JOURNEY-003, TC-SMOKE-001 |
| LAV-05 | prd | 30 s com o app na frente, puxar para atualizar, nada em segundo plano | TC-FUNC-021, TC-FUNC-022, TC-JOURNEY-001, TC-JOURNEY-003 |
| LAV-10 | prd | número dourado sobre ink, "pessoas nos últimos 5 minutos" | TC-FUNC-003, TC-JOURNEY-001, TC-UI-002 |
| LAV-11 | prd | 30 barras por minuto, a de agora igual ao número | TC-FUNC-003, TC-JOURNEY-001, TC-UI-002 |
| LAV-12 | prd | pessoa na loja = aviso nos últimos 5 min | TC-FUNC-003, TC-JOURNEY-002, TC-FUNC-014, TC-FUNC-016 |
| LAV-20 | prd | quatro linhas; "Compraram" sem barra; sacola guardada; telas de checkout | TC-FUNC-004, TC-FUNC-005, TC-FUNC-007, TC-FUNC-015, TC-UI-002 |
| LAV-21 | prd | funil exclusivo que soma o total | TC-FUNC-004 |
| LAV-22 | prd | nota do checkout, sem prazo | TC-FUNC-006, TC-CFR-004 |
| LAV-30 | prd | até 5 joias com foto, nome e pessoas; ordem e empate | TC-FUNC-009, TC-UI-003 |
| LAV-31 | prd | o Guia como linha própria; páginas que não são de joia fora | TC-FUNC-010, TC-FUNC-011 |
| LAV-32 | prd | "Ninguém olhando uma joia agora." | TC-FUNC-011 |
| LAV-40 | prd | cinco faixas pelo pouso, quinta em linha inteira, nota do Direto, vazio | TC-FUNC-012, TC-UI-003 |
| LAV-45 | prd | "{m} de {n}", "o resto pelo computador ou tablet", vazio | TC-FUNC-013, TC-UI-003 |
| LAV-51 | prd | quatro números, Com sacola, vs semana anterior até o mesmo ponto, cores | TC-FUNC-025, TC-FUNC-026, TC-FUNC-027, TC-FUNC-028, TC-FUNC-029, TC-FUNC-030, TC-UI-003 |
| LAV-60 | prd | recusa no episódio único do app | TC-SEC-006, TC-SEC-007 |
| LAV-61 | prd | nada pelo relógio do aparelho | TC-FUNC-023 |
| LAV-62 | prd | `h1` e título da aba em todos os estados | TC-FUNC-024, TC-CFR-003, TC-SMOKE-001 |
| LAV-63 | prd | grades caem a uma coluna com fonte grande | TC-CFR-001, TC-FUNC-030 |
| LAV-64 | prd | barras sem animar com movimento reduzido | TC-CFR-002 |
| LAV-65 | prd | nada que identifique a cliente | TC-SEC-005 |
| §10.1 | prd | Visitas e Vendas idênticos à faixa do Início | TC-FUNC-025, TC-REG-002 |
| §10.2 | prd | Olhando + Sacola + Checkout = total | TC-FUNC-004 |
| §10.3 | prd | sem consentimento, robô, host interno ou opt-out nunca aparece | TC-SEC-001, TC-SEC-002, TC-SEC-003, TC-SEC-004 |
| §10.4 | prd | fechar a aba tira do total em até 5 min | TC-JOURNEY-002 |
| §10.5 | prd | app em segundo plano não lê | TC-FUNC-022 |
| R-01 — PRD §7, item 1 | prd | sem consentimento nenhum aviso; nota "Conta só quem aceitou cookies de estatística." na tela | TC-SEC-001, TC-FUNC-008 |
| R-02 — PRD §7, último item | prd | Política de Privacidade com o aviso de presença, 30 min, 1 h, 14 dias, sem IP nem endereço | TC-FUNC-017 |

**Sem cobertura:**

- LAV-04 — o cartão "Visitas hoje" da Fase 1 foi substituído pela Fase 2, como o próprio critério manda
- §10.7 — idem: o cartão da Fase 1 não existe mais
- LAV-48 — Cidades (Fase 4), fora do Work Item por decisão do usuário (`item.md`)
- LAV-50, LAV-52, LAV-53, LAV-54 — Fase 1 (feature 83), que esta costura não muda além de LAV-51
- LAV-41 — "guarda só a faixa": é do esquema do banco, que a persona não vê; provado por `presencaSchema.test.ts` e probe 01 na Validation
- §10.6 — "o banco não guarda IP, UA, referrer nem URL": idem, teste de esquema da Validation; a Política o declara (TC-FUNC-017)

## Riscos

| Risco (para o usuário) | Probabilidade | Impacto na persona | Mitigação no plano |
| ---------------------- | ------------- | ------------------ | ------------------ |
| A cliente na loja não aparece no app (aviso recusado como robô, host ou consentimento mal lido) | média | abala confiança | CH-01 (TC-JOURNEY-001), CH-02 (TC-SEC-004 com a contraprova) |
| O funil soma diferente do total, ou a barra de agora diverge do número | média | abala confiança | CH-01 (TC-FUNC-003, TC-FUNC-004) |
| Quem recusou estatística aparece em algum número | baixa | abala confiança (privacidade) | CH-02 (TC-SEC-001, TC-SEC-002, TC-SEC-003) |
| Quem saiu continua contado | média | abala confiança | CH-03 (TC-JOURNEY-002, TC-FUNC-014) |
| O aviso de presença deixa a loja lenta no checkout | baixa | impede concluir (da cliente) | CH-03 (TC-REG-003) |
| Visitas e Vendas diferentes entre a faixa e Acessos, ou entre app e painel | baixa | abala confiança | CH-05 (TC-FUNC-025, TC-REG-002) |
| Número de presença vazando para quem perdeu o acesso | baixa | abala confiança | CH-07 (TC-SEC-006, TC-SEC-007) |
| Números sobrepostos com a fonte grande | média | fricção | CH-08 (TC-CFR-001) |
| Usuário avançado e ocasional não separados (a Adri é a única) | — | — | declarado em Personas › Não cobertas |

## Perguntas

- 🟡 Duas abas do mesmo navegador: o plano assume uma pessoa (D-01, código por navegador e por dia); qual estado vence quando cada aba está numa página não é decidido — TC-FUNC-016 só confere "uma pessoa"
- 🟡 Joia sem foto na lista C: o plano assume o mesmo marcador das joias do Início e não confere o desenho dele (TC-FUNC-009)
- 🟡 Nome longo de joia em C a 390: assumido que quebra sem rolagem horizontal do body (convenção do `CLAUDE.md`); truncar ou quebrar não é decidido (TC-FUNC-009)
- 🟡 Empate de número entre o Guia e uma joia: o plano não confere a ordem do empate (a regra "empate por nome" é das joias; TC-FUNC-010)
- 🟡 A letra pequena do "Direto" (LAV-40) e a da soma dos dias (LAV-51) não têm texto literal no PRD: os casos conferem o sentido (TC-FUNC-012, TC-FUNC-027)
- 🟡 A variação "vs semana anterior" e a de "Com sacola" só aparecem com o período anterior medido inteiro desde a publicação: o plano assume massa semeada com o marco de início da medição antes da semana passada; sem ela, TC-FUNC-028 fica `blocked`
- 🟡 "Compraram (últimos 30 min)" depende de pedido aprovado semeado no banco local, porque o pagamento local não sobe (TC-FUNC-007)
- 🟡 Tablet simulado por UA de iPad, assumindo que o servidor o classifica como tablet (TC-FUNC-013)
- 🟢 Na virada da meia-noite o código da presença troca (D-01); por até 5 min a mesma pessoa pode contar duas vezes — nenhuma fonte trata o caso
- 🟢 Os links do Instagram e do WhatsApp sem `utm` contam como Direto (spec › Não resolvido): prática da Adri, fora do código
- 🟢 A aprovação da Adri do texto da Política é pré-condição da publicação; este QA confere o texto contra o §7, não a aprovação
