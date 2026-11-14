## TC-JOURNEY-003: Teresa, com a fonte grande, escolhe entre entrega e retirada indo e voltando da sacola, e o checkout guarda a escolha

**Tipo:** journey
**Prioridade:** P1
**Origem:** CA-07, CA-09, CA-10 (jornada J-05)
**Autor:** dev
**Persona:** PER-04 Teresa
**Jornada:** J-05, passos 1 a 6
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** o julgamento de legibilidade a 200 % e o percurso com voltar/recarregar ficam manuais

### Objetivo

A jornada de quem lê com a fonte no máximo e decide devagar: nada cortado, nada perdido entre as idas e voltas.

### Pré-condições

- Conta: cliente-com-endereco
- Massa: retirada disponível; fixtures A e B
- Estado de partida: `/`, deslogada

### Condições reais

390 × 844 com a fonte da raiz a 200 %; toque.

### Entrada

`/` → aviso de login → produto → gaveta.

### Passos com tempo

| # | A persona…                                                 | Deve ver                                                          | Em até |
| - | ---------------------------------------------------------- | ----------------------------------------------------------------- | ------ |
| 1 | entra na conta e põe uma peça na sacola                     | a faixa e o rodapé da gaveta legíveis                             | 15 s   |
| 2 | calcula com 90010-000 e escolhe a retirada                  | "Retirada no escritório · Grátis"; o CEP e o valor inteiros        | 10 s   |
| 3 | segue ao checkout, volta pelo navegador, escolhe o PAC, segue de novo | o checkout com o PAC; o endereço salvo inteiro          | 15 s   |
| 4 | recarrega o checkout                                         | o CEP e o PAC continuam                                           | 5 s    |

### Objetivo e efeitos

O checkout com a última escolha da sacola e o endereço salvo; nada cortado em nenhum passo.

### Caminho de abandono

No passo 3 ela fecha a gaveta sem escolher nada e vai direto ao checkout pelo menu: o checkout funciona como antes
(sem "Trazido da sua sacola" se o CEP não veio da gaveta).

### Esperado e fonte

PRD 97 UC-02, UC-04, UC-05, RN-11 (fonte a 200 % sem quebrar o valor); `spec.md` D-11.

### Variações

| Variação  | Ação                             | Esperado                                 |
| --------- | -------------------------------- | ---------------------------------------- |
| Teclado   | em 1440 a 100 %, os passos 1 a 3 só com o teclado | tudo alcançável, foco visível, ordem lógica |
