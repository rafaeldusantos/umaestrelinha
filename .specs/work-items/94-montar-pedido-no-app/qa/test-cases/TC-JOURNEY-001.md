## TC-JOURNEY-001: Adri monta pelo celular o pedido de uma cliente nova a partir da conversa e manda o link pelo WhatsApp

**Tipo:** journey
**Prioridade:** P0
**Origem:** UC-02, UC-04, UC-05, UC-06, UC-07, UC-08, UC-09
**Autor:** dev
**Persona:** PER-01 Adri no WhatsApp
**Jornada:** J-01, passos 1–9
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** depende da leitura real pelo modelo (`customer-parse` com `ANTHROPIC_API_KEY`), não determinística; o mesmo caminho sem IA é a TC-JOURNEY-002

### Objetivo

A venda que nasceu na conversa vira link sem a Adri redigitar o que a cliente escreveu.

### Pré-condições

- Conta: `admin-atelie`
- Massa: a conversa sintética do CH-02 (com nome, e-mail novo, telefone, CPF e endereço de Porto Alegre); uma peça com variações e foto; um cupom % válido
- Estado de partida: `/pedidos`, sem rascunho no aparelho; `ANTHROPIC_API_KEY` no `.env` das functions locais

### Condições reais

As da persona.

### Entrada

Navegação interna: `http://localhost:8084/pedidos` → "Montar pedido".

### Passos com tempo

| # | A persona… | Esperado | Em até |
| - | ---------- | -------- | ------ |
| 1 | toca em "Montar pedido" | "Passo 1 de 4 · Cliente", sem a barra de abas | 2 s |
| 2 | "Cliente nova" › "Colar texto da conversa", cola e toca em "Ler o texto" | "Lendo o texto…"; a folha fecha; campos com "Lido do texto — confira."; aviso "Preenchi N de M campos. Confira antes de seguir." | 10 s |
| 3 | confere, completa o que faltou e segue | "Continuar" ligado, sem motivo na barra | 30 s |
| 4 | acrescenta a peça pela foto da variação | a sacola com a foto e "Itens · 1 peça · frete à parte" | 30 s |
| 5 | aplica o cupom | o resumo com o cupom e "No PIX: …" | 10 s |
| 6 | revisa e toca em "Criar link" | "Criando o link…"; o pedido montado com o toast "Link criado." | 5 s |
| 6b | volta do pedido montado (voltar do Android) | Montados, com o cartão novo no topo; nunca a montagem vazia (Q-01, D-43) | 2 s |
| 7 | toca em "Enviar pelo WhatsApp" | o `wa.me` com a mensagem pronta; "Link enviado · WhatsApp" no histórico | 3 s |

### Objetivo e efeitos

O pedido montado aberto com o link e o envio no histórico; a ficha nova criada com CPF e endereço só depois de "Criar link" (TC-INT-001).

### Caminho de abandono

J-01a: com a function sem chave, a folha diz "A leitura está fora do ar agora. Feche e preencha à mão — nada do que você já fez se perde." e a jornada segue à mão até o link (TC-FUNC-015).

### Esperado e fonte

Link criado e enviado a partir da conversa colada — fonte: PRD › O que é novo 1, 3; › Pedido montado; spec UC-05, UC-08, UC-09.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| e-mail lido já tem ficha | "Usar a ficha dela" | vira cadastrada; nenhuma segunda ficha (TC-FUNC-009) |
| preço mudou | muda o preço no painel antes de criar | recusa com o resumo relido (TC-FUNC-026) |
