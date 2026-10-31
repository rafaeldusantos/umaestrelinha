# J-montar-pedido-para-a-cliente: a Adri monta no painel a venda que combinou no WhatsApp e manda o link

Feature `89` (`MON-01`..`MON-12`, `PRC-01`, `PRC-02`, `LNK-01`..`LNK-03`, `SEG-05`). Superfície:
`apps/backoffice`, `/admin/pedidos` → "Montar pedido" → `/admin/pedidos/montar` → `/admin/pedidos/montados/:id`.
Área `PNL`. Persona: Adri montando uma venda. Sobrepõe `J-concluir-pedido-montado` (o link) e
`J-acompanhar-pedidos-montados` (a aba Montados).

```yaml
journey:
  id: J-montar-pedido-para-a-cliente
  entry: [/admin/pedidos, /admin/pedidos/montar]
  goal: montar cliente, endereço, peças, cupom e desconto combinado e gerar o link
  exit: a proposta P-NNNN existe Aberta, o total do resumo é o gravado em order_proposals, e o link copiado/WhatsApp abre a loja
  side_effects: [order_proposals + itens, customers (cliente nova, user_id nulo), endereço salvo opcional, order_proposal_events created/link_sent]
```

## Fluxo

```mermaid
flowchart TD
    A[/admin/pedidos → Montar pedido/] --> B{Cliente}
    B -->|cadastrada| B1[Busca nome/e-mail/telefone → preenche contato e endereços salvos]
    B -->|nova| B2[Nome, e-mail, telefone, CPF opcional]
    B2 -->|e-mail já existe| B3[Oferece a ficha existente no lugar de criar outra]
    B1 --> C[Endereço: CEP completa; salvar no cadastro opcional]
    B2 --> C
    B3 --> C
    C --> D[Peças: busca do dono único → variação ativa, quantidade, gravação]
    D --> E[Cupom pela regra da loja · desconto combinado R$/% + motivo]
    E -->|zeraria o pedido| E1[Recusa: O desconto não pode zerar o pedido.]
    E --> F[Resumo por resolveOrderPricing + prévia do frete]
    F -->|cotação falha| F1[Diz que falhou, não bloqueia]
    F --> G{Criar link habilitado?}
    G -->|falta cliente/e-mail/peça| G1[Desabilitado com o motivo escrito]
    G -->|sim| H[Criar link: function order-proposals]
    H -->|preço mudou no servidor| H1[Recusa Os preços mudaram… e relê]
    H -->|duplo clique| H2[Uma proposta só, pela chave de idempotência]
    H --> I[Página da proposta: link, Copiar, WhatsApp/Sem telefone]
    I --> J[Copiar ou WhatsApp → evento Link enviado]
    J --> Z[FIM VERDADEIRO: proposta Aberta no banco com o mesmo total, link abre a loja]
    D -.->|sai da tela sem criar| X1[Abandono: nada gravado]
```

## Dimensões (taxonomia)

| Dimensão | Coberto por |
| --- | --- |
| Caminho feliz | Cliente nova, duas peças (uma com variação e gravação), cupom 10 % e R$ 20 combinados |
| Erro e borda | e-mail repetido, desconto que zera, cotação falhando, Criar link sem cliente/peça, duplo clique |
| Dado | total do resumo × `order_proposals.items_total`; ficha nova sem `user_id`; nenhum `orders` nasce aqui |
| Ambiente | 1440 (principal); 390 a 100/130/200 % na montagem e na página da proposta |
| Acesso | teclado do começo ao fim, foco nos diálogos, rótulos; autorização: function exige admin (provada por teste, não remedida) |
