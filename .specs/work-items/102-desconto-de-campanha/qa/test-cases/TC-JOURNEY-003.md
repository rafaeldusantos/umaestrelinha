## TC-JOURNEY-003: A dona prepara a Black Friday do cadastro à vitrine no ar

**Tipo:** journey
**Prioridade:** P0
**Origem:** CA-01, CA-03, R-04
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passos 1–7
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** jornada P0 que cria a massa de toda a rodada; pedido de automação E2E

### Objetivo

A dona põe a campanha no ar sozinha, do painel à loja, sem tocar em preço nem pedir ajuda.

### Pré-condições

- Conta: `admin-loja`
- Massa: nenhuma campanha; M-A..M-D sem marcação; o bloco "Joias em oferta" ainda não acrescentado
- Estado de partida: `http://localhost:8083/admin`

### Condições reais

as da persona (1440 × 900)

### Entrada

navegação interna — menu Descontos › Campanhas

### Passos com tempo

| # | A persona… | Deve ver | Em até |
| - | ---------- | -------- | ------ |
| 1 | cadastra a Black Friday (TC-FUNC-001) | "Em vigência" na lista | 60 s |
| 2 | marca M-A 20 %, M-B 15 %, M-C 10 %, M-D 20 % (TC-FUNC-003) | a prévia de preço em cada uma; salvo | 30 s por peça |
| 3 | em `/admin/home`, acrescenta "Joias em oferta" pela bandeja e o liga | o bloco ligado na lista; a prévia da Home com o bloco | 30 s |
| 4 | abre a lista de campanhas | "Black Friday · 4 peças" | 5 s |
| 5 | abre `/ofertas` na loja | as quatro peças com a faixa | 10 s |

### Objetivo e efeitos

`/ofertas` com as quatro peças e a Home com o bloco. Efeito: o preço cadastrado das quatro peças inalterado.

### Caminho de abandono

Cores sem contraste no cadastro → a razão em vermelho, Salvar desligado, troca por "Preto e ouro" (J-01a). Sai da
aba de preço sem salvar → aviso de alterações não salvas (J-01b).

### Esperado e fonte

fonte: PRD UC-01, UC-03, UC-07, CA-01, CA-03.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| bloco duplicado | tenta acrescentar um segundo "Joias em oferta" | não oferecido (bloco único na Home) |
| bloco sem configuração | abre o editor do bloco | sem campos: título e percentuais vêm da campanha |
