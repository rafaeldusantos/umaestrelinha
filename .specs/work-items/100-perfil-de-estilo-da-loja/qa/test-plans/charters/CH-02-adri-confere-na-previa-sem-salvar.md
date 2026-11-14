# CH-02 · Adri confere o Black Friday na prévia e desiste sem salvar

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P1                                                                            |
| Persona      | PER-01 Adri                                                                   |
| Tour         | Back-Button                                                                   |
| Modo         | com tour                                                                      |
| Time-box     | 60 min · orçamento 50 ações                                                   |
| Mudança      | "Ver a loja com este perfil": o modal "A loja com o perfil {nome}" com a loja num iframe no perfil escolhido e não salvo, alternância Computador/Celular, fechar por "Fechar", fundo ou Esc sem gravar nada (UC-03, CA-07; spec H10) |
| Viewport     | 1440 × 900; o card também em 390 × 844 (opções empilhadas abaixo de 1024)    |
| Massa        | **só lê** — o perfil salvo tem de continuar Padrão do começo ao fim. **Nunca** clicar em Salvar nesta sessão |
| Driver       | `—`                                                                           |
| Entrada      | `http://localhost:8083/admin/configuracoes/dados-da-loja` · logada como `admin-loja`, perfil salvo = Padrão (S0) |
| Jornadas     | J-01 (ramo J-01a)                                                             |
| TC           | TC-SMOKE-002, TC-FUNC-005, TC-FUNC-006, TC-CFR-003                            |

## Missão

Como a dona com receio de errar, confirmar que a prévia mostra a loja exatamente no perfil marcado, que o voltar do
navegador, o Esc, o fundo e o "Fechar" a tiram dali sem gravar nada, e que a loja publicada nunca muda por causa dela.

## Deve tentar

1. Marcar Black Friday sem salvar, abrir a prévia, conferir a Home dentro do iframe em preto e ouro e o título "A loja
   com o perfil Black Friday"; alternar Computador/Celular
2. Fechar de cada um dos três jeitos (Fechar, clique no fundo, Esc) e, depois de cada um, conferir: a opção marcada
   continua Black Friday, "Em uso" continua no Padrão, e uma aba nova da loja abre no Padrão
3. Com o modal aberto, usar o voltar do navegador; recarregar a página com o modal aberto; voltar para Padrão marcado
   e abrir a prévia (título "… Padrão", loja em ardósia)
4. Fazer tudo só pelo teclado uma vez: Tab até as opções, setas no grupo de rádio, Tab até "Ver a loja com este
   perfil", Enter, Esc — e para onde vai o foco ao fechar

## Edge cases sugeridos

- Clicar dentro do iframe não fecha o modal
- Trocar a opção marcada com o modal fechado e reabrir: a prévia segue a opção nova
- Abrir e fechar a prévia três vezes seguidas rápido
- Navegar dentro do iframe (tocar num produto) e fechar
- Card a 390 × 844: as duas opções empilhadas, sem rolagem horizontal do body
- Fonte do sistema a 200 % no card (`document.documentElement.style.fontSize`)

## Fora do escopo

- Salvar (é do CH-01); se por engano o perfil for salvo, registre no log e peça à thread para restaurar S0
- O passo de configuração "sem `VITE_STORE_URL`": o ambiente sobe o painel com a variável (provado em teste de
  componente)
- A prévia de `/admin/home` e de `/admin/faixa-de-avisos` (outros palcos, não tocados por este WI)
- O que a loja mostra dentro do iframe além da cor (blocos, faixa, selo de campanha) — é a Home de sempre
