## TC-FUNC-002: Voltar ao Padrão pela mesma escolha devolve a loja de sempre sem perder conteúdo

**Tipo:** functional
**Prioridade:** P0
**Origem:** UC-02, CA-03
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-02, passos 1 a 4
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** P0 determinístico; o conteúdo se confere por texto e a paleta por cor computada

### Objetivo

Encerrar a campanha não pode custar nada do que a dona montou. Se voltar ao Padrão apagar ou regravar conteúdo, ela
perde trabalho e confiança.

### Pré-condições

- Conta: `admin-loja`
- Massa: perfil salvo = Black Friday (deixado pelo TC-FUNC-001 na mesma sessão)
- Estado de partida: anotados, antes do TC-FUNC-001, os blocos e um texto da Home, o menu, um preço, a faixa de avisos
  (se houver) e o conteúdo de Dados da loja

### Condições reais

As da persona.

### Passos

1. Marca "Padrão" e salva
   - **Esperado:** "Perfil salvo…"; "Em uso" no Padrão; o botão de salvar desabilita
2. Abre a loja numa aba nova
   - **Esperado:** cabeçalho `#283A4A`, primary `#34495E`, accent `#B8945F`, ink `#23303A` — as cores anotadas no começo
3. Confere a Home, o menu e o preço anotados
   - **Esperado:** iguais ao anotado
4. No painel, abre Dados da loja, a faixa de avisos e Frete e Material
   - **Esperado:** nada mudou além do perfil

### Esperado e fonte

A paleta de hoje volta e nenhum conteúdo se perde; Salvar grava só `appearance` — fonte: PRD UC-02, CA-03; spec ›
Decisões (UC-02 na T07: "Salvar grava só `{ profile }` na chave `appearance`").

### Variações

| Variação                         | Ação                                              | Esperado                                         |
| -------------------------------- | ------------------------------------------------- | ------------------------------------------------ |
| marca Padrão e não salva         | sai da seção e volta                              | o salvo continua Black Friday; marcado = salvo   |
| volta e liga de novo             | Padrão → salva → Black Friday → salva             | cada salvar troca a loja; nada se acumula        |
