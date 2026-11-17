## TC-REG-001: Itens sem cor, ícones da marca já gravados, submenu e "ver tudo" continuam como antes

**Tipo:** regression
**Prioridade:** P1
**Origem:** C-05, C-06
**Autor:** dev
**Persona:** PER-03 Cliente no computador
**Jornada:** J-03, passo 2
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** cor computada contra os tokens de hoje e ícone por chave; pedido de automação E2E

### Objetivo

Nada que a dona não tocou muda diante da cliente — o Work Item acrescenta, não redesenha.

### Pré-condições

- Conta: `anonima`
- Massa: item B (sem cor de barra), item C (sem cor nas duas), item D (ícone da marca gravado antes da rodada)
- Estado de partida: `/` na loja, 1440 × 900

### Condições reais

as da persona; a folha a 390 × 844 no passo 3.

### O que mudou

O rótulo do item principal passou a poder ter cor por superfície e o seletor ganhou ícones do sistema. O que não podia mudar: o rótulo sem cor (`on-primary` na barra; `ink`/`primary` na folha), os ícones da marca já gravados, o submenu e o "ver tudo".

### Pontos de contato com outras jornadas

J-02 e J-03 passam pelos mesmos itens; a prévia do painel (TC-FUNC-004) desenha a mesma loja.

### Passos

1. Confere na barra os rótulos de B, C e D
   - **Esperado:** `rgb(247, 243, 236)` (`#F7F3EC`, `on-primary` no Padrão); hover como antes
2. Confere o ícone de D na barra
   - **Esperado:** o mesmo ícone da marca de antes do Work Item
3. A 390, abre a folha e confere C e D, e os filhos e o "ver tudo" de B
   - **Esperado:** cor de hoje (`ink`/`primary`), ícone de D igual
4. Abre o painel do mega menu de B
   - **Esperado:** filhos e "ver tudo em X" na cor de hoje, sem ícone

### Esperado e fonte

Cor não escolhida naquela superfície = como hoje; os ícones já gravados não mudam — fonte: `plan.md` C-05, C-06, Design › Loja ("Sem cor, as classes de hoje"), Fora do escopo.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| faixa que rola | se a barra rolar | seta e degradê como antes |
