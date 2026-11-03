## TC-SMOKE-003: A dona abre o Compre Junto no painel e salva uma lista com uma peça

**Tipo:** smoke
**Prioridade:** P0
**Origem:** CA-01.1
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** J-03, passos 1–4
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** a entrada do lado da dona; grava no banco local e se desfaz apagando a lista

### Objetivo

Provar que a tela nova do painel abre e grava, que é de onde vem todo o resto.

### Pré-condições

- Conta: `admin-painel`
- Massa: ao menos um produto ativo no catálogo local
- Estado de partida: logada no painel (:8083)

### Condições reais

As da persona.

### Passos

1. Abrir Catálogo › Compre Junto e tocar "Nova lista"
   - **Esperado:** o editor com o campo de nome e o contador "0 / 40"
2. Dar um nome, acrescentar uma peça pela busca e salvar
   - **Esperado:** "Lista salva."; a lista aparece no índice com "1 peça"

### Esperado e fonte

Lista salva e listada — fonte: PRD CA-01.1; protótipo do painel (Listas).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| sem nome | salva sem nome | a barra diz "Dê um nome à lista para salvar." e nada grava |
