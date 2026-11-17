## TC-FUNC-021: Campanha desligada ou encerrada tira o bloco da loja, e a linha e o editor dizem o estado

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-02.1, CA-02.2, CA-02.3
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-03, ramo J-03c
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a metade "a atual aparece mesmo encerrada ou desligada" do seletor só se vê com a campanha mudando de estado

### Objetivo

Quando a campanha do bloco deixa de valer — desligada pela dona ou terminada —, a cliente não vê mais o bloco, e a
dona entende pela lista e pelo editor por quê, sem perder a escolha que tinha feito.

### Pré-condições

- Conta: `admin-loja`; a loja sem login
- Massa: B-1 com "Dia das Mães" (em vigência); depois, B-3 com "QA103 Virada" (TC-JOURNEY-003)
- Estado de partida: `/admin/campanhas`

### Condições reais

as da persona

### Passos

1. Desligar "Dia das Mães"; recarregar a loja
   - **Esperado:** B-1 não aparece
2. Ler a linha de B-1
   - **Esperado:** "Dia das Mães", o estado "Desligada", que o bloco não vai aparecer na loja e por quê
3. Abrir o editor de B-1 e o seletor
   - **Esperado:** "Dia das Mães" aparece como a escolhida, com o estado "Desligada"; não é oferecida como opção
     nova. Cancelar
4. Depois do fim de "QA103 Virada" (T0 + 11 min): ler a linha de B-3 e abrir o editor de B-3
   - **Esperado:** a linha diz "Encerrada" e que o bloco não vai aparecer; no editor, "QA103 Virada" aparece como a
     escolhida, com o estado "Encerrada", e não entre as opções
5. Religar "Dia das Mães"; recarregar a loja
   - **Esperado:** B-1 volta, como estava

### Esperado e fonte

Fora da vigência (desligada, depois do fim) o bloco não aparece; a linha diz o estado e por que não vai aparecer;
a campanha atual aparece escolhida mesmo encerrada ou desligada, com o estado — fonte: PRD CA-02.1, CA-02.2,
CA-02.3

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| religar e recarregar o painel | depois do passo 5, recarregar `/admin/home` | a linha de B-1 volta a "Em vigência" |
