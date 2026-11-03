```json
{
  "schema": "qa-plan/v1",
  "title": "Plano de QA — Compre Junto na página do produto",
  "summary": {
    "total_cases": 74,
    "by_priority": { "P0": 12, "P1": 53, "P2": 9, "P3": 0 }
  },
  "acceptance_criteria_covered": 65,
  "strategy": [
    "Exploração por charter no browser real (Playwright MCP ou playwright-cli), uma persona por sessão, no ambiente local (Supabase :54441, loja :8082, painel :8083)",
    "Celular primeiro: 390 × 844 antes de 1440 × 900, com fonte a 130% e 200% no bloco",
    "E2E (Playwright) pedido à automação p/ fluxos P0/P1 determinísticos",
    "Integration com o Dev p/ conversão, marca forjada, régua do relatório, GA4, feed e RLS (probes e testes já existentes)",
    "Manual p/ usabilidade, acessibilidade, relatório com massa paga e conferência contra os protótipos do Claude Design"
  ],
  "cases": [
    { "id": "TC-SMOKE-001", "title": "A página do pingente abre com o bloco \"Compre junto\" e nada marcado", "priority": "P0", "type": "smoke", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-SMOKE-002", "title": "Marcar um adicional e levar o conjunto põe o pingente e a peça na sacola", "priority": "P0", "type": "smoke", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-SMOKE-003", "title": "A dona abre o Compre Junto no painel e salva uma lista com uma peça", "priority": "P0", "type": "smoke", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-001", "title": "No celular, a cliente monta pingente e corrente da lista e leva o conjunto pela barra fixa", "priority": "P0", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-002", "title": "Do conjunto ao pedido como convidada, pelo valor visto, com \"acompanha\" na confirmação", "priority": "P0", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-003", "title": "A dona cria a lista \"Correntes\", a oferece num pingente e a vê na loja", "priority": "P0", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-004", "title": "A dona troca a forma do bloco e a loja abre as escolhas na forma nova", "priority": "P1", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-005", "title": "A cliente volta com a sacola de antes da mudança e completa o conjunto sem perder nada", "priority": "P1", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-006", "title": "A dona confere a adesão do período e o histórico não muda ao editar a lista", "priority": "P1", "type": "journey", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-FUNC-001", "title": "O bloco só aparece quando há adicional disponível; sem nenhum, a página fica como hoje", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-002", "title": "Sem adicional marcado, o botão diz \"Adicionar à sacola\" e leva só a joia", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-003", "title": "O conjunto usa a variação da joia já escolhida, sem repetir o seletor", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-004", "title": "O total do conjunto soma os preços das variações escolhidas e mostra o PIX ao lado", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-005", "title": "Adicional marcado sem a escolha completa não entra, e o bloco diz qual escolha falta", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-006", "title": "A lista mostra as peças na ordem da dona, aceita uma só e nunca oferece a própria joia nem peça repetida", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-007", "title": "Variação esgotada não pode ser escolhida e peça sem nenhuma variação vendável não aparece", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-008", "title": "A gravação do adicional é pedida dentro do bloco, com o limite da peça, e vai para a linha certa", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-009", "title": "Adicional que exige material entra normalmente, e o bloco não diz qual material", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-010", "title": "O bloco abre com o título e a frase ratificados, e o rodapé explica o que o botão leva", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-011", "title": "No celular não há seletor de quantidade; no computador a quantidade da joia entra no total", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-012", "title": "Cada peça do conjunto entra como linha própria, o adicional com quantidade 1, e a sacola abre", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-013", "title": "A mesma peça já na sacola soma à linha, que passa a dizer quais joias ela acompanha", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-014", "title": "Gravação acima do limite em qualquer peça impede o conjunto inteiro, com a recusa junto do campo", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-015", "title": "Remover uma linha do conjunto não remove as outras, e sem a joia a peça perde o \"acompanha\"", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-016", "title": "Joia em combinação indisponível bloqueia o conjunto com o aviso da página; joia esgotada esconde o bloco", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-017", "title": "A barra fixa do celular mostra o total e \"Conjunto · N peças\" com o conjunto, e o preço com PIX sem ele", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-018", "title": "Na sacola, o adicional diz \"acompanha o\" e o nome completo da joia, quebrando linha se preciso", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-019", "title": "No pedido, cada adicional diz que acompanha a joia — na confirmação, em Minha Conta e no painel", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-020", "title": "O adicional marcado para sumir numa variação da joia sai do bloco quando ela é escolhida", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-021", "title": "Peça que saiu do ar ou esgotou some do bloco, e os outros adicionais continuam", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-022", "title": "Se a leitura dos adicionais falha, o bloco não aparece e a página continua de pé", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-023", "title": "O valor do pedido é o total mostrado na sacola e no checkout, sem efeito da marca \"acompanha\"", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-024", "title": "Na forma \"Em folha\", as escolhas abrem numa folha (celular) ou diálogo (computador) que cuida do foco", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-025", "title": "Na forma \"Com fórmula\", a faixa \"Esta joia + …\" fica acima da lista e fora do leitor de tela", "priority": "P2", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-026", "title": "As regras do conjunto valem iguais nas três formas do bloco", "priority": "P1", "type": "functional", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-FUNC-027", "title": "Sem forma gravada, o painel mostra \"Na linha\" marcada e a loja abre as escolhas na linha", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-028", "title": "Uma forma gravada desconhecida é tratada como \"Na linha\" e a página não quebra", "priority": "P1", "type": "functional", "automation": { "target": "integration", "status": "missing" } },
    { "id": "TC-FUNC-029", "title": "A lista exige nome de até 40 caracteres, e a lista sem peças salva mas não pode ser escolhida", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-030", "title": "A dona reordena as peças da lista e a loja mostra a nova ordem", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-031", "title": "A dona escolhe quais variações de cada peça valem, e nenhuma marcada vale todas as ativas", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-032", "title": "A lista mostra em quantas joias está em uso, e editá-la muda o bloco de todas", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-033", "title": "A peça da lista que saiu do ar aparece marcada no painel", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-034", "title": "Uma lista em uso não pode ser apagada, e o painel diz em quais joias ela está", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-035", "title": "O 4º adicional de uma joia e a 13ª peça de uma lista são recusados com o motivo escrito", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-036", "title": "A própria joia e uma peça já escolhida aparecem desabilitadas, com o motivo, na busca do adicional", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-037", "title": "O adicional que aponta para um produto inativo aparece marcado \"saiu do ar\" na aba do produto", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-038", "title": "A dona ordena os adicionais da joia e a loja segue essa ordem", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-039", "title": "Gravar uma joia não apaga nem altera o Compre Junto de outra", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-040", "title": "A lista do Compre Junto não vira vitrine, página nem item de menu da loja", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-041", "title": "O relatório mostra pedidos, peças e valor do Compre Junto no período de 7, 30 ou 90 dias", "priority": "P1", "type": "functional", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-FUNC-042", "title": "O relatório abre por joia principal e por lista, com a peça que mais sai e a linha \"direto no produto\"", "priority": "P1", "type": "functional", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-FUNC-043", "title": "Sem pedido com Compre Junto no período, o relatório diz isso por escrito", "priority": "P2", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-INT-001", "title": "O pedido do conjunto com uma peça que exige material entra na fila de material do painel", "priority": "P1", "type": "integration", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-INT-002", "title": "O Compre Junto antigo de cada joia vira adicionais do tipo peça, até três, na mesma ordem", "priority": "P1", "type": "integration", "automation": { "target": "integration", "status": "missing" } },
    { "id": "TC-INT-003", "title": "Uma marca \"acompanha\" ou um preço forjados no pedido não mudam o valor, e a marca sem joia no pedido é descartada", "priority": "P1", "type": "integration", "automation": { "target": "integration", "status": "missing" } },
    { "id": "TC-INT-004", "title": "O relatório conta só pedidos pagos e não cancelados, soma a quantidade da linha e não muda com a lista editada", "priority": "P1", "type": "integration", "automation": { "target": "integration", "status": "missing" } },
    { "id": "TC-INT-005", "title": "Ver o bloco, escolher um adicional e levar o conjunto geram os eventos do GA4 sem contar a joia duas vezes", "priority": "P1", "type": "integration", "automation": { "target": "integration", "status": "missing" } },
    { "id": "TC-INT-006", "title": "O preço anunciado ao Google da joia não muda por causa do Compre Junto", "priority": "P1", "type": "integration", "automation": { "target": "integration", "status": "missing" } },
    { "id": "TC-INT-007", "title": "Só a dona grava a configuração do Compre Junto; a loja lê sem conseguir escrever", "priority": "P1", "type": "integration", "automation": { "target": "integration", "status": "missing" } },
    { "id": "TC-SEC-001", "title": "As telas do Compre Junto no painel só abrem para quem tem acesso de administradora", "priority": "P1", "type": "security", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-REG-001", "title": "A joia sem Compre Junto se compra como antes, com \"Você também vai curtir\" e o checkout de sempre", "priority": "P1", "type": "regression", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-UI-001", "title": "O bloco \"Compre junto\" na forma \"Na linha\" confere com o protótipo da loja em 390 e 1440", "priority": "P1", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-UI-002", "title": "A barra fixa com o conjunto e a linha \"Acompanha o …\" da gaveta conferem com o protótipo", "priority": "P2", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-UI-003", "title": "As formas \"Em folha\" e \"Com fórmula\" conferem com o protótipo da loja", "priority": "P2", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-UI-004", "title": "O índice e o editor de listas do painel conferem com o protótipo", "priority": "P2", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-UI-005", "title": "A aba \"Compre junto\" do produto confere com o protótipo do painel", "priority": "P2", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-UI-006", "title": "A aba Adesão confere com o protótipo do painel", "priority": "P2", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-001", "title": "Em 390, o bloco não cria rolagem lateral e cada controle tem pelo menos 44px, mesmo com nomes longos e fonte a 200%", "priority": "P1", "type": "cfr", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-002", "title": "Pelo teclado, cada adicional é uma caixa marcável que diz qual peça e qual variação leva", "priority": "P1", "type": "cfr", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-003", "title": "Enquanto os adicionais carregam, o espaço do bloco fica reservado e a página não salta", "priority": "P1", "type": "cfr", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-004", "title": "Com \"reduzir movimento\" ligado, o bloco abre e fecha as escolhas sem animação decorativa", "priority": "P1", "type": "cfr", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-005", "title": "Os textos do bloco e da barra fixa não usam urgência, contagem, escassez, prova social nem emoji", "priority": "P1", "type": "cfr", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-PERSONA-001", "title": "Na primeira visita pelo celular, Marina entende o bloco e leva o conjunto sem ajuda", "priority": "P2", "type": "persona", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-PERSONA-002", "title": "Adri monta uma lista e a oferece em três joias sem perder trabalho nem consultar ninguém", "priority": "P2", "type": "persona", "automation": { "target": "manual", "status": "na" } }
  ]
}
```

# Plano de QA — WI-01 · Compre Junto na página do produto

**Work Item:** WI-01 (feature) · **Escopo:** completo · **Foco:** —
**Versão do plano:** 2 · **Escrito em:** 2026-11-02 · **Modo:** revisar
**Gate 1:** aprovado em 2026-11-02 (Têmis, árbitro do orquestrador, pela política do humano)

## Resumo

- **Valor para o usuário:** na página de uma joia, a cliente encontra até três peças que a dona escolheu para acompanhá-la (a corrente para o pingente, uma segunda peça), escolhe modelo, variação e gravação de cada uma sem sair da página e leva tudo à sacola num gesto só, pelo valor que viu; a sacola e o pedido dizem que a peça acompanha a joia. A dona monta listas reutilizáveis de peças, define por joia o que oferecer, escolhe como o bloco aparece na loja e acompanha a adesão num relatório.
- **Maior risco para o usuário:** a cliente no celular leva pela barra fixa um conjunto diferente do que marcou no bloco (peça a menos, variação errada, valor diferente) — numa compra memorial, em que o erro chega depois, na peça feita à mão.
- **Contagens:** personas 4 · jornadas 6 · charters 8 (CFR 1 · design-check 1) · TC 74 (P0 12 · P1 53 · P2 9 · P3 0)
- **Automação:** e2e 50 (missing 50 · existing 0 · blocked 0) · integration 7 · manual 17

## Escopo

**Dentro:** o bloco Compre Junto na página do produto (as três formas), o botão único e a barra fixa do celular, a sacola com a frase "acompanha" e a sacola de antes da mudança, o pedido com a marca (confirmação, Minha Conta, painel e fila de material), o menu Catálogo › Compre Junto do painel (listas, forma do bloco, aba Adesão) e a aba "Compre junto" do formulário do produto. Os 58 critérios de aceite e os 7 requisitos não funcionais do `prd.md`.

**Fora:** o que o `prd.md` › Fora e a costura excluem — desconto da compra casada (Work Item 92), combinar o acabamento (Work Item 93), Compre junto no card da vitrine, na gaveta da sacola e no checkout, o pedido montado pelo painel (feature 89), recomendação automática, aviso de corrente já como variação, e o order bump e o "Complete o frete grátis" (que seguem como estão, conferidos só pelo canário TC-REG-001). Fora da costura: o campo de desconto e a faixa "convertido do antigo" do protótipo do painel, a folha de separação do pedido e a segunda migration (`drop column`). Telas vizinhas que a mudança não toca (galeria, frete, acordeão, outras abas do formulário do produto, Dashboard) não ganham charter.

## Fontes

| Fonte      | Caminho                             | Uso                                        |
| ---------- | ----------------------------------- | ------------------------------------------ |
| PRD        | `.specs/work-items/WI-01-compre-junto/prd.md` | critérios de aceite (CA-01.1…CA-09.5, RNF-01…07) — a régua da cobertura |
| Costura    | `spec.md` (e `tasks/01..07`)        | o que o Dev entendeu, os textos e estados do protótipo, as Decisões e o que ficou fora |
| Fontes de design | `claude_design` · Loja: https://claude.ai/design/p/69224d8a-17ae-4b1f-a251-a8105b41edc2?file=Produto+-+Compre+Junto.html · Painel: https://claude.ai/design/p/e3957c10-bd49-4f3d-9256-04d72a7d0f41?file=Produto+-+Compre+Junto.html e https://claude.ai/design/p/e3957c10-bd49-4f3d-9256-04d72a7d0f41?file=Compre+Junto+-+Listas+e+ades%C3%A3o.html | telas existentes; charter `design-check` (CH-08) |
| Insumos    | `discovery.md`, `prd-review.md`, `session-summary.md`, `waves.md`; `probes/05-adesao.sh` (molde da massa M-08) | decisões de comportamento implementado (T04: N × total), os probes já rodados, as pendências declaradas |
| Validation | `qa-report.md`                      | Status PASS; "layout em navegador fica para a QA" — CA-03.11 e as três formas só com régua de fonte |
| Projeto    | `.specs/project/PROJECT.md`         | ambiente local (Supabase 54440–54449; `pnpm dev:store` :8082, `pnpm dev:backoffice` :8083), testes só no local |

## Personas

Detalhe em [personas.md](personas.md).

| ID     | Nome   | Arquétipo                       | Objetivo    | Conta          | Jornadas   |
| ------ | ------ | ------------------------------- | ----------- | -------------- | ---------- |
| PER-01 | Marina | Usuária mobile                  | levar o pingente e a corrente pelo celular, como convidada | `anonima` | J-01, J-02 |
| PER-02 | Adri   | Usuária avançada (dona do ateliê) | montar listas, oferecer nas joias, escolher a forma e ler a adesão | `admin-painel` | J-03, J-04, J-06 |
| PER-03 | Helena | Usuária de tecnologia assistiva | montar o conjunto só com teclado e zoom 200% | `anonima` | J-01 (sec.), J-04 (sec.) |
| PER-04 | Sônia  | Usuária ocasional               | voltar com a sacola de antes e completar o conjunto | `anonima` | J-02 (sec.), J-05 |

**Não cobertas:** novo usuário em computador (o caso principal é o celular, coberto por PER-01); usuária em recuperação (não há bug anterior; a continuidade da sacola fica com PER-04); leitor de tela real (fora do browser da sessão).

## Jornadas

| ID   | Jornada (pelo valor) | Persona principal · secundária | Prioridade | Abandono/erro | Cruza fronteira      | Arquivo                         |
| ---- | -------------------- | ------------------------------ | ---------- | ------------- | -------------------- | ------------------------------- |
| J-01 | Montar pingente e corrente no celular e levar o conjunto à sacola | PER-01 · PER-03 | P0 | J-01a, J-01b, J-01c, J-01d | não | [J-01](journeys/J-01-montar-o-conjunto-no-celular.md) |
| J-02 | Fechar o pedido do conjunto como convidada e ver que a corrente acompanha a joia | PER-01 · PER-04 | P0 | J-02a, J-02b, J-02c | sim: edge function `checkout` · Mercado Pago (PIX) | [J-02](journeys/J-02-fechar-o-pedido-do-conjunto.md) |
| J-03 | Montar a lista "Correntes" e oferecê-la num pingente | PER-02 · — | P0 | J-03a, J-03b, J-03c, J-03d | não | [J-03](journeys/J-03-montar-a-lista-e-oferecer-no-pingente.md) |
| J-04 | Escolher a forma do bloco e ver a loja abrir as escolhas nela | PER-02 · PER-03 | P1 | J-04a, J-04b | não | [J-04](journeys/J-04-escolher-a-forma-do-bloco.md) |
| J-05 | Voltar com a sacola de antes e completar o conjunto com a corrente que já estava lá | PER-04 · — | P1 | J-05a, J-05b | não | [J-05](journeys/J-05-voltar-com-a-sacola-de-antes.md) |
| J-06 | Acompanhar a adesão ao Compre Junto no relatório | PER-02 · — | P1 | J-06a, J-06b | não | [J-06](journeys/J-06-acompanhar-a-adesao.md) |

## Charters

Ordem de execução — a Fase 2 despacha nesta sequência. O teto da costura **grande** (fluxo novo, várias telas em dois apps, 65 critérios) é de 6 exploratórios mais `cfr` e `design-check`: o plano usa 6 + 1 + 1. CH-03 roda primeiro porque monta, pelo painel, a massa das sessões da loja. Dentro do CH-04, TC-FUNC-043 (relatório vazio) é conferido **antes** de a thread gravar a M-08; os outros casos do relatório, depois.

| Ordem | ID    | Missão                               | Persona   | Tour   | Time-box | Prioridade | TC             | Arquivo                           |
| ----- | ----- | ------------------------------------ | --------- | ------ | -------- | ---------- | -------------- | --------------------------------- |
| 1     | CH-03 | a dona monta lista e adicionais sem perder trabalho, empurrando os limites, com recusas escritas | PER-02 | Garbage | 60 min | P0 | TC-SMOKE-003, TC-JOURNEY-003, TC-FUNC-029–031, 035, 036, 038–040, TC-SEC-001, TC-PERSONA-002 | [CH-03](charters/CH-03-listas-e-adicionais-no-painel.md) |
| 2     | CH-01 | quem abre o pingente pela primeira vez no celular monta e leva pela barra fixa exatamente o que marcou | PER-01 | Feature | 60 min | P0 | TC-SMOKE-001, 002, TC-JOURNEY-001, TC-FUNC-001–007, 010, 011, 017, 020, TC-REG-001, TC-PERSONA-001 | [CH-01](charters/CH-01-bloco-no-celular.md) |
| 3     | CH-02 | nenhum jeito de o conjunto chegar ao pedido com valor, gravação ou peça diferente, ou sem a marca | PER-01 | Money | 60 min | P0 | TC-JOURNEY-002, TC-FUNC-008, 009, 012, 014, 016, 018, 019, 023, TC-INT-001 | [CH-02](charters/CH-02-do-conjunto-ao-pedido.md) |
| 4     | CH-04 | nenhum estado velho entre o que a dona muda no painel e o que a loja e o relatório mostram | PER-02 | Multi-Tab | 90 min | P1 | TC-JOURNEY-004, 006, TC-FUNC-021, 027, 032–034, 037, 041–043 | [CH-04](charters/CH-04-painel-e-loja-em-duas-abas.md) |
| 5     | CH-05 | quem é interrompida e volta encontra a sacola como deixou, sem duplicata nem "acompanha" falso | PER-04 | Interrupt | 60 min | P1 | TC-JOURNEY-005, TC-FUNC-013, 015, 022 (e o trecho de Minha Conta de TC-FUNC-019) | [CH-05](charters/CH-05-sacola-que-sobrevive.md) |
| 6     | CH-06 | só com o teclado, o mesmo conjunto nas três formas, sem folha que prende ou perde o foco | PER-03 | Back-Button | 60 min | P1 | TC-FUNC-024–026 | [CH-06](charters/CH-06-tres-formas-pelo-teclado.md) |
| 7     | CH-07 | CFR — J-01, J-02                     | PER-03    | —      | 45 min   | P1         | TC-CFR-001–005 | [CH-07](charters/CH-07-cfr.md) |
| 8     | CH-08 | design-check — bloco, barra fixa, sacola e telas do painel · Claude Design | PER-02 | — | 60 min | P1 | TC-UI-001–006 | [CH-08](charters/CH-08-design-check.md) |

Casos que ficam com o Dev (target `integration`, não executados nas sessões): TC-FUNC-028, TC-INT-002–007.

## Estratégia

- **Como se exercitam as jornadas:** um charter por área de risco, uma persona por sessão, no browser real pelo Playwright (MCP ou CLI), contra o ambiente local; os `TC-*` são conferidos dentro do charter que os cita. Celular primeiro: toda tela da loja é vista em 390 × 844 antes de 1440 × 900 (o plano usa as medidas do projeto, não 375/1280).
- **CFR:** as seis categorias entram no CH-07, sobre J-01 e J-02, porque o Work Item muda layout, texto, interação por teclado e carregamento da página de maior tráfego. CFR do painel não entra nesta rodada: a superfície principal e de maior risco é a loja; o painel é de uso diário de uma pessoa só.
- **Conferência visual:** CH-08 confere bloco (três formas), barra fixa e gaveta contra o protótipo da loja, e índice/editor de listas, aba do produto e Adesão contra os do painel. Sem frame (registrar, não comparar): a escolha da forma no painel, o selo "saiu do ar" na aba do produto, "acompanha" no pedido, estados de carregando/erro do painel.
- **Onde termina o simulado:** tudo roda no Supabase local (:54441, nunca `*.supabase.co`), com a `checkout` local. A geração do PIX depende da `mercado-pago` local, com boot registrado como problemático; pela decisão D-02, o "cobrado" é o valor do pedido gravado (tela de pagamento e painel), e o QR não é condição de caso nenhum. Os pedidos pagos do relatório vêm da massa M-08, gravada pela thread (decisão D-01). E-mails (código de Minha Conta) caem no Mailpit (:54444). O GA4 só mede num build servido (TC-INT-005, com o Dev). Leitor de tela real, Safari/iOS e Chrome Android ficam fora — só o engine que o driver abrir.
- **Automação:** 50 casos `e2e` + `missing` ficam como pedido de automação E2E; 7 `integration` ficam com o Dev (já cobertos por probes e testes citados em cada caso); `blocked`: nenhum no planejamento.

### Suíte smoke

| Ordem | TC   | Jornada | O que prova                            |
| ----- | ---- | ------- | -------------------------------------- |
| 1     | TC-SMOKE-003 | J-03 | o painel abre o Compre Junto e grava uma lista |
| 2     | TC-SMOKE-001 | J-01 | a página do pingente abre com o bloco, nada marcado |
| 3     | TC-SMOKE-002 | J-01 | o gesto único leva a joia e o adicional à sacola |

Smoke que falha ⇒ pare: veredito `fail` sem rodar o resto.

## Critérios de entrada

- [ ] Validation do Dev com `Status: PASS` no `qa-report.md` (está: 2026-11-02)
- [ ] App do branch `feature/WI-01` rodando no ambiente local: `supabase status` de pé (54440–54449), as quatro migrations do WI aplicadas no local, `pnpm dev:store` (:8082) e `pnpm dev:backoffice` (:8083) com a env do banco local (o worktree não tem `.env`: `VITE_SUPABASE_URL=http://127.0.0.1:54441` e a chave publicável local)
- [ ] App acessível num ambiente com paridade de produção (auth real do Supabase local, cookies habilitados) — o desvio (dev server, não build de produção) é registrado no CH-07
- [ ] Credencial para cada persona que precisa de conta — `admin-painel`: `QA_ADMIN_PAINEL_USUARIO` / `QA_ADMIN_PAINEL_SENHA`, o usuário de desenvolvimento do `supabase/seed.sql` do worktree (seção 5); nunca o valor no plano
- [ ] Massa de dados que atende as pré-condições das jornadas (M-01…M-07 montadas pela thread com a conta `admin-painel` antes do smoke, ou pelo próprio CH-03, e conferidas):
  - **M-01** pingente ativo com variações (uma delas "Chaveiro" e uma combinação indisponível), gravação com limite e três adicionais: A1 = lista "Correntes"; A2 = peça só, com variações (parte liberada), marcada para sumir em "Chaveiro"; A3 = peça só que exige material
  - **M-02** lista "Correntes" com ≥ 3 peças em ordem conhecida: uma com uma variação esgotada, uma com gravação de limite diferente do principal, uma com todas as variações esgotadas; contendo também o próprio M-01 e a peça de A2
  - **M-03** segundo pingente usando "Correntes" (lista em uso em 2 joias)
  - **M-04** joia sem Compre Junto (canário)
  - **M-05** joia inteira esgotada, com Compre Junto
  - **M-06** joia de nome longo com três adicionais de nome longo
  - **M-07** sacola de antes da mudança (formato versão 3 de `estrelinha-cart`) com uma corrente de M-02, gravada no navegador antes do CH-05
  - percentual de PIX configurado em `store_settings`; nenhuma forma do bloco gravada no início
- [ ] **M-08 — pedidos pagos com Compre Junto para o relatório** (decisão D-01):
  - **Quem grava:** a thread principal, direto no Postgres **local** (`127.0.0.1:54442`, nunca o projeto hospedado), no molde do probe `[ITEM_DIR]/probes/05-adesao.sh`, mas **sem** a transação desfeita: os pedidos ficam gravados durante a sessão
  - **Quando:** dentro do CH-04, depois de conferir TC-FUNC-043 (relatório vazio) e antes de TC-FUNC-041, TC-FUNC-042 e TC-JOURNEY-006; fica no banco até o CH-08 (TC-UI-006)
  - **O que gravar** (datas reais relativas a hoje no dia de Brasília, sobre M-01, M-03, a lista "Correntes" e uma segunda lista sem venda — não em 2030 como o probe):
    - P1 · pago há 1 dia: M-01, corrente da lista "Correntes" numa variação com quantidade 2, marcada como acompanhando M-01 pela lista; e uma peça de adicional "Uma peça só" (A2) com quantidade 1, marcada como acompanhando M-01 sem lista
    - P2 · pago e **cancelado** há 2 dias, com Compre Junto — deve ficar de fora
    - P3 · **pendente** há 2 dias, com Compre Junto — deve ficar de fora
    - P4 · pago há 3 dias: M-01 e M-03 com a mesma corrente (quantidade 1) acompanhando os dois, mais uma linha marcada com um principal que não está no pedido — essa marca não conta
    - P5 · pago há 10 dias: M-01 com outra variação da corrente pela lista — entra em 30 e 90, não em 7
    - P6 · pago há 2 dias, sem nenhuma peça do Compre Junto — entra só no denominador da parte dos pedidos pagos
    - a segunda lista (ex.: "Probe Sem Venda") existe e não tem venda no período
  - **Antes de gravar:** anotar os números esperados por período (7, 30, 90) a partir dessa massa, para a sessão comparar com a tela
  - **Limpeza:** ao fim da rodada (depois do CH-08), a thread apaga os pedidos, itens e listas que gravou para a M-08, por identificador anotado no momento da gravação, e confere que nenhum ficou
- [ ] Driver de browser disponível — Playwright MCP headless, ou `playwright-cli` como fallback; bloqueio de `*.supabase.co` por rota
- [ ] Com charter `design-check`: o MCP do Claude Design disponível na sessão, com acesso aos dois projetos

## Critérios de saída

- **`pass`** — toda jornada `P0` chega ao objetivo, nenhum bug `critical`/`high` aberto, todos os charters rodaram
- **`partial`** — caso `P0`/`P1` `blocked` ou charter que não rodou (inclui CH-08 `not-run` sem o MCP do Claude Design)
- **`fail`** — caso `P0` falhou, ou bug `critical`/`high` aberto
- Todo caso `e2e` + `missing`/`blocked` com o pedido de automação registrado
- A massa M-08 apagada do banco local ao fim da rodada

## Cobertura

| Critério | Fonte      | Resumo do critério | TC                          |
| -------- | ---------- | ------------------ | --------------------------- |
| CA-01.1 | prd | nome até 40 com contador; lista vazia salva e não escolhível | TC-FUNC-029, TC-JOURNEY-003, TC-SMOKE-003, TC-UI-004 |
| CA-01.2 | prd | reordenar peças; a loja mostra a ordem | TC-FUNC-030, TC-JOURNEY-003 |
| CA-01.3 | prd | variações que valem por peça; nenhuma = todas | TC-FUNC-031 |
| CA-01.4 | prd | "em uso em N"; editar muda todos | TC-FUNC-032 |
| CA-01.5 | prd | peça fora do ar marcada e pulada | TC-FUNC-033, TC-FUNC-021 |
| CA-01.6 | prd | a lista não vira vitrine nem página | TC-FUNC-040 |
| CA-01.7 | prd | lista em uso não se apaga, nomeia as joias | TC-FUNC-034 |
| CA-02.1 | prd | até 3 adicionais, 4ª recusada com motivo | TC-FUNC-035, TC-UI-005 |
| CA-02.2 | prd | adicional produto com variações liberadas | TC-FUNC-031 |
| CA-02.3 | prd | adicional lista | TC-JOURNEY-003 |
| CA-02.4 | prd | ordenar adicionais | TC-FUNC-038, TC-JOURNEY-003 |
| CA-02.5 | prd | principal e repetido desabilitados com motivo | TC-FUNC-036 |
| CA-02.6 | prd | gravar um produto não altera outro | TC-FUNC-039 |
| CA-02.7 | prd | adicional de produto inativo marcado e pulado | TC-FUNC-037, TC-FUNC-021 |
| CA-02.8 | prd | conversão do Compre Junto antigo | TC-INT-002 |
| CA-02.9 | prd | adicional some em variações do principal | TC-FUNC-020 |
| CA-03.1 | prd | bloco só com adicional disponível para a variação | TC-FUNC-001, TC-FUNC-020 |
| CA-03.2 | prd | nada marcado ao abrir | TC-FUNC-002, TC-SMOKE-001 |
| CA-03.3 | prd | usa a variação do principal, sem seletor repetido | TC-FUNC-003, TC-JOURNEY-001 |
| CA-03.4 | prd | total pelas variações, principal × quantidade | TC-FUNC-004, TC-FUNC-011 |
| CA-03.5 | prd | PIX do conjunto ao lado do total | TC-FUNC-004 |
| CA-03.6 | prd | diz qual escolha falta | TC-FUNC-005 |
| CA-03.7 | prd | lista: ordem da dona, uma escolha, pula principal e repetida | TC-FUNC-006, TC-JOURNEY-001 |
| CA-03.8 | prd | esgotada não escolhível; sem vendável não aparece | TC-FUNC-007 |
| CA-03.10 | prd | gravação do adicional no bloco; adicional com material entra | TC-FUNC-008, TC-FUNC-009 |
| CA-03.11 | prd | 390 sem rolagem lateral; alvos ≥ 44px | TC-CFR-001 |
| CA-03.12 | prd | sem urgência, contagem, escassez, prova social | TC-CFR-005 |
| CA-03.13 | prd | não diz qual material | TC-FUNC-009 |
| CA-03.14 | prd | título, frase e rodapé literais | TC-FUNC-010, TC-SMOKE-001, TC-UI-001 |
| CA-03.15 | prd | sem seletor de quantidade no celular | TC-FUNC-011 |
| CA-04.1 | prd | linha própria, adicional com 1, soma e "o X e o Y" | TC-FUNC-012, TC-FUNC-013, TC-SMOKE-002, TC-JOURNEY-001, TC-JOURNEY-005 |
| CA-04.2 | prd | a sacola abre | TC-FUNC-012, TC-SMOKE-002, TC-JOURNEY-001 |
| CA-04.3 | prd | gravação recusada: nada entra, recusa junto do campo | TC-FUNC-014 |
| CA-04.4 | prd | remover uma linha não remove as outras | TC-FUNC-015 |
| CA-04.5 | prd | fila de material se qualquer peça exige | TC-INT-001, TC-JOURNEY-002 |
| CA-04.6 | prd | cobrado (valor do pedido gravado) = total da sacola e do checkout | TC-FUNC-023, TC-JOURNEY-002 |
| CA-04.7 | prd | sacola de antes intacta | TC-JOURNEY-005 |
| CA-04.8 | prd | principal indisponível bloqueia; esgotado esconde | TC-FUNC-016 |
| CA-04.9 | prd | barra fixa: total e "Conjunto · N peças", sem PIX | TC-FUNC-017, TC-JOURNEY-001, TC-UI-002 |
| CA-05.1 | prd | "acompanha o <nome completo>" na sacola | TC-FUNC-018, TC-FUNC-013, TC-UI-002 |
| CA-05.2 | prd | "acompanha" na confirmação, Minha Conta e painel | TC-FUNC-019, TC-JOURNEY-002 |
| CA-05.3 | prd | sem o principal, a peça perde a frase | TC-FUNC-015 |
| CA-05.4 | prd | a marca não muda preço | TC-FUNC-023, TC-INT-003 |
| CA-06.1 | prd | pedidos, peças e valor; snapshot no pedido | TC-FUNC-041, TC-JOURNEY-006, TC-INT-004 |
| CA-06.2 | prd | recorte por joia e por lista | TC-FUNC-042 |
| CA-06.3 | prd | só pagos e não cancelados (régua do Dashboard) | TC-INT-004 |
| CA-06.4 | prd | 7/30/90, parte dos pagos, média, mais vendida, "direto no produto", vazio escrito | TC-FUNC-041, TC-FUNC-042, TC-FUNC-043, TC-UI-006 |
| CA-06.5 | prd | peças pela quantidade da linha | TC-INT-004 |
| CA-07.1 | prd | indisponível some, os outros ficam | TC-FUNC-021 |
| CA-07.2 | prd | nenhum disponível: bloco some | TC-FUNC-001, TC-REG-001 |
| CA-07.3 | prd | leitura falha: página de pé | TC-FUNC-022 |
| CA-08.1 | prd | exibição e seleção com id de lista próprio | TC-INT-005 |
| CA-08.2 | prd | add_to_cart sem duplicar o principal | TC-INT-005 |
| CA-09.1 | prd | três formas no painel, valem para a loja | TC-JOURNEY-004, TC-FUNC-024, TC-FUNC-025, TC-UI-003 |
| CA-09.2 | prd | sem escolha, "Na linha" | TC-FUNC-027 |
| CA-09.3 | prd | regras iguais nas três | TC-FUNC-026 |
| CA-09.4 | prd | valor desconhecido = "Na linha" | TC-FUNC-028 |
| CA-09.5 | prd | foco e Esc na folha; fórmula fora do leitor | TC-FUNC-024, TC-FUNC-025 |
| RNF-01 | prd | mobile primeiro, sem rolagem horizontal | TC-CFR-001, TC-JOURNEY-001 |
| RNF-02 | prd | adicionais numa consulta, espaço reservado sem salto | TC-CFR-003 |
| RNF-03 | prd | preço ao Google não muda | TC-INT-006 |
| RNF-04 | prd | exibido = cobrado | TC-FUNC-004, TC-FUNC-023, TC-JOURNEY-002 |
| RNF-05 | prd | movimento respeita reduced motion | TC-CFR-004 |
| RNF-06 | prd | teclado e leitor: caixa com peça e variação no nome | TC-CFR-002 |
| RNF-07 | prd | escrita só pela dona; leitura pública | TC-SEC-001, TC-INT-007 |

**Sem cobertura:** nada. Ressalvas: CA-02.8, CA-05.4 (forja), CA-06.3, CA-06.5, CA-08.*, CA-09.4, RNF-03 e a escrita negada de RNF-07 são cobertos só por casos `integration` (probes e testes do Dev), porque a persona não alcança o estado pela tela. CA-06.1/06.2/06.4 com números são conferidos na tela sobre a massa M-08 (D-01).

## Riscos

| Risco (para o usuário)  | Probabilidade        | Impacto na persona                                                   | Mitigação no plano                 |
| ----------------------- | -------------------- | -------------------------------------------------------------------- | ---------------------------------- |
| a barra fixa leva um conjunto diferente do marcado no bloco | média | impede concluir (ou leva errado) | CH-01, TC-FUNC-017, TC-JOURNEY-001 |
| o bloco cria rolagem lateral ou alvos pequenos em 390 (só régua de fonte até aqui) | média | fricção / abala confiança | CH-07, TC-CFR-001 |
| gravação vai para a peça errada ou entra pela metade | baixa | perde dado | CH-02, TC-FUNC-008, TC-FUNC-014 |
| valor cobrado diverge do mostrado | baixa | abala confiança | CH-02, TC-FUNC-023, TC-INT-003 |
| sacola de quem já tinha peças é perdida no deploy | baixa | perde dado | CH-05, TC-JOURNEY-005 |
| gravar uma joia apaga a curadoria de outra | baixa | perde dado (da dona) | CH-03, TC-FUNC-039 |
| a dona edita a lista e a loja segue velha | média | abala confiança | CH-04, TC-FUNC-032 |
| a folha "Em folha" prende ou perde o foco | média | impede concluir (teclado) | CH-06, TC-FUNC-024 |
| leitura dos adicionais derruba a página do produto | baixa | impede concluir | CH-05, TC-FUNC-022 |
| tom do bloco soa como pressão comercial | baixa | abala confiança | CH-07, TC-CFR-005 |

Personas não cobertas (novo usuário em computador, em recuperação, leitor de tela real): ver Personas.

## Decisões

Respostas do humano às perguntas 🔴 da versão 1 do plano (página de perguntas, 2026-11-02):

| # | Pergunta | Resposta | O que mudou no plano |
| - | -------- | -------- | -------------------- |
| D-01 | Q-01 — como obter, no local, pedidos pagos com Compre Junto para conferir o relatório na tela (CA-06.1, CA-06.2, CA-06.4) | **A** — antes do charter que confere a adesão (CH-04), a thread grava no banco local a massa M-08 de pedidos pagos com Compre Junto, no molde do probe `probes/05-adesao.sh`, sem desfazer durante a sessão, e apaga ao fim da rodada | M-08 descrita nos Critérios de entrada (o que gravar, quem grava, quando, limpeza); TC-FUNC-041, TC-FUNC-042, TC-JOURNEY-006 e TC-UI-006 seguem manuais e P1; TC-FUNC-043 é conferido antes da gravação |
| D-02 | Q-02 — até onde vai o caso P0 "valor cobrado = total" se o PIX não gerar no local (CA-04.6, RNF-04) | **A** — o "cobrado" é o valor do pedido gravado, mostrado em `/pedido/:id/pagamento` e no painel, sem exigir o QR do PIX | TC-FUNC-023 e TC-JOURNEY-002 seguem P0 e executáveis na tela, com passos e esperado no valor do pedido gravado; a ausência do QR não reprova |

## Perguntas

- 🔴 nada
- 🟡 Com um adicional marcado e incompleto, o plano assume o que a implementação decidiu (session-summary, T04): "Conjunto · N peças" conta os marcados e o total soma só os completos. O PRD não decide; TC-FUNC-004 e TC-FUNC-017 registram o que a persona vê, e a divergência entre N e total, se confundir, vira achado de fricção.
- 🟡 A forma do bloco é uma configuração global da loja (premissa a confirmar da spec › Decisões, 1); o plano não testa forma por produto.
- 🟡 A massa M-01…M-07 é montada pela thread com a conta `admin-painel` (ou pelo CH-03) sobre o catálogo do banco local; se faltar produto com variação "Chaveiro", gravação ou material, a dona os ajusta no painel antes do smoke.
- 🟡 A sacola de antes da mudança (M-07) é gravada no navegador no formato da versão 3 de `estrelinha-cart` antes do CH-05 — é preparação de estado, não gesto da persona.
- 🟡 Minha Conta (TC-FUNC-019) é vista entrando por código no e-mail da compra, lido no Mailpit local (:54444); a convidada não tem senha.
- 🟡 Viewports do projeto (390 × 844 e 1440 × 900, mais 130% e 200% de fonte) no lugar de 375/1280 do template.
- 🟡 A conversão (CA-02.8) não tem o que ver no navegador: o banco local tem 0 de 734 produtos com o campo antigo; fica com o probe `02-conversao.sh` (TC-INT-002).
- 🟡 O GA4 (CA-08.*) só é conferido num build servido, interceptando por caminho `**/g/collect*`; fica com o Dev (TC-INT-005).
- 🟢 O `qa-report.md` diz "59/59 critérios", mas o PRD tem 58 critérios de aceite (a própria tabela do relatório tem 58 linhas) e mais 7 RNF; este plano conta 65.
- 🟢 A faixa "convertido do antigo" do protótipo do painel não foi construída (desvio declarado da T02); a dona não verá aviso nos produtos convertidos.
- 🟢 O relatório tem uma linha "Lista apagada" (session-summary, T06) que o PRD não descreve; TC-FUNC-042 registra o que aparece.
- 🟢 A folha de separação do pedido no painel não mostra "acompanha" (fora da costura, F9).
