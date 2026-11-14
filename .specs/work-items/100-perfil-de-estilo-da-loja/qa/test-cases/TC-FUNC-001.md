## TC-FUNC-001: Salvar Black Friday no painel faz a próxima página aberta da loja vir em preto e ouro

**Tipo:** functional
**Prioridade:** P0
**Origem:** UC-01, RN-01, RN-04 (próxima página)
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passos 3, 5 e 6
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** fluxo P0 determinístico (salvar → abrir a loja → cor computada); pedido de automação E2E

### Objetivo

A dona liga a campanha sozinha. Se salvar não muda a loja, ela não tem como vestir a Black Friday.

### Pré-condições

- Conta: `admin-loja`
- Massa: perfil salvo = Padrão (S0)
- Estado de partida: `/admin/configuracoes/dados-da-loja`, card "Perfil de estilo da loja" à vista

### Condições reais

As da persona; a loja conferida em 390 × 844 e 1440 × 900.

### Passos

1. Marca "Black Friday"
   - **Esperado:** a opção fica marcada; "Em uso" continua no Padrão; o botão de salvar habilita
2. Salva
   - **Esperado:** "Perfil salvo. Quem abrir a loja vê o perfil novo em até 1 hora."; "Em uso" passa ao Black Friday
3. Abre `http://localhost:8082/` numa aba nova (390 × 844)
   - **Esperado:** cabeçalho `#0D0C0B` (primary-strong), botão/link `#1C1A18` (primary), círculo da busca e botões ouro
     `#C2A063` (accent), texto corrido `#161514` (ink), faixas claras `#F0EADF` (ground-deep); fundo `#FAF8F4` e
     `surface` `#FFFFFF` iguais aos de sempre
4. Abre um produto e repete em 1440 × 900
   - **Esperado:** as mesmas cores; textos, blocos e preços iguais aos do Padrão

### Esperado e fonte

A loja aberta depois de salvar pinta com o perfil Black Friday, e só as cores mudam — fonte: PRD UC-01, tabela "O
perfil Black Friday", RN-01; spec › Design (Home e loja no perfil Black Friday), H8.

### Variações

| Variação                       | Ação                                         | Esperado                                         |
| ------------------------------ | -------------------------------------------- | ------------------------------------------------ |
| clicar no cartão, não no rádio | clica na miniatura da opção                  | a opção fica marcada                             |
| duplo clique em salvar         | dois cliques rápidos                         | uma gravação; uma mensagem; nenhum erro          |
| recarregar o painel            | F5 logo depois de salvar                     | "Em uso" continua no Black Friday                |
| opacidades                     | lê um fundo `/10` ou texto `/80` na loja     | a transparência sobre a cor do perfil novo (não some, não vira opaca) |
