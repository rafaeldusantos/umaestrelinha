## TC-FUNC-017: A Política de Privacidade explica o aviso de presença e o que fica guardado, e por quanto tempo

**Tipo:** functional
**Prioridade:** P1
**Origem:** R-02
**Autor:** dev
**Persona:** PER-04 Helena
**Jornada:** J-04, passo 2
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** leitura do texto contra os pontos do PRD §7; a aprovação da Adri do texto não é deste QA

### Objetivo

Helena só confia na loja se a Política disser o que a loja faz — nem menos, nem mais.

### Pré-condições

- Conta: `anonima`
- Massa: nenhuma
- Estado de partida: http://localhost:8082/politica-de-privacidade

### Condições reais

as da persona

### Passos

1. Lê a parte de medição de audiência
   - **Esperado:** diz que, com a loja aberta na tela, o navegador avisa a cada minuto que a pessoa está na loja
2. Procura o que fica por até 30 minutos
   - **Esperado:** só o tipo de página (joia, lista, sacola, checkout, guia), qual joia, quantos itens na sacola, de que tipo de lugar veio (Instagram, Google, WhatsApp, direto ou outros) e se usa celular, computador ou tablet
3. Procura o que nunca fica
   - **Esperado:** nunca o IP, o endereço completo da página ou de onde veio
4. Procura o que fica depois
   - **Esperado:** por até 1 hora, o registro de quem estava na loja a cada minuto; por até 14 dias, a marca de que o navegador pôs joia na sacola naquele dia e a hora; os dois ligados só a um código aleatório que troca todo dia e não se liga ao código da visita
5. Procura a retenção das visitas
   - **Esperado:** os registros de visita apagados depois de 14 dias
6. Lê em 390 a 200 % de fonte
   - **Esperado:** sem rolar de lado

### Esperado e fonte

Cada ponto do §7 presente, sem afirmação a mais — fonte: PRD §7 (último item); spec D-13

### Variações

| Variação         | Ação                                    | Esperado                    |
| ---------------- | --------------------------------------- | --------------------------- |
| folha de cookies  | abre as preferências e lê "Estatísticas" | a categoria presente e recusável |
