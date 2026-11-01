# Edge cases de usuário

Os edge cases **não técnicos** que usuários reais encontram — os que moram entre a intenção e o software. O
teste roteirizado envia o formulário uma vez, em ordem, com dado válido, de uma aba, numa rede estável. O
usuário real não faz nada disso de forma consistente.

Não são os edge cases de unidade (nulo, overflow, JSON malformado): esses são do teste automatizado.

---

## Como usar

1. Com a persona e o tour do charter definidos, escolha de **5 a 10** casos que a superfície pede —
   onboarding não precisa de "agendar através do horário de verão"; agendamento precisa
2. Registre no log quais tentou
3. Achado vira registro com a persona e o passo da jornada, como qualquer outro
4. Não tente todos numa sessão: o orçamento manda

## Navegação

| Caso                          | O que tentar                                          | O que revela                                       |
| ----------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| Recarregar durante o envio    | enviar e recarregar antes da resposta                 | envio duplo, confirmação perdida, registro fantasma |
| Voltar depois do sucesso      | chegar à tela de sucesso e voltar                     | sucesso em cache, ação refeita, trilha quebrada    |
| Voltar no meio do formulário  | preencher metade, voltar, retornar                    | dado perdido, validação reaplicada                 |
| Voltar e avançar repetido     | voltar → avançar → voltar → avançar                   | URL fora de sincronia, histórico quebrado, loop    |
| Deep link no meio do fluxo    | abrir direto a URL do passo 3                         | pré-requisito ausente, loop de login, estado parcial |
| Fechar e reabrir a aba        | fechar durante uma ação longa e reabrir               | progresso perdido × concluído em segundo plano     |
| Mesma URL em duas abas        | editar nas duas, salvar numa, recarregar a outra      | leitura velha, atualização perdida                 |
| URL inexistente               | digitar uma URL errada ou removida                    | qualidade do 404, caminho de volta                 |

## Formulário e entrada

| Caso                          | O que tentar                                          | O que revela                                       |
| ----------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| Duplo clique no enviar        | dois cliques seguidos                                 | envio duplo, cobrança dupla, registro duplicado    |
| Fora de ordem                 | preencher o campo 5, depois o 2, depois o 8           | validação na hora errada, ordem de tab quebrada    |
| Enviar vazio                  | enviar sem preencher nada                             | qualidade da mensagem, foco no primeiro erro       |
| Colar de editor de texto      | aspas curvas, travessão                               | caractere escondido enviado, renderização quebrada |
| Colar de planilha             | célula com tabulação ou quebra de linha               | transbordo para o campo seguinte                   |
| URL em campo de texto         | `https://…` no campo de nome                          | link automático, validação de tamanho              |
| Arrastar arquivo para fora    | soltar um arquivo fora da área de upload              | o browser abre o arquivo e o trabalho se perde     |

## Sessão e login

| Caso                          | O que tentar                                          | O que revela                                       |
| ----------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| Sessão expira no formulário   | começar um formulário longo, esperar expirar, enviar  | dado perdido no redirecionamento ao login          |
| Sair em outra aba             | sair na aba B com trabalho aberto na A                | a aba A age sobre sessão morta, falha em silêncio  |
| Entrar duas vezes rápido      | dois cliques no entrar                                | estado travado, redirecionamento duplo             |
| Entrar com outra conta em outra aba | só com duas personas no charter               | contaminação entre abas, ação no usuário errado    |

## Rede e tempo

| Caso                          | O que tentar                                          | O que revela                                       |
| ----------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| Cair e voltar                 | ficar offline no meio da requisição e voltar          | dado perdido, sem nova tentativa, sem aviso        |
| Enviar offline                | ficar offline e enviar                                | fila × perda × erro                                |
| Requisição longa              | ação que leva mais de 30 s                            | aviso de "ainda trabalhando", dá para cancelar?    |
| Horário de verão              | agendar através da virada                             | erro de uma hora em data, alarme, cobrança         |

## Viewport e preferências

| Caso                          | O que tentar                                          | O que revela                                       |
| ----------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| Girar no meio do fluxo        | trocar 375×812 por 812×375                            | foco ou estado perdido, modal que pula             |
| Viewport mínima               | 320×568                                               | elemento fixo cobrindo conteúdo, botão inalcançável |
| Viewport enorme               | 2560×1440                                             | espaço vazio explodindo, layout nos cantos         |
| Movimento reduzido            | `reducedMotion: reduce`                               | animação crítica pulada, retorno visual perdido    |
| Tema escuro                   | `colorScheme: dark`                                   | cor fixa no código, elemento invisível             |

## Locale e acessibilidade

| Caso                          | O que tentar                                          | O que revela                                       |
| ----------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| Tradução longa                | idioma com palavras longas, se o app tem seletor      | botão estourando                                   |
| RTL                           | idioma da direita para a esquerda, se suportado       | layout espelhado errado, ícone apontando ao contrário |
| Caracteres não latinos        | `日本語` · `العربية` · `русский`                       | codificação, fonte de fallback, busca e ordenação  |
| Só teclado                    | sem clique nenhum                                     | ordem de foco, foco visível, modal sem saída       |

## Confiança e recuperação

| Caso                          | O que tentar                                          | O que revela                                       |
| ----------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| Voltar depois do erro         | bater num erro e recarregar depois de um tempo        | página de erro em cache, loop de "desculpe"        |
| Link interno para deslogado   | abrir uma URL privada sem sessão                      | conteúdo vazando, qualidade do redirecionamento    |
| Link mágico em outro contexto | abrir o link de login numa aba sem a sessão de origem | token preso ao contexto                            |

## Fora do alcance do browser da sessão

Pedido pelo charter, vai para **Fora da cobertura** do log, com o motivo: bloquear o celular, ligação
recebida, notificação push, modo economia, entrada por voz, leitor de tela real, extensão do browser,
autopreenchimento nativo do browser.

## Fora do escopo do QA real-user

Teste de unidade de limite, SQL injection / XSS / CSRF, carga e concorrência, condição de corrida no código,
erro de build. Topou com um deles na sessão: registre o achado e diga qual porta deveria pegá-lo — não
tente verificá-lo de dentro da sessão.
