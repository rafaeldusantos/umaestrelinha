## TC-JOURNEY-004: A dona troca a forma do bloco e a loja abre as escolhas na forma nova

**Tipo:** journey
**Prioridade:** P1
**Origem:** CA-09.1
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** J-04, passos 1–4
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** P1 determinístico; deve deixar a forma de volta em "Na linha" ao fim

### Objetivo

O que a dona escolhe no menu Compre Junto é a forma que a cliente encontra na loja inteira.

### Pré-condições

- Conta: `admin-painel`
- Massa: M-01 e M-03 (dois produtos com Compre Junto)
- Estado de partida: nenhuma forma gravada; loja aberta em outra aba

### Condições reais

As da persona.

### Entrada

`/admin/compre-junto`.

### Passos com tempo

| # | A persona… | Deve ver | Em até |
| - | ---------- | -------- | ------ |
| 1 | abre o menu Compre Junto | "Na linha", "Em folha", "Com fórmula", com "Na linha" marcada | 3 s |
| 2 | escolhe "Em folha" e grava; reabre a tela | "Em folha" marcada | 5 s |
| 3 | recarrega M-01 e M-03 na loja e marca um adicional | as escolhas abrem num diálogo (1440) com "Incluir no conjunto" | 5 s |
| 4 | escolhe "Com fórmula", grava, recarrega a loja | faixa "Esta joia + <adicional> + …" acima da lista | 10 s |

### Objetivo e efeitos

A forma gravada vale para os dois produtos.

### Caminho de abandono

Desistir e voltar a "Na linha": a loja volta a abrir as escolhas na linha.

### Esperado e fonte

Uma configuração para a loja inteira — fonte: PRD CA-09.1; spec › Decisões, 1.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| loja sem recarregar | não recarrega a aba da loja | registra o que a cliente com a página aberta vê (observação, sem esperado na fonte) |
