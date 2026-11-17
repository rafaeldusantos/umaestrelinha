## TC-SEC-002: Na prévia do painel com a sessão de admin aberta na loja, nenhuma campanha fora de vigência aparece

**Tipo:** security
**Prioridade:** P0
**Origem:** CA-06.1, CA-05.2
**Autor:** dev
**Persona:** PER-03 Adri, conferindo a loja
**Jornada:** J-05, passo 4
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a prévia é a loja num quadro do painel; a sessão de admin chega a ela pela loja

### Objetivo

O que a dona confere na prévia antes de salvar é o que a cliente vai ver — não o desconto de uma campanha que ainda
não começou ou que já acabou.

### Pré-condições

- Conta: `admin-loja` logada na loja (TC-SEC-001) **e** no painel, no mesmo browser
- Massa: a do TC-SEC-001; B-2 ("Natal") se o CH-04 já o tiver criado — não é exigido
- Estado de partida: `/admin/home` no painel, prévia em Celular

### Condições reais

as da persona; a prévia em Celular e depois em Computador

### Passos

1. Olhar o bloco B-1 na prévia
   - **Esperado:** os percentuais de "Dia das Mães"
2. Rolar a prévia pelas fileiras de coleção até as peças de "Natal" (inclusive P-AGE)
   - **Esperado:** sem selo nem preço de campanha nelas
3. Se B-2 existir: clicar nele na lista
   - **Esperado:** a prévia não mostra B-2; o editor avisa que a prévia só mostra o bloco a partir do início
4. Alternar para Computador
   - **Esperado:** o mesmo

### Esperado e fonte

Na prévia, com sessão de admin, só a campanha em vigência; com campanha agendada escolhida, o aviso — fonte: PRD
CA-06.1, CA-05.2

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| recarregar a prévia | o botão de recarregar do palco | o mesmo |
| tela cheia | o modo tela cheia do palco | o mesmo |
