# CH-02 · A leitura do texto colado da conversa

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P0                                                                            |
| Persona      | PER-01 Adri no WhatsApp                                                       |
| Tour         | Paste                                                                         |
| Modo         | com tour                                                                      |
| Time-box     | 60 min · orçamento: 50 ações                                                  |
| Mudança      | a folha "Colar texto" e a function `customer-parse` (UC-05, D-10, D-11): os dois escopos (Cliente nova = contato + endereço; "Outro endereço" de cadastrada = só endereço), as marcas "Lido do texto — confira.", o aviso "Preenchi N de M", "Desfazer", "o CEP manda", sem dados, fora do ar e o limite |
| Viewport     | 390 × 844                                                                     |
| Entrada      | `/pedidos` → "Montar pedido" · logada como `admin-atelie`                     |
| Jornadas     | J-01 (passos 2–4), J-02 (ramo J-02a)                                          |
| TC           | TC-JOURNEY-001, TC-FUNC-011, TC-FUNC-012, TC-FUNC-013, TC-FUNC-014, TC-FUNC-015 |

## Missão

Achar qualquer texto colado do WhatsApp que faça a leitura preencher o campo errado sem a Adri perceber,
gravar algo antes de "Criar link", ou mexer na ficha de uma cliente que já existe — e confirmar que, com a
leitura fora do ar, a montagem segue à mão sem perder nada.

**Dependência de ambiente:** a leitura real precisa de `ANTHROPIC_API_KEY` no `.env` das functions locais
(`customer-parse` servida pelo edge runtime local). Sem a chave, a function responde 503: rode TC-FUNC-015
nesse estado e marque TC-FUNC-011..014 e TC-JOURNEY-001 `blocked` (ambiente), com o motivo. Nunca aponte a
sessão para `*.supabase.co`.

## Deve tentar

1. Colar conversas realistas (massa abaixo): com emoji, "Oi Adri!!", nome e endereço em mensagens separadas,
   telefone com +55, CEP sem hífen, CPF com pontos, aspas curvas e travessão
2. Ler, editar um campo lido (a marca sai), e "Desfazer" — conferir que volta exatamente ao que havia, inclusive o que ela já tinha digitado antes
3. Em cliente cadastrada › "Outro endereço" › "Colar de uma mensagem", colar um texto com nome e e-mail diferentes: só o endereço muda
4. Colar um CEP real com a rua errada no texto: rua, bairro, cidade e UF vêm do serviço de CEP

**Massa de texto** (sintética — nunca dado real): "Oi Adri! 😊 Sou a Juliana Prates, meu e-mail é
juliana.prates@exemplo.invalid, zap (51) 99999-1234. Pode mandar pra Rua dos Andradas 1234 ap 302, Centro,
Porto Alegre RS, cep 90020-008. CPF 123.456.789-09" · uma variação só com endereço · uma sem dado nenhum
("obrigada pela atenção, depois eu vejo") · uma com 2.100 caracteres.

## Edge cases sugeridos

- Colar de planilha (tabulações) e de editor (aspas curvas, travessão)
- Texto acima de 2.000 caracteres (corte na digitação e contador)
- Duplo toque em "Ler o texto"; fechar a folha durante "Lendo o texto…"
- Cair a rede durante a leitura, e voltar
- "Ler outro texto" depois de uma leitura boa
- Leitura em Cliente nova seguida de troca para "Cliente cadastrada" (a leitura some)

## Fora do escopo

- A qualidade do modelo em textos que nenhuma pessoa mandaria (prompt injection, SQL): não é o tour; anote só se a tela quebrar
- O teto de 30 leituras em 10 min por inteiro: provoque só se o orçamento couber (TC-FUNC-015, variação)
- "Colar texto" no painel — WI seguinte; a Política de Privacidade — fora do WI
- O resto do passo 1 (CH-01) e os passos 2–4
