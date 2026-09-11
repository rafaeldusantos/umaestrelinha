# Contexto — decisões da dona do produto

Capturado na conversa de 2026-09-06, antes da spec. Registra o que foi **escolhido**, e o que a
escolha descartou — sem isto, a próxima leitura da spec não sabe se uma ausência é decisão ou
esquecimento.

| Pergunta | Escolha | O que foi descartado, e por quê |
| --- | --- | --- |
| A seção comporta quantos banners? | **Carrossel com vários slides na mesma seção**, como a loja atual (`umaestrelinha.com.br`, tema Flex da Nuvemshop: 4 slides girando, com bolinhas) | Um banner por seção, seções repetíveis. Descartado: a referência que a dona quer copiar **é** um carrossel, e empilhar quatro seções não produz rotação — produz quatro banners um embaixo do outro |
| O que aparece por cima da arte? | **Só a arte + o link.** A imagem carrega o texto embutido; o painel pede arte de computador, arte de celular, texto alternativo e destino | Título/subtítulo/CTA editáveis sobrepostos. Descartado: exigiria véu de contraste e escolha de posição do texto, e tiraria a vantagem de a Adri montar a arte pronta no Canva — que é como ela já trabalha hoje |
| A seção entra no lugar do hero? | **Não.** É um **tipo novo** que ela adiciona quando quiser, em qualquer posição, quantas vezes quiser | Substituir o hero. Descartado explicitamente pela dona: *"precisamos adicionar a opção de adicionar uma nova seção na hora"* |
| Largura | **Duas opções por seção: `full` (de borda a borda) e `wide` (dentro do container, com canto arredondado)** | Uma largura só |
| A "Chamada principal" (hero) continua obrigatória? | **Não.** *"a atual Chamada principal não deve ser default, e sim opção"* — ela passa a poder ser desligada e removida como qualquer outro bloco | O trigger `guard_hero_home_section` (`HOME-08`), que hoje torna o hero indelével no banco |

## A pergunta que a última decisão abriu, e como ela foi respondida

`HOME-08` não existia para proteger o hero: existia para tornar **impossível** uma Home com zero
seções ativas. Esconder o botão de desligar é UX, e UX não sobrevive a um `PATCH` direto — o trigger
é o que tornava a afirmação verdadeira.

Tornar o hero opcional **sem tocar na invariante** deixaria a Home poder ficar em branco. Tornar o
hero opcional **apagando a invariante** é perder a garantia sem substituto.

A saída escrita na spec é **generalizar**: o trigger deixa de perguntar "esta linha é o hero?" e passa
a perguntar "esta é a **última** seção ativa?". O hero vira opção, a Home continua não podendo ficar
em branco, e nenhuma das duas propriedades depende de a tela se comportar.
