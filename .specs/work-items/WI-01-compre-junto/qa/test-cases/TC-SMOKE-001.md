## TC-SMOKE-001: A página do pingente abre com o bloco "Compre junto" e nada marcado

**Tipo:** smoke
**Prioridade:** P0
**Origem:** CA-03.2, CA-03.14
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, passo 1
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** conferência de 2 minutos do build; determinística com a massa M-01

### Objetivo

Provar que a entrada da jornada de valor está de pé: a cliente vê o bloco onde o PRD diz, sem nada escolhido por ela.

### Pré-condições

- Conta: anonima
- Massa: M-01 (pingente com três adicionais)
- Estado de partida: sacola vazia, nenhuma forma gravada ("Na linha")

### Condições reais

As da persona.

### Passos

1. Abrir `/produtos/<slug de M-01>`
   - **Esperado:** a página carrega; entre a escolha da variação e o botão de compra, o título "Compre junto" e a frase "Peças que eu escolhi para acompanhar esta joia. Marque as que quiser levar."
2. Olhar as caixas dos adicionais e o botão
   - **Esperado:** nenhuma caixa marcada; o botão (barra fixa) diz "Adicionar à sacola"

### Esperado e fonte

Bloco visível com nada marcado e o botão no rótulo de sempre — fonte: PRD CA-03.2, CA-03.14, UC-03.

### Variações

| Variação                 | Ação                          | Esperado                          |
| ------------------------ | ----------------------------- | --------------------------------- |
| recarregar               | recarrega a página            | o bloco volta sem nada marcado    |
