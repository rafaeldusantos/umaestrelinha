## TC-JOURNEY-001: A Adri vê no Início a cliente que acabou de entrar na loja e a acompanha na Loja ao vivo

**Tipo:** journey
**Prioridade:** P0
**Origem:** LAV-01, LAV-02, LAV-05, LAV-10, LAV-11, LAV-12
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passos 1–5
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** P0 repetível com dois contextos (app e loja); a loja precisa de `webdriver` neutralizado e UA sem `HeadlessChrome`, e o teste espera até 90 s pelo número

### Objetivo

A Adri publica no Instagram e quer saber se alguém chegou. Se a cliente na loja não aparece, ou aparece com
números diferentes no Início e na Loja ao vivo, ela deixa de confiar na tela.

### Pré-condições

- Conta: `admin-atelie`; cliente `anonima` com estatística aceita
- Massa: `production_host` = `localhost` no banco local; function `visit` servida; ninguém mais na loja
- Estado de partida: app no Início, "Ninguém na loja agora"

### Condições reais

as da persona; a loja num segundo contexto, 390 × 844, UA de iPhone

### Entrada

http://localhost:8084/ (PWA aberto) · a cliente pousa em http://localhost:8082/produtos/<slug>

### Passos com tempo

| # | A persona… | Deve ver | Em até |
| - | ---------- | -------- | ------ |
| 1 | olha o Início antes de a cliente entrar | "Ninguém na loja agora", com o mini gráfico visível | 3 s |
| 2 | (a cliente abre uma joia na loja) espera no Início sem tocar | o cartão passa a "1 pessoa" sozinho | 90 s |
| 3 | toca no cartão | a Loja ao vivo abre; o bloco "Agora na loja" diz 1, "pessoa nos últimos 5 minutos" | 3 s |
| 4 | olha o gráfico de 30 barras | a barra de agora (dourada, à direita, "agora") tem a altura de 1 pessoa; a legenda "30 min atrás" à esquerda | 2 s |
| 5 | (uma segunda cliente abre outra joia) espera na tela | o número grande vai a 2, "pessoas"; volta ao Início e o cartão diz "2 pessoas" | 75 s |

### Objetivo e efeitos

O número do cartão e o número grande são iguais à quantidade de clientes com a loja aberta. Efeitos: nenhum
na loja.

### Caminho de abandono

A cliente fecha a aba: a Adri a vê sair do total em até 5 min (TC-JOURNEY-002). A leitura falha: TC-FUNC-018.

### Esperado e fonte

Cartão e tela com o mesmo número, a barra de agora igual ao número — fonte: PRD LAV-02, LAV-10, LAV-11, §10.2; atraso aceito em §8 (até 60 s + 15 s)

### Variações

| Variação                     | Ação                                   | Esperado                                  |
| ---------------------------- | -------------------------------------- | ----------------------------------------- |
| cliente recarrega a joia 5×   | recarrega e espera                     | continua 1 pessoa                         |
| cliente navega por 5 páginas  | categoria → joia → joia → sacola → joia | continua 1 pessoa                        |
