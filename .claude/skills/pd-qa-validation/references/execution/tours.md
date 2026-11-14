# Tours

Um tour é a lente temática de uma sessão: enquadra a exploração num padrão de falha que usuários reais
encontram. Escolher o tour certo é o que mais pesa para a sessão achar bug real.

Cada charter `exploratório` usa **exatamente um** tour. Os itens de cada tour são estímulos, não checklist: a
missão é achar bug no tema, não executar todo item.

---

## Catálogo

### Feature

- **Tema:** a funcionalidade principal funciona de ponta a ponta como prometido?
- **Quando:** feature nova, sanidade depois de deploy
- **Tentar:** o caminho feliz documentado; cada promessa que a tela, o PRD ou o onboarding faz
- **Procurar:** funcionalidade faltando, promessa quebrada, tela que diz uma coisa e faz outra
- **Evidência:** a tela do objetivo alcançado

### Money

- **Tema:** os caminhos que movem dinheiro
- **Quando:** checkout, troca de plano, reembolso, fatura, moeda
- **Tentar:** abandonar no meio do pagamento; trocar moeda; cupom vencido; mais cupons que o permitido;
  cartão recusado; cancelar depois de cobrar
- **Procurar:** cobrança fantasma ou dupla, desconto perdido, arredondamento, recibo que não bate, imposto errado
- **Evidência:** o sucesso do pagamento e o recibo; na falha, o erro e a requisição de rede

### Garbage

- **Tema:** o produto sobrevive a ser maltratado?
- **Quando:** superfície cheia de entrada — formulário, upload, busca, edição em massa, comentário
- **Tentar:** texto de 10.000 caracteres; arquivo vazio, enorme, de tipo errado; duplo clique no enviar; emoji,
  texto RTL, palavras de SQL — como cópia realista de outro app, não como teste de segurança; desfazer e
  refazer até o estado quebrar
- **Procurar:** perda de dado em silêncio, gravação parcial, UI congelada, erro 500 sem retorno ao usuário
- **Evidência:** o estado corrompido e a entrada que o causou

### Back-Button

- **Tema:** o voltar do browser é expectativa do usuário, não recurso do desenvolvedor
- **Quando:** fluxo de vários passos, wizard, deep link, UI cheia de modal
- **Tentar:** voltar em cada passo, avançar, voltar de novo; voltar de um modal e de uma tela de sucesso;
  recarregar no meio; abrir a URL de um passo intermediário numa aba nova
- **Procurar:** estado perdido, estado fantasma ("você já fez isto"), modal preso, campo limpo, ação refeita
- **Evidência:** a tela depois do voltar, com a URL

### Multi-Tab

- **Tema:** usuário real vive com várias abas abertas
- **Quando:** estado compartilhado entre abas ou sessões
- **Tentar:** a mesma página em duas abas, editar campos diferentes, salvar as duas; sair na aba A com
  formulário aberto na B; excluir o registro numa aba e editar na outra
- **Procurar:** estado velho, atualização perdida, conflito sem saída, sessão vazando entre abas
- **Evidência:** as duas abas no momento da divergência

### Network

- **Tema:** usuário real não tem wi-fi rápido
- **Quando:** qualquer coisa com I/O — ou seja, quase tudo
- **Tentar:** cortar a conexão no meio do envio e restaurar; recarregar durante um carregamento longo;
  enviar de novo quando o primeiro envio parece travado
- **Procurar:** spinner infinito, UI otimista dizendo sucesso quando falhou, envio duplo, dado perdido,
  nenhum aviso de offline
- **Evidência:** a tela na falha e a requisição que falhou

### Locale

- **Tema:** o mundo não é en-US
- **Quando:** superfície que mostra texto, número, data ou moeda
- **Tentar:** o seletor de idioma do app, se houver; datas em DD/MM e MM/DD; preço com vírgula decimal;
  tradução longa; fuso diferente em agendamento ou cobrança
- **Procurar:** texto sem tradução, data no formato errado, moeda ausente, layout quebrado por tradução
  longa, erro de fuso
- **Evidência:** a tela com o locale visível

### Paste

- **Tema:** usuário real cola de outro lugar, com formatação que não viu
- **Quando:** campo que aceita texto livre ou dado estruturado
- **Tentar:** aspas curvas e travessão (Word); tabulação e quebra de linha (planilha); markdown; URL num
  campo que não é de URL
- **Procurar:** `&rdquo;` na tela, quebra de linha perdida, formatação escondida enviada ao servidor,
  entrada aceita que quebra a exportação ou o e-mail depois
- **Evidência:** a tela com o valor colado e o valor que voltou da API

### Autofill

- **Tema:** o browser preenche de jeitos que o desenvolvedor não vê
- **Quando:** formulário de login, checkout, configurações
- **Tentar:** preencher todos os campos de uma vez e enviar imediatamente (a corrida entre preencher e
  validar); conferir se cada campo declara o `autocomplete` certo para o gerenciador de senhas e de cartão
- **Procurar:** validação disparada antes do preenchimento, campo limpo depois de preencher, `autocomplete`
  ausente ou trocado
- **Evidência:** o formulário preenchido, antes do envio

### Interrupt

- **Tema:** a vida interrompe o usuário
- **Quando:** fluxo longo — formulário, wizard, upload
- **Tentar:** fechar a aba no meio e reabrir a URL; ir para outra página e voltar; deixar a sessão ociosa até
  expirar, quando o time-box comporta; reabrir o link de um fluxo abandonado
- **Procurar:** sessão expirada sem recuperação, formulário perdido, "continuar de onde parou" que continua
  do lugar errado
- **Evidência:** antes e depois da interrupção, com a causa no log

## Superfície → tour

| Superfície               | Primeira escolha | Segunda escolha |
| ------------------------ | ---------------- | --------------- |
| Onboarding / cadastro    | Feature          | Network         |
| Checkout / pagamento     | Money            | Network         |
| Configurações            | Back-Button      | Multi-Tab       |
| Operação em massa        | Garbage          | Multi-Tab       |
| Formulário               | Autofill         | Paste           |
| Busca / filtro           | Garbage          | Locale          |
| Upload                   | Network          | Garbage         |
| Wizard / vários passos   | Back-Button      | Interrupt       |
| Fluxo só mobile          | Interrupt        | Network         |
| Lançamento internacional | Locale           | Paste           |
| Página de erro           | Back-Button      | Network         |

A segunda escolha é outro charter, nunca a mesma sessão.

## Persona × tour

Pelos arquétipos de [personas.md](../plan/personas.md#1-os-seis-arquétipos); a persona do plano herda o do seu.

| Tour        | Arquétipo que mais rende | Por quê                                                |
| ----------- | ------------------------ | ------------------------------------------------------ |
| Feature     | novo usuário             | vê o que falta de orientação na primeira visita        |
| Money       | usuário avançado         | chega aos caminhos de cobrança menos comuns            |
| Garbage     | usuário avançado         | cola dado grande e bagunçado naturalmente              |
| Back-Button | usuário ocasional        | usa o voltar como navegação principal                  |
| Multi-Tab   | usuário avançado         | vive em muitas abas                                    |
| Network     | usuário mobile           | rede instável todo dia                                 |
| Locale      | qualquer, com locale ≠ pt-BR | expõe tradução, formato e fuso                         |
| Paste       | usuário ocasional        | copia e cola de outros apps                            |
| Autofill    | usuário ocasional        | tem dado salvo no browser                              |
| Interrupt   | usuário mobile           | é interrompido o tempo todo                            |

## Anti-padrões

- **Vários tours num charter** — dilui todos
- **Tour sem persona** — o tour é o quê; a persona é quem. O charter precisa dos dois
- **Trocar de tour no meio da sessão** — registre o padrão novo no debrief, não mude de lente
