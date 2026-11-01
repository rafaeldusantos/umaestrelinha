# PRD Tech Review — ACME-41

## Rodada r1

```json
{
  "schema": "prd-review/v1",
  "work_item_ref": "ACME-41",
  "round": 1,
  "prd_version": 1,
  "reviewed_at": "2026-10-10T10:00:00-03:00",
  "skill": "wi-workflow/prd-tech-review",
  "skill_version": "4.0.0",
  "summary": {
    "verdict": "changes_requested_blocking",
    "blocking": 1,
    "gaps": 1,
    "questions": 0,
    "tech_decisions": 1,
    "scenarios": []
  },
  "findings": [
    {
      "id": "F1",
      "key": "listing-pagination-undefined",
      "category": "gap",
      "owner": "negocio",
      "severity": "medium",
      "title": "Listagem sem paginação definida",
      "anchor": {
        "quote": "A listagem mostra todos os pedidos.",
        "prefix": "exportar.** ",
        "suffix": "",
        "section": "Casos de uso"
      },
      "body": "Sem limite, a listagem carrega milhares de pedidos.",
      "suggestion": "A listagem mostra 50 pedidos por página."
    },
    {
      "id": "F2",
      "key": "status-free-text-vs-enum",
      "category": "blocking",
      "owner": "negocio",
      "severity": "high",
      "title": "Status em texto livre conflita com o enum do sistema",
      "anchor": {
        "quote": "O status é um texto livre.",
        "prefix": "pedido.** ",
        "suffix": "",
        "section": "Casos de uso"
      },
      "body": "`src/pedidos/listagem.ts:1` tem `status` como string, mas o ERP só aceita os cinco valores do contrato.",
      "suggestion": "O status é um de: novo, pago, enviado, entregue, cancelado."
    },
    {
      "id": "F3",
      "key": "export-format-naming",
      "category": "naming",
      "owner": "negocio",
      "severity": "low",
      "title": "\"dump\" não é o nome do arquivo no domínio",
      "anchor": {
        "quote": "O arquivo se chama dump",
        "prefix": "exportação.** ",
        "suffix": " e vai ao ERP",
        "section": "Casos de uso"
      },
      "body": "O domínio chama de \"remessa\" o arquivo enviado ao ERP.",
      "suggestion": "O arquivo se chama remessa"
    },
    {
      "id": "F4",
      "key": "cache-strategy",
      "category": "question",
      "owner": "tech",
      "severity": "medium",
      "title": "Onde guardar o arquivo gerado até o envio",
      "anchor": {
        "quote": "vai ao ERP uma vez por dia",
        "prefix": "dump e ",
        "suffix": ".",
        "section": "Casos de uso"
      },
      "body": "Não há storage configurado; há Redis em uso.",
      "suggestion": "Guardar no storage de arquivos do projeto"
    }
  ]
}
```

### Respostas da página

- `listing-pagination-undefined` · escolha: "A listagem mostra 50 pedidos por página." · owner final: negocio · aplicado
- `status-free-text-vs-enum` · escolha: "O status é um de: novo, pago, enviado, entregue, cancelado." · owner final: negocio · aplicado
- `export-format-naming` · escolha: — · texto: "decido depois" · owner final: negocio · aberto
- `cache-strategy` · escolha: "Guardar no storage de arquivos do projeto" · owner final: tech · aplicado

### Aplicado

- `listing-pagination-undefined` · antes: "A listagem mostra todos os pedidos." · depois: "A listagem mostra 50 pedidos por página."
- `status-free-text-vs-enum` · antes: "O status é um texto livre." · depois: "O status é um de: novo, pago, enviado, entregue, cancelado."
- `cache-strategy` · Decisões: guardar o arquivo no storage de arquivos do projeto até o envio

### Leitura

Bloqueio de status resolvido; a nomenclatura do arquivo ficou para depois. Uma decisão técnica vai à costura.

