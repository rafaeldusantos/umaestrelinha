# CH-03 · Ida e volta entre a sacola e o checkout, com conta, retirada e fonte grande

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | exploratório |
| Prioridade   | P1 |
| Persona      | PER-04 Teresa |
| Tour         | Back-Button |
| Modo         | por cenário (J-05) |
| Time-box     | 60 min · orçamento: 50 ações |
| Mudança      | o CEP e a escolha da gaveta chegam ao checkout e convivem com o endereço salvo (CA-09, pergunta 1 do PRD 97 decidida em D-11); a sacola que muda depois do cálculo recota (CA-10); a retirada no escritório aparece na gaveta (CA-07); a barra de confiança, o aviso de login e a página do produto dizem a região (CA-24) |
| Viewport     | 390 × 844 com a fonte da raiz a 200 % (como a fonte do sistema); os passos de teclado em 1440 × 900 a 100 % |
| Massa        | só lê: `store_settings` (frete e retirada), o endereço salvo da conta `cliente-com-endereco` (Porto Alegre/RS, 90010-000); cria e descarta a própria sacola e rascunho |
| Driver       | — |
| Entrada      | `/` · deslogada; entra pelo aviso de login da loja com `cliente-com-endereco` (código no Mailpit); sacola vazia; cotação interceptada com a **fixture A**, trocada pela **fixture B** no passo da quantidade |
| Jornadas     | J-05 |
| TC           | TC-FUNC-008, TC-FUNC-009, TC-FUNC-011, TC-FUNC-020, TC-JOURNEY-003 |

## Missão

Como Teresa, com a fonte a 200 % e indo e voltando entre a sacola e o checkout, descobrir se o CEP que ela calculou,
a forma de envio que escolheu (entrega ou retirada) e o endereço salvo dela sobrevivem a cada voltar, recarregar e
mudança de quantidade — sem nada cortado na tela.

## Deve tentar

1. J-05 inteira, com a fonte a 200 %, lendo a barra de confiança, o aviso de login e a linha da página do produto.
2. Calcular na gaveta com 90010-000 (igual ao salvo), escolher a retirada, ir ao checkout, voltar com o botão voltar
   do navegador, trocar para o PAC, voltar ao checkout.
3. Calcular na gaveta com 01310-100 (diferente do salvo) e conferir que vale o CEP da gaveta.
4. Com o frete escolhido, trocar a rota da cotação para a **fixture B** e mudar a quantidade: a cotação é refeita com o
   mesmo CEP, a opção continua marcada com o preço novo; com a faixa cruzada, a faixa e o "Grátis" acompanham.

## Edge cases sugeridos

- Voltar → avançar → voltar entre a gaveta aberta e o checkout.
- Recarregar o checkout com a escolha vinda da gaveta.
- Abrir `/checkout` direto numa aba nova (sem o rascunho): nada de "Trazido da sua sacola".
- Remover a peça que estava na sacola depois do cálculo e pôr outra.
- Só teclado (1440): Tab até o campo de CEP, Enter para calcular, setas/Espaço nas opções, Enter na linha recolhida.
- Sair da conta numa aba com o checkout aberto na outra.

## Fora do escopo

- O comportamento fora da região (CH-02) e a falha da cotação (CH-04).
- A medida do rodapé e os alvos de 44 px — CFR (CH-08); aqui a fonte a 200 % é o modo da persona, e o achado é o que
  ela não consegue ler ou alcançar.
- Leitor de tela real (TalkBack/VoiceOver): fora do browser da sessão.
- O CEP da página do produto não vai para a sacola (Pergunta 4 do PRD 97 — fora).
- Lembrar o CEP entre visitas (fechar a aba esquece — consequência aceita).
- Pagar, e o restante da conta (`/conta`) que o Work Item não toca.
- A faixa de avisos do topo (WI 101).
