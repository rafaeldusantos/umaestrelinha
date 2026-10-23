# 80 — O fornecedor da peça

**Escopo:** Large · **Apps:** backoffice (+ guarda na suíte da loja) · **Migration:** sim
**Decisões do usuário** (conversa de 2026-10-22):

1. O link é **da peça** (a página daquela peça na loja do fornecedor), um por produto. O nome do
   fornecedor é reutilizável entre produtos.
2. Os campos ficam na aba **Preços & variações**, num card logo abaixo de *Preço padrão*. O campo
   **Custo**, que já existe, passa a ser explicitamente o valor da peça no fornecedor. A **coluna
   lateral** mostra o fornecedor **depois de salvo**, com o link clicável.
3. A listagem de produtos ganha **coluna e filtro** por fornecedor.

## Por que tabela própria (e não coluna de `products`)

`products` tem a policy `public read products … using (is_active = true)`, sem recorte de coluna:
qualquer visitante lê **toda coluna** de todo produto ativo pela chave pública. O fornecedor é
informação só do painel, então mora em duas tabelas com RLS de admin e sem leitura pública.

> Achado fora de escopo: pelo mesmo motivo, `products.cost_price` já é legível por qualquer
> visitante hoje. Fica registrado no handoff; não é corrigido aqui.

## Requisitos

### Dados

- **FOR-01** `suppliers (id, name, created_at)`: o nome é obrigatório, aparado, de 1 a 120
  caracteres, e **único sem diferença de maiúsculas** (`lower(btrim(name))`).
- **FOR-02** `product_suppliers (product_id PK → products on delete cascade, supplier_id →
  suppliers on delete restrict, url, updated_at)`: no máximo um fornecedor por produto. `url` é
  opcional e, quando existe, começa por `http://` ou `https://` e tem até 2000 caracteres.
- **FOR-03** As duas tabelas têm RLS ligada, policy única `for all to authenticated` com
  `has_role(…, 'admin')` no `using` **e** no `with check`, e `revoke all … from anon`. **A loja não
  lê nenhuma das duas**, e nenhum arquivo de `apps/store` as nomeia.
- **FOR-04** A migration não escreve dado.

### O card na aba Preços & variações

- **FOR-05** Logo abaixo de *Preço padrão*, um card **Fornecedor** com o selo "Só no painel", o
  campo **Nome do fornecedor** e o campo **Link da peça**.
- **FOR-06** O texto de ajuda do **Custo** diz que ele é o valor da peça no fornecedor.
- **FOR-07** Digitar no nome sugere os fornecedores já cadastrados cujo nome contém o termo,
  **sem diferença de acento nem de maiúsculas**, até 8 sugestões. Escolher uma preenche o campo.
  Teclado: ↓/↑ movem, Enter escolhe, Esc fecha.
- **FOR-08** Quando o nome digitado não corresponde a nenhum fornecedor (pela mesma comparação),
  a lista oferece **"Criar ‘<nome>’"**. Não há tela de cadastro separada: o fornecedor nasce no
  save do produto.
- **FOR-09** Salvar com link e **sem** nome é recusado antes de qualquer gravação, com o aviso
  "Informe o nome do fornecedor da peça", nos dois botões (rascunho e publicar).
- **FOR-10** Salvar com link que não começa por `http://`/`https://` é recusado antes de qualquer
  gravação, com o aviso "O link da peça precisa começar com http:// ou https://".

### Gravação

- **FOR-11** O save grava o fornecedor depois do produto existir: reaproveita o fornecedor de
  mesmo nome (sem diferença de maiúsculas/acento) ou cria um novo, e grava o vínculo com o link.
- **FOR-12** Esvaziar o nome apaga o vínculo do produto (o fornecedor continua cadastrado).
- **FOR-13** Sem mudança no nome nem no link desde a carga, o save não escreve em nenhuma das
  duas tabelas.
- **FOR-14** Se a gravação do fornecedor falhar, o aviso é "O produto foi salvo, mas o fornecedor
  não" (molde dos outros passos) e a página não diz que salvou.
- **FOR-15** Duplicar um produto (`?from=`) traz o nome e o link do original.

### A coluna lateral

- **FOR-16** Com um fornecedor **salvo**, a coluna lateral mostra o card **Fornecedor** com o nome
  e, havendo link, o link com o domínio da peça, que abre em **nova aba**
  (`target="_blank" rel="noopener noreferrer"`). Sem fornecedor salvo, o card não aparece. O card
  mostra o que está **no banco**: edição não salva não muda o card.

### A listagem

- **FOR-17** Coluna **Fornecedor** (configurável como as outras): o nome e, havendo link, um ícone
  que abre a peça em nova aba. Sem fornecedor, "—".
- **FOR-18** Filtro por fornecedor ao lado do de categorias, com o chip "Fornecedor: <nome>"
  removível. O filtro é aplicado **no servidor** e a contagem do rodapé é a do filtro.
- **FOR-19** Visões salvas antes desta feature (sem o filtro de fornecedor) continuam abrindo.

## Fora de escopo

Tela de gestão de fornecedores (renomear, fundir, apagar); filtro "sem fornecedor"; fornecedor na
exportação CSV e na edição em massa; mais de um fornecedor por produto; corrigir a exposição de
`cost_price`.
