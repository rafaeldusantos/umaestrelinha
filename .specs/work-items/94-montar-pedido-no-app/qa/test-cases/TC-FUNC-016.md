## TC-FUNC-016: A busca de peças mostra a capa, o preço a partir de, o estoque e se pede material

**Tipo:** functional
**Prioridade:** P0
**Origem:** UC-06 (D-27, D-37)
**Autor:** dev
**Persona:** PER-01 Adri no WhatsApp
**Jornada:** J-01, passo 5
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** —

### Objetivo

A Adri acha a joia pelo nome e confere pela foto antes de abrir.

### Pré-condições

- Conta: `admin-atelie`
- Massa: peça com várias variações e capa; peça com uma variação só; peça que pede material; peça sem foto
- Estado de partida: passo 2

### Condições reais

As da persona.

### Passos

1. Toca em "Acrescentar peça" e digita parte do nome, sem acento
   - **Esperado:** as peças com a capa em retrato, nome e "a partir de R$ X · N em estoque · pede material" ("a partir de" só com mais de uma variação; estoque somado)
2. Busca um nome que não existe
   - **Esperado:** "Nenhuma joia com “q”."
3. Olha a peça sem foto
   - **Esperado:** o quadro areia com a estrela da marca (TC-UI-002)

### Esperado e fonte

Fonte: PRD › Passo 2 · Peças; spec Design › Passo 2; D-37 (só por nome, sem SKU).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| busca por SKU | digita um SKU | não acha (D-37) |
| rede lenta | abre o passo | o catálogo carrega uma vez; a busca seguinte não espera a rede |
