## TC-REG-003: Com o aviso de presença ligado, a cliente vai da joia ao checkout preenchido sem atraso nem erro

**Tipo:** regression
**Prioridade:** P1
**Origem:** exploratório — o aviso de presença sai em toda troca de rota e mudança da sacola, dentro do caminho da compra
**Autor:** dev
**Persona:** PER-03 Lúcia
**Jornada:** J-05, passo 6
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** julgamento de fluidez em rede lenta; fica manual

### Objetivo

A loja existe para a cliente comprar; o aviso para a Adri não pode custar fluidez a ela.

### Pré-condições

- Conta: `anonima` com estatística aceita
- Massa: ambiente do CH-01
- Estado de partida: página de uma joia, sacola vazia

### Condições reais

rede lenta (Slow 4G)

### Passos

1. Põe a joia na sacola, abre a sacola, muda a quantidade, remove e põe de novo
   - **Esperado:** cada ação responde como antes, sem espera a mais nem aviso de erro
2. Vai ao checkout e preenche contato, entrega e frete
   - **Esperado:** nenhum engasgo, nenhum campo perdido, nenhum erro no console visível à cliente
3. Com o aviso de presença falhando (bloquear a chamada da presença por rota) repete 1 e 2
   - **Esperado:** a loja funciona igual; nada diz à cliente que algo falhou

### O que mudou

A loja passou a montar o aviso de presença ao lado do contador de visitas e a enviá-lo na troca de rota e na
mudança da sacola (spec › Montagem, `PresencePing`).

### Pontos de contato com outras jornadas

O checkout (feature 49) e a sacola; a contagem de visitas (feature 71).

### Esperado e fonte

O caminho da compra continua igual — fonte: PRD §8 (aviso leve); spec Exemplares (agendamento fora do caminho crítico)

### Variações

| Variação       | Ação                     | Esperado        |
| -------------- | ------------------------ | --------------- |
| recusa de cookies no meio | recusa estatística no checkout | o checkout segue sem mudança |
