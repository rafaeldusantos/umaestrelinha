## TC-INT-001: Criar link com uma cliente nova cria a ficha com CPF e endereço uma vez só, e nada antes disso

**Tipo:** integration
**Prioridade:** P0
**Origem:** UC-04, UC-05 (D-04, D-16, D-20, D-32)
**Autor:** dev
**Persona:** PER-01 Adri no WhatsApp
**Jornada:** J-01, passo 8 (efeito colateral)
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `integration` — status `missing`
**Spec:** —
**Nota:** o efeito se confere no painel (a ficha), não no app; há probe do Dev (`probes/01-link-e-endereco.sql`), mas o status de automação é da automação E2E

### Objetivo

O CPF e o endereço que a Adri conferiu ficam no cadastro da cliente — e só quando o link é criado.

### Pré-condições

- Conta: `admin-atelie` (app 390 e painel 1440)
- Massa: um e-mail novo
- Estado de partida: passo 1, "Cliente nova"

### Condições reais

As da persona; o painel numa segunda aba.

### Passos

1. Preenche nome, e-mail, CPF e endereço com "Salvar no cadastro da cliente" ligado; segue até a revisão
   - **Esperado:** "Ficha nova · criada com o link"
2. No painel, busca o e-mail em Clientes
   - **Esperado:** ninguém
3. No app, toca em "Criar link"
   - **Esperado:** o pedido montado; no histórico "Ficha da cliente criada" e "Endereço salvo no cadastro dela"
4. No painel, abre a ficha
   - **Esperado:** uma ficha, com o CPF e o endereço (padrão), uma vez só

### Esperado e fonte

"Nada é gravado pela leitura: a ficha e o endereço só nascem ao Criar link." / "O CPF e o endereço são guardados no cadastro da cliente" — fonte: PRD › Passo 1 e › Ler os dados; spec D-16, D-20, D-32.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| "Salvar no cadastro" desligado | cria | a ficha sem o endereço |
| falha na gravação | para a function e cria | nem ficha nem endereço |
| sem CPF | cria | a ficha sem CPF |
