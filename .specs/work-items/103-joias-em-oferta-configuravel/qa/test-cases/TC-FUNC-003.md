## TC-FUNC-003: Com título e descrição vazios, o bloco usa o nome da campanha, a frase dos percentuais e as primeiras peças dela

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-01.3, CA-01.4, CA-03.5, CA-04.6
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passo 4
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** o recuo é o comportamento de hoje preservado; determinístico

### Objetivo

A dona que só escolhe a campanha, sem escrever nada nem escolher peças, tem o bloco de sempre — não um bloco vazio.

### Pré-condições

- Conta: `admin-loja`
- Massa: C-VIG com 4 ou mais peças marcadas que a campanha barateia
- Estado de partida: editor de B-1, sem campanha, título e descrição vazios, nenhuma peça

### Condições reais

as da persona; a prévia em Celular

### Passos

1. Escolher "Dia das Mães", sem escrever nada
   - **Esperado:** na prévia, o bloco com o texto do selo de "Dia das Mães" **acima** do título; o título é o nome
     da campanha; o texto é a frase dos percentuais; os cartões de percentual; e as primeiras peças da campanha
     (até quatro)
2. Salvar e conferir a loja (aba sem login)
   - **Esperado:** o mesmo bloco da prévia

### Esperado e fonte

Título vazio ⇒ nome da campanha; descrição vazia ⇒ frase dos percentuais; selo acima; sem peça escolhida ⇒ as
primeiras da campanha; os cartões ficam — fonte: PRD CA-01.3, CA-01.4, CA-03.5, CA-04.6

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| só o título preenchido | escrever o título, deixar a descrição vazia | o título escrito e a frase dos percentuais |
| título só com espaços | digitar "   " no título | anotar o que a prévia mostra (a fonte não decide "espaço" × "vazio" — sem achado se mostrar o nome) |
