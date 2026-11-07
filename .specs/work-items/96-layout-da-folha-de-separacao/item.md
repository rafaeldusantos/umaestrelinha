---
id: 96
titulo: Layout da folha de separação, também em lote
tipo: improvement
entrada: plano
fase: done
criado: 2026-11-07
---
## Descrição
[Backoffice] Melhoria Layout Folha de seperação.

A folha de separação deve ter as seguintes melhorias no seu Layout:
- Mostrar fotos dos produtos.
- Destacar o nome do Cliente
- Ao lado do pedido, mostrar data do pedido
- Destacar a quantidade dos itens
- Remover o Material Esperado
- Mostrar o tipo de Frete escolhido acima do endereço
- Caso tenha observaçoes no pedido, deve mostrar.

As melhorias devem ser aplicadas a geração de Folha de separação em massa pela lista de Pedidos, ao selecionar vários pedidos ser possivel gerar o arquivos com várias pedidos

Decidido pelo usuário na mesma sessão (2026-11-07): "seguir sem PRD, pode seguir sem design pois é um item simples".

## Insumos
- nenhum (sem protótipo de design, por decisão do usuário)

## Gates
| gate | quando | resultado |
| ---- | ------ | --------- |
| perguntas do plano | 2026-11-07 | 7 itens · 5 ratificados (P1, P2, P5, P6, P7) · P3 mudou o plano (a falha da Observação imprime sem ela) · P4 mudou o plano (teto de 10 por lote) · 0 abertos → `plan.md` |
| fila | 2026-11-07 | aprovada ("sim, pode") · 01–02 · auditoria: a fila serve · nenhum achado |
| execução | 2026-11-07 | 01–02 (a fila toda), sob "sim, pode" |
| validation 1 | 2026-11-07 | PASS · 8/8 critérios · 21877 testes em 4 workspaces · tipos e lint sem erro novo · build verde → `qa-report.md` |
