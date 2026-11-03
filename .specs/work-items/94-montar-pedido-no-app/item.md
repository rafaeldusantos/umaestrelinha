---
id: 94
titulo: Montar pedido no app do ateliê, com a leitura dos dados da cliente por IA
tipo: feature
entrada: prd
fase: prd-review
criado: 2026-11-02
---
## Descrição
Planejar a implementação da Montagem de pedido que fizemos na feature 89 no Mobile adm. incluir funcionalidade de criar um pedido manual pelo APP e incluir uma funcionalidade com opção de gerar o registro do cliente e do endereço informando um Bloco de texto, onde um agente de IA com modelo Haiku faz a leitira desse texto e preenche os campos com dados do Cliente e Endereço de entrega, resto do cadastro se mantem. Vamos criar o prototipo no Claude Desing no projeto em uma nova página no projeto "Uma Estrelinha - Mobile Admin" com base no já existe hoje, manter mesmo design. Não implementar nada, apenas planejamento de Prototipo com comportamentos

Decidido pelo usuário na mesma sessão (2026-11-02), já refletido no PRD:
- "isso aqui não precisa 3. O texto da conversa vai para a Anthropic. A Política de Privacidade precisa de um parágrafo sobre isso, aprovado pela Adri antes de publicar."
- "4 - Sim, implementamos no Backoffice depois." (o "Colar texto" no Backoffice fica para um Work Item seguinte)
- "Na revisão de pedido, assim com na seleção dos produtos.. devem mostrar as imagens dos produtos para a Adro conferir visualmente esses protusoduto"

## Insumos
- PRD: Claude Design, projeto "Uma Estrelinha - Mobile Admin" (`a780eec8-8aba-4d6e-8b4c-2c485e2750c7`), arquivo `prompts/PRD - Montar pedido no app.md` (copiado em `prd.md`)
- Protótipo: https://claude.ai/design/p/a780eec8-8aba-4d6e-8b4c-2c485e2750c7?file=Montar+Pedido.dc.html (`Montar Pedido.dc.html` + `montado-dados.js`), no desenho do `Ateliê Admin.dc.html` do mesmo projeto
- A montagem no painel, já implementada: `.specs/features/89-pedido-montado-pelo-painel/spec.md` (`AD-070`, `AD-071`) e o desenho `Pedido - Montar.html` do projeto "Uma Estrelinha - Backoffice" (`e3957c10-bd49-4f3d-9256-04d72a7d0f41`)
- A sugestão por IA já implementada, molde da function nova: `.specs/features/84-seo-do-produto-com-ia/` (`AD-067`, `_shared/claude*.ts`, `seo-suggest`)

## Gates
| gate | quando | resultado |
| ---- | ------ | --------- |
