# J-avancar-pedidos-em-lote: a dona avança vários pedidos de uma vez e decide os e-mails uma vez só

Feature `88` (`AVS-19`..`AVS-21`, `CRG-10`..`CRG-13`). Superfície: `apps/backoffice`, `/admin/pedidos`
(barra de lote, cartão do celular). Área `PNL`. Persona: Adri despachando pedidos.

```yaml
journey:
  id: J-avancar-pedidos-em-lote
  entry: [/admin/pedidos]
  goal: avançar status ou registrar material de vários pedidos sabendo quantos e-mails saem
  exit: resumo com mudados, recusados (motivo), falhas e e-mails que saíram; a tabela continua na tela
  side_effects: [orders × N, order_notifications sent/skipped × N]
```

## Fluxo

```mermaid
flowchart TD
    A[Lista: esqueleto, depois tabela/cartões] --> B[Seleciona pedidos]
    B --> C[Avançar status / Marcar material recebido]
    C --> D{soma de e-mails previstos > 0?}
    D -->|não| E[Grava direto]
    D -->|sim| F[Diálogo do lote: N enviariam, N já receberam, caixa 'Avisar as N clientes']
    F -->|Voltar/Esc| X1[Abandono: nada grava]
    F --> E
    E --> G[Barra: Avançando 7 de N… com barra determinada, ações desabilitadas]
    G --> H[Resumo: mudaram, recusados com motivo, falharam, e-mails que saíram]
    H --> I[Releitura com 'Atualizando…', página e tamanho mantidos]
    I --> Z[FIM VERDADEIRO: o banco bate com o resumo]
    A --> M[Celular: cartão 'Registrar recebimento' → mesma pergunta, estado só no cartão, resultado em aviso]
```

## Dimensões (taxonomia)

| Dimensão | Coberto por |
| --- | --- |
| Caminho feliz | lote de 3 avançando com aviso |
| Erro e borda | lote misto (já enviados, recusados), mais de 50 selecionados (teto) |
| Dado | o número de e-mails do resumo bate com `order_notifications` |
| Ambiente | 390 (cartões) e 1440 (tabela), fonte 200 % na barra de lote |
| Acesso | barra de progresso com valor, região viva do resumo. Concorrência: ações desabilitadas durante o lote |
