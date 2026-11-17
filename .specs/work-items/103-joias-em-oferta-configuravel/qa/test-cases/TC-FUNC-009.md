## TC-FUNC-009: O bloco acrescentado pela bandeja nasce desligado e sem campanha, e o editor não salva sem campanha

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-02.4
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-03, passos 1–2
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** o bloco único da 102 virou repetível; determinístico

### Objetivo

A dona acrescenta um segundo bloco para a próxima campanha sem que ele apareça na loja antes de ter uma campanha.

### Pré-condições

- Conta: `admin-loja`
- Massa: B-1 com "Dia das Mães"
- Estado de partida: `/admin/home`; aba da loja sem login

### Condições reais

as da persona

### Passos

1. Na bandeja, acrescentar "Joias em oferta"
   - **Esperado:** a bandeja oferece "Joias em oferta" mesmo com B-1 na Home; o bloco novo (B-2) entra
     desligado; a linha dele diz que está sem campanha, que não aparece na loja, e pede a escolha
2. Ligar B-2
   - **Esperado:** a linha continua dizendo que ele não aparece na loja e pedindo a escolha
3. Recarregar a loja
   - **Esperado:** só B-1; nada de B-2, nem espaço reservado
4. Abrir B-2 e salvar sem escolher campanha
   - **Esperado:** não grava; a recusa diz que falta a campanha; o que foi digitado fica

### Esperado e fonte

O bloco da bandeja nasce desligado e sem campanha; ligar não o faz aparecer; o editor só salva com campanha —
fonte: PRD CA-02.4

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| título sem campanha | escrever o título em B-2 e salvar sem campanha | recusa; o título continua no campo |
