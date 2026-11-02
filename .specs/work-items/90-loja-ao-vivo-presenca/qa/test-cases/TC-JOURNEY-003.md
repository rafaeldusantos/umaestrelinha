## TC-JOURNEY-003: Com a rede caindo, a Adri vê que não conseguiu carregar e recupera os números sem sair da tela

**Tipo:** journey
**Prioridade:** P1
**Origem:** LAV-03, LAV-05
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-06, passos 1–3
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** queda de rede por emulação offline do contexto do app; determinístico

### Objetivo

Na rua, com sinal fraco, a Adri precisa saber que o número está velho e conseguir reler com um toque.

### Pré-condições

- Conta: `admin-atelie`
- Massa: ambiente do CH-01; 1 cliente presente
- Estado de partida: `/ao-vivo` com os números carregados

### Condições reais

rede instável

### Entrada

http://localhost:8084/ao-vivo

### Passos com tempo

| # | A persona… | Deve ver | Em até |
| - | ---------- | -------- | ------ |
| 1 | olha a tela com a rede boa | "Atualizado agora", depois "Atualizado há {s} s" | 20 s |
| 2 | perde a rede | o frescor envelhece; na leitura seguinte, "Não consegui carregar." e "Tentar de novo" | 30 s |
| 3 | recupera a rede e toca em "Tentar de novo" | os números de volta e "Atualizado agora" | 5 s |
| 4 | volta ao Início | o cartão com o mesmo número | 3 s |

### Objetivo e efeitos

Os números voltam sem recarregar o app. Efeitos: —

### Caminho de abandono

Ela fecha o app no passo 2 e reabre com a rede de volta: a tela carrega normal.

### Esperado e fonte

Falha com a frase do app e "Tentar de novo" que relê — fonte: PRD LAV-03 (falha), §5.2 (frescor)

### Variações

| Variação             | Ação                               | Esperado                          |
| -------------------- | ---------------------------------- | --------------------------------- |
| a rede volta sozinha  | não toca em nada                   | a leitura seguinte (até 15 s) traz os números |
| no cartão do Início   | rede cai com o Início aberto       | o cartão mostra a falha e "Tentar de novo" |
