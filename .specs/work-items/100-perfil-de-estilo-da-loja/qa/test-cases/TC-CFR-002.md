## TC-CFR-002: No Black Friday os textos das telas da cliente continuam legíveis, inclusive com a fonte grande

**Tipo:** cfr
**Prioridade:** P1
**Origem:** RN-03, CA-04
**Autor:** dev
**Persona:** PER-05 Marta
**Jornada:** J-03, passos 1 a 5
**Charter:** CH-08
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** contraste pelas cores computadas, por amostra; a metade "a suíte reprova um valor ruim" de CA-04 é da Validation

### Objetivo

Marta precisa ler preço, parcelas e desconto no perfil novo com a fonte a 200 %.

### Pré-condições

- Conta: `anonima`
- Massa: S1
- Estado de partida: Home (build servido)

### Condições reais

| Dimensão   | Valor                                              |
| ---------- | -------------------------------------------------- |
| Dispositivo | 390 × 844 e 1440 × 900                            |
| Modalidade | só-teclado no computador; fonte a 130 % e 200 %    |

### Categoria

Acessibilidade e compatibilidade.

### Metas

| Observável                                       | Alvo         | Aceitável |
| ------------------------------------------------ | ------------ | --------- |
| contraste de texto pequeno                       | ≥ 4,5:1      | —         |
| contraste de texto grande (24 px, 18,66 px negrito) | ≥ 3:1     | —         |
| barra do frete grátis sobre branco (objeto gráfico) | ≥ 3:1     | —         |
| rolagem horizontal do body a 200 %               | nenhuma      | —         |
| foco visível com Tab sobre o cabeçalho e os botões ouro | sim   | —         |

### Passos

1. Em Home, produto, sacola e checkout, mede o contraste de texto corrido, subtítulos (`#57524B`), parcelas, rodapé,
   texto do selo "-X%", texto sobre o botão ouro, texto sobre o cabeçalho
   - **Esperado:** dentro das metas
2. Fonte a 130 % e 200 %
   - **Esperado:** sem sobreposição, corte ou rolagem horizontal
3. Tab pelo cabeçalho e pelos botões
   - **Esperado:** foco visível

### Esperado e fonte

Os dois perfis passam pelos pisos de legibilidade; texto sobre ouro é o escuro sólido — fonte: PRD RN-03, CA-04;
spec H2 (on-sale/sale ≥ 4,5; sale-bar sobre branco ≥ 3).

### Variações

| Variação         | Ação                     | Esperado                        |
| ---------------- | ------------------------ | ------------------------------- |
| movimento reduzido | `reducedMotion: reduce` | sem animação decorativa nova   |
