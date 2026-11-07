## TC-JOURNEY-003: A dona dá 10% às correntes de um pingente e a loja mostra o mesmo valor da prévia

**Tipo:** journey
**Prioridade:** P0
**Origem:** CA-01.1, CA-01.5, CA-02.1
**Autor:** dev
**Persona:** PER-02 Adri (painel)
**Jornada:** J-02, passos 1–5
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** cruza painel e loja; determinística com M-01

### Objetivo

Provar que a prévia do painel e a página da loja dizem o mesmo preço levando junto.

### Pré-condições

- Conta: `admin-painel` (a loja em outra aba, anônima — só leitura da página pública)
- Massa: M-01 sem percentuais
- Estado de partida: aba "Compre junto" de P

### Condições reais

As da persona (1440).

### Entrada

`/admin/produtos/<id de P>/editar` → aba "Compre junto".

### Passos com tempo

| # | A persona… | Deve ver | Em até |
| - | --- | --- | --- |
| 1 | digita 10 na lista "Correntes" e 15 na corrente avulsa | as prévias (a da lista com a faixa) | 10 s |
| 2 | salva | gravado, sem erro | 5 s |
| 3 | abre a página de P na loja, escolhe uma corrente da lista e a avulsa | "de/por" em cada uma, com o preço levando junto igual à prévia | 15 s |

### Objetivo e efeitos

- O preço levando junto da loja = o da prévia, para a mesma variação.

### Caminho de abandono

J-02a: um valor inválido é recusado antes de gravar (TC-FUNC-002).

### Esperado e fonte

Fonte: `prd.md` CA-01.1, CA-01.5, CA-02.1.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| trocar a variação da corrente na loja | escolher outra | o "de/por" acompanha a variação e cai dentro da faixa da prévia |
