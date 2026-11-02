---
id: 90
titulo: Loja ao vivo, Fases 2 e 3 — presença, funil, joias vistas, origem e aparelho
tipo: feature
entrada: prd
fase: done
criado: 2026-11-01
---
## Descrição
Quando implementamos no mobile-admin as opções de controle de acessos, ou loja ao vivo como mostra no Prototipo Uma Estrelinha - Mobile Admin" https://claude.ai/design/p/a780eec8-8aba-4d6e-8b4c-2c485e2750c7?file=Ateli%C3%AA+Admin.dc.html - Nota-se que várias funcionalidades que existem no Prototipo não estão presentes no APP do celular. Verificar os comportamentos faltantes, e vamos criar um nova feature para aplicar. Verificar o que falta e como devemos provisionar para aplicar esseas funcionalidade.

Escopo decidido pelo usuário em 2026-11-01 (respostas às perguntas da sessão):
- Fases 2 e 3 do PRD (presença, cartão "Agora na loja", "O que estão fazendo", "Joias sendo vistas agora", "De onde vieram", "No celular"). Cidades (Fase 4) fora.
- Entram também: "Com sacola" no Acessos; o "Guia de envio do material" na lista de joias vistas; "vs semana anterior" (`BL-056`).
- Vocabulário da presença: "pessoas" (fecha `BL-058`).
- Processo: wi-workflow, mantendo o número 90.

## Insumos
- PRD: Claude Design, projeto `a780eec8-8aba-4d6e-8b4c-2c485e2750c7`, arquivo `prompts/PRD - Loja ao vivo.md` (copiado em `prd.md`)
- Protótipo: https://claude.ai/design/p/a780eec8-8aba-4d6e-8b4c-2c485e2750c7?file=Ateli%C3%AA+Admin.dc.html (`Ateliê Admin.dc.html`, etag `1793064028832969`)
- Descrição do protótipo e cópia local: `.specs/features/83-loja-ao-vivo/prototipo.md` e `.specs/features/83-loja-ao-vivo/prototipo/`
- A Fase 1, já implementada: `.specs/features/83-loja-ao-vivo/spec.md` (`AD-066`)
- `.specs/BACKLOG.md` › `BL-056`, `BL-058`

## Gates
| gate | quando | resultado |
| ---- | ------ | --------- |
| prd-review r1 | 2026-11-01 | changes_requested_gaps · 16 aplicados ao `prd.md` (1 negócio sem edição) · 11 em Decisões · 0 abertos · 23 resolvidos pelo agente a pedido, 2 pela página |
| handoff | 2026-11-01 | sem página · 20 decisões → `spec.md` Decisões, resolvidas pela conferência a pedido do humano · 0 travados |
| fila | 2026-11-01 | aprovada · 01–04 · auditoria `a fila serve com correção` (4 corrigidos: Política r1a, régua de "últimos", D-10 na 03, §6.2 na 02) |
| execução | 2026-11-01 | autorizada: 01–04, e o QA no fim ("pode implementar todas as tarefas e ao finalizar orquestrar os testes com as Skills de QA"); 02 e 04 em paralelo a pedido do humano |
| validation 1 | 2026-11-02 | PASS · 30/30 critérios em escopo · 1 erro de lint novo corrigido na Validation |
| qa gate 1 | 2026-11-02 | plano aprovado sob a autorização prévia · 9 charters · 51 TC · 0 🔴 |
