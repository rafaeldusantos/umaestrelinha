## TC-JOURNEY-003: A dona cria a lista "Correntes", a oferece num pingente e a vê na loja

**Tipo:** journey
**Prioridade:** P0
**Origem:** CA-01.1, CA-01.2, CA-02.3, CA-02.4
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** J-03, passos 1–8
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** caminho feliz do painel até a loja; cruza dois apps no mesmo banco local

### Objetivo

A dona monta uma vez a lista e vê o bloco do pingente mostrar o que ela montou, na ordem dela.

### Pré-condições

- Conta: `admin-painel`
- Massa: três correntes ativas e um pingente ativo sem Compre Junto
- Estado de partida: logada; a loja aberta em outra aba

### Condições reais

As da persona (1440 × 900).

### Entrada

`/admin/compre-junto`.

### Passos com tempo

| # | A persona… | Deve ver | Em até |
| - | ---------- | -------- | ------ |
| 1 | "Nova lista", nome "Correntes", três peças | contador "n / 40", peças numeradas | 20 s |
| 2 | reordena e salva | "Lista salva." | 10 s |
| 3 | abre o pingente, aba "Compre junto", "Acrescentar um adicional", "Uma peça de uma lista" | as listas com "N peças · em uso em…"; lista sem peças desabilitada | 10 s |
| 4 | escolhe "Correntes", acrescenta um adicional "Uma peça só" e ordena | "2 de 3 adicionais" | 20 s |
| 5 | salva | "Compre Junto salvo." | 5 s |
| 6 | recarrega o pingente na loja | bloco com os adicionais na ordem dela; a lista mostra o nome "Correntes" e as peças na ordem salva | 5 s |

### Objetivo e efeitos

O bloco da loja reflete a montagem. O índice mostra "Correntes" em uso em 1 joia.

### Caminho de abandono

Salvar a lista sem nome: "Dê um nome à lista para salvar." e nada grava (TC-FUNC-029).

### Esperado e fonte

Loja = montagem — fonte: PRD UC-01, UC-02, CA-01.2, CA-02.3, CA-02.4.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| voltar com alteração não salva | sai do editor sem salvar | o painel não perde o que estava salvo antes |
