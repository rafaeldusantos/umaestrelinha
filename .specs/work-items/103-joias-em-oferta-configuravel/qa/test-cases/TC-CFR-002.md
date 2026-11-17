## TC-CFR-002: O bloco na loja não reserva espaço sem campanha, não desloca a página ao carregar e não rola de lado

**Tipo:** cfr
**Prioridade:** P1
**Origem:** RNF-01, RNF-04, RNF-06
**Autor:** dev
**Persona:** PER-01 Adri (auditando a Home como a cliente a vê, sem login)
**Jornada:** J-02 (refeita como auditoria)
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** performance percebida e compatibilidade; o CLS da fileira não se mede no vitest (spec.md › Testes)

### Objetivo

A cliente no celular não vê a Home pular quando o bloco chega, nem um buraco onde o bloco não aparece, nem a
página escorregar de lado.

### Pré-condições

- Conta: `anonima` (aba da loja sem login)
- Massa: B-1 com "Dia das Mães" e as peças que sobraram; B-2 ("Natal", agendada) e B-3 ("QA103 Virada", encerrada) ligados e fora da loja
- Estado de partida: Home da loja

### Condições reais

| Dimensão    | Valor                                            |
| ----------- | ------------------------------------------------ |
| Dispositivo | celular (390 × 844); fonte a 130 % e 200 %       |
| Rede        | lenta no passo 1                                 |
| Locale      | pt-BR                                            |
| Modalidade  | toque                                            |

### Categoria

Performance percebida · Compatibilidade

### Metas

| Observável | Alvo | Aceitável |
| ---------- | ---- | --------- |
| espaço de B-2 e B-3 (fora da vigência) | nenhum | nenhum |
| deslocamento do rodapé quando as peças de B-1 chegam | nenhum visível | pequeno, sem tirar o que estava sob o dedo |
| rolagem horizontal do corpo em 390 px | nenhuma | nenhuma |
| título e descrição a 200 % | inteiros, sem corte | — |

### Passos

1. Com rede lenta, recarregar a Home e observar do topo ao rodapé
   - **Esperado:** onde B-2 e B-3 estão na composição, nada — nem esqueleto; B-1 reserva as vagas das peças
     escolhidas; nada salta quando elas chegam
2. Com fonte a 200 %, ler o bloco B-1
   - **Esperado:** título (até 60) e descrição (até 160) sem corte; sem rolagem horizontal do corpo

### Esperado e fonte

Sem campanha valendo, o bloco não reserva espaço nem desenha nada, nem carregando; 390 px sem rolagem horizontal;
título e descrição cabem em 390 px sem cortar — fonte: PRD RNF-01, RNF-04, RNF-06

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| 1440 × 900 | repetir o passo 1 | o mesmo |
| 320 × 568 | repetir o passo 2 | sem rolagem horizontal |
