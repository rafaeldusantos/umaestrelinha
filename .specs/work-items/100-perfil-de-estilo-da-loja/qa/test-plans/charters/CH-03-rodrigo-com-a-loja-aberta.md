# CH-03 · Rodrigo com a loja aberta de antes da troca: a cor não muda diante dele

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P1                                                                            |
| Persona      | PER-03 Rodrigo                                                                |
| Tour         | Interrupt                                                                     |
| Modo         | por técnica (transição de estado: atributo da carga × perfil salvo)          |
| Time-box     | 60 min · orçamento 50 ações                                                   |
| Mudança      | a regra da carga: a página chega com o perfil do HTML (`data-perfil` no `<html>`); se esse HTML veio do cache com o perfil anterior, ela continua nele até a primeira troca de página; depois vale o salvo, e voltar à página da carga não devolve o anterior. A cor nunca muda com a página parada (RN-04, UC-01 segundo item; spec R2, H6) |
| Viewport     | 390 × 844                                                                     |
| Massa        | **só lê** — perfil salvo = Black Friday (S1, deixado pela thread antes do L3). O documento HTML de cada página é **interceptado** com `data-perfil="padrao"` (o "HTML do cache") |
| Driver       | `—` (`agent-browser`, rota por URL do documento — ver Ambiente). Se a sonda falhar, `cli` e lote próprio |
| Entrada      | `http://localhost:8082/` com o documento interceptado · sem login, sacola vazia |
| Jornadas     | J-03 (ramo J-03a)                                                             |
| TC           | TC-FUNC-007, TC-FUNC-008                                                      |

## Missão

Como quem deixou a aba da loja aberta antes de a dona ligar o Black Friday, achar qualquer jeito de a página mudar de
cor sem ele trocar de página — e confirmar que, ao trocar, ela passa ao perfil salvo de uma vez e fica nele.

## Deve tentar

1. **Sonda:** abrir a Home com a rota do documento ativa e ler `document.documentElement.dataset.perfil` (deve ser
   `padrao`) e a cor computada do cabeçalho (ardósia `#283A4A`). Se a página abrir como texto ou sem o atributo, a
   sessão vai a `blocked` com o motivo
2. Deixar a página parada e interrompê-la: tirar o foco da aba e devolver (abrir outra aba e voltar), esperar 60 s,
   rolar até o rodapé — a cada passo reler o atributo e a cor do cabeçalho
3. Tocar num link interno (menu → categoria): conferir atributo `black-friday` e cabeçalho `#0D0C0B`; abrir um produto;
   voltar com o botão do navegador até a Home — continua `black-friday`
4. Repetir a partir de uma página de produto interceptada (`/produtos/<slug>`), com a troca indo para a categoria

## Edge cases sugeridos

- Voltar com o botão do sistema logo depois da primeira troca de página
- Recarregar a página da carga (a rota do documento continua ativa: volta a `padrao` — é um carregamento novo, não
  achado)
- Abrir a sacola (gaveta) sem trocar de rota: não é troca de página — a cor não muda
- Trocar só a query (`/busca?q=pingente` → `/busca?q=anel`)
- Rede cortada e devolvida com a página parada
- Mudar a orientação/viewport (390 → 844 × 390) com a página parada

## Fora do escopo

- O prazo de "alguns minutos" de quem já tinha a configuração em memória (o `staleTime` de 5 min): não se espera aqui
- A Home sem interceptação no dev server (sem atributo a configuração decide de saída — R2)
- A primeira pintura em rede lenta (CH-08)
- Telas do checkout, conta e confirmação (CH-04)
- A faixa de avisos (`data-faixa`, WI 101), que usa a mesma regra de carga: o que se notar nela é sugestão de backlog
