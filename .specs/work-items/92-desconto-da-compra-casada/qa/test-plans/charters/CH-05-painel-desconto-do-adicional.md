# CH-05 · A dona grava, recusa e pré-visualiza o desconto de cada adicional

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P0                                                                            |
| Persona      | PER-02 Adri (painel)                                                          |
| Tour         | Garbage                                                                       |
| Modo         | com tour                                                                      |
| Time-box     | 60 min · orçamento: 50 ações                                                  |
| Mudança      | o campo "Desconto ao levar junto" em cada adicional, vazio = sem desconto (CA-01.1); a recusa fora de 1 a 50 ou não inteiro (CA-01.2); mudar só o percentual grava (CA-01.3); não muda outra joia (CA-01.4); a prévia e a faixa (CA-01.5); a loja com o mesmo preço da prévia (CA-02.1) |
| Viewport     | 1440 × 900; 1024 e 390 para o empilhamento                                    |
| Entrada      | `/admin/produtos/<id de P>/editar`, aba "Compre junto" · logada como `admin-painel` |
| Jornadas     | J-02 e os ramos J-02a, J-02b, J-02c                                            |
| TC           | TC-SMOKE-003, TC-JOURNEY-003, TC-FUNC-001, TC-FUNC-002, TC-FUNC-003, TC-FUNC-004, TC-FUNC-005 |

## Missão

Maltratar o campo do percentual como a dona faria com pressa — "10%", "10,5", "0", "051", colar de planilha — e
confirmar que nada inválido é gravado em silêncio, que o válido é gravado e que a prévia diz o mesmo preço que a
loja vai mostrar.

## Deve tentar

1. Digitar e colar valores inválidos e válidos em cada tipo de adicional (peça avulsa e lista) e salvar.
2. Mudar só o percentual de um adicional e salvar; salvar sem mudar nada.
3. Gravar o percentual de P e abrir Q e outra joia para ver que nada mudou nelas.
4. Comparar a prévia (valor e faixa) com a página da loja em outra aba, trocando a variação.

## Edge cases sugeridos

- Colar de planilha ("10\t")
- Valor com espaço antes e depois
- Apagar o valor e salvar
- Duplo clique no Salvar
- Mesma joia em duas abas, salvando percentuais diferentes
- Sair da página com alteração não salva
- Viewport 390 (o empilhamento abaixo de 1024)

## Fora do escopo

- O resto do formulário do produto e o resto da aba Compre junto do WI-01 (listas, ordem, forma do bloco).
- A edição das listas em `/admin/compre-junto` (o percentual mora no adicional, não na lista — P-02).
- O "Na loja" da lateral citando o percentual (o `spec.md` diz que o design não o mostra; sem critério).
- O texto de ajuda do protótipo que diz que o desconto concorre com o cupom (contradiz o PRD; vale o PRD).
- A gravação direta no banco (TC-INT-001, com o Dev).
