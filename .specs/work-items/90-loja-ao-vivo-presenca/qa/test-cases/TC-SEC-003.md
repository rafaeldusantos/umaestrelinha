## TC-SEC-003: O link de "não contar" tira o navegador da presença, e o de "contar" o devolve

**Tipo:** security
**Prioridade:** P1
**Origem:** §10.3
**Autor:** dev
**Persona:** PER-04 Helena
**Jornada:** J-04, ramo J-04b
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** é o caminho da própria Adri para não se contar; determinístico

### Objetivo

Quem abriu o link de "não contar" (a Adri conferindo a própria loja, ou quem recebeu o link) não aparece na
Loja ao vivo.

### Pré-condições

- Conta: `anonima` com estatística aceita; a Adri com `/ao-vivo` aberta noutro contexto
- Massa: ambiente do CH-01
- Estado de partida: Helena presente, contada como 1

### Condições reais

as da persona

### Passos

1. Abre `http://localhost:8082/?nao-contar=1`
   - **Esperado:** o aviso de que este navegador não é contado; o parâmetro some da barra de endereço
2. Navega por joias por 6 min
   - **Esperado:** sai do total em até 5 min e não volta
3. Abre `http://localhost:8082/?nao-contar=0` e navega
   - **Esperado:** volta a aparecer em até 75 s

### Esperado e fonte

O opt-out do contador vale para a presença — fonte: PRD §3 Opção A ("opt-out"), §6.2 Loja ("para no opt-out"), §10.3

### Variações

| Variação                     | Ação                                    | Esperado          |
| ---------------------------- | --------------------------------------- | ----------------- |
| com `utm_source` junto        | `?nao-contar=1&utm_source=instagram`    | não conta; os outros parâmetros ficam na URL |
