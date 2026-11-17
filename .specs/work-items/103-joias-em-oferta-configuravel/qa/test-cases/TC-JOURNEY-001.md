## TC-JOURNEY-001: A dona põe no ar o bloco da campanha em vigência com o título, a descrição e as peças que escolheu

**Tipo:** journey
**Prioridade:** P0
**Origem:** CA-01.1, CA-02.2, CA-03.2, CA-05.1
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passos 1–9
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** o caminho principal do WI, determinístico com a massa do manifesto; pedido de automação E2E

### Objetivo

A dona consegue, sozinha, transformar o bloco "Joias em oferta" que a atualização deixou sem campanha num bloco no
ar, com as palavras e as peças dela. É o valor inteiro do WI.

### Pré-condições

- Conta: `admin-loja` no painel
- Massa: B-1 ligado e sem campanha; C-VIG ("Dia das Mães") em vigência com P-1, P-2, P-3 marcadas e baratadas
- Estado de partida: `/admin/home` aberto; uma aba da loja (`:8082`) sem login

### Condições reais

| Dimensão    | Valor                                            |
| ----------- | ------------------------------------------------ |
| Dispositivo | desktop (1440) no painel; celular (390) na aba da loja |
| Rede        | rápida                                           |
| Locale      | pt-BR                                            |
| Modalidade  | mouse-teclado                                    |

### Entrada

`http://localhost:8083/admin/home`, por navegação interna, depois do login.

### Passos com tempo

| # | A persona… | Esperado | Em até |
| - | ---------- | -------- | ------ |
| 1 | abre o bloco "Joias em oferta" | o editor com Conteúdo, Campanha e Peças escolhidas | 3 s |
| 2 | escolhe "Dia das Mães" | a prévia mostra o bloco da campanha | 5 s |
| 3 | escreve o título "Joias para guardar quem a gente ama" e uma descrição de uma frase | a prévia mostra o texto antes de salvar | 3 s |
| 4 | escolhe P-1, P-2, P-3 e arruma P-3, P-1, P-2 | a prévia mostra as três nessa ordem | 20 s |
| 5 | salva | "Salvo"; a linha diz "Dia das Mães" e o estado em vigência | 5 s |
| 6 | recarrega a Home da loja | o bloco com o selo, o título, a descrição, os cartões e P-3, P-1, P-2 | 5 s |

### Objetivo e efeitos

Na loja, sem login, o bloco aparece com o texto e a ordem da dona e os percentuais de "Dia das Mães". A linha do
bloco no painel diz a campanha e o estado.

### Caminho de abandono

Cancelar antes do passo 5: nada é gravado e a loja continua sem o bloco.

### Esperado e fonte

O bloco da campanha escolhida aparece na loja durante a vigência dela, com o título, a descrição e as peças na
ordem do editor — fonte: PRD UC-01, CA-01.1, CA-02.2, CA-03.2, CA-05.1

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| loja em 1440 | conferir o passo 6 no computador | as mesmas peças, na mesma ordem, em fita com setas |
| cancelar | Cancelar no lugar do passo 5 | nada gravado; a loja sem o bloco |
