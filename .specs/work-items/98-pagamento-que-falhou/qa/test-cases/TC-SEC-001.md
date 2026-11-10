## TC-SEC-001: Comprovante só abre para quem é admin, e o link dele expira

**Tipo:** security
**Prioridade:** P0
**Origem:** CA-04.2, RNF-03
**Autor:** dev
**Persona:** PER-02 Adri no computador
**Jornada:** J-02, passo 2, ramo J-02b
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** três contextos de browser (admin, anônimo, `cliente`); a expiração depende da validade curta do link — o explorer espera o tempo que couber no box ou registra a validade observada

### Objetivo

O print do PIX da cliente (nome, CPF, banco) nunca fica acessível a quem pegar o link.

### Pré-condições

- Conta: `admin`; e uma janela sem sessão e uma com a conta `cliente`
- Massa: M7 (JPG, PDF, HEIC)
- Estado de partida: `/admin/pedidos/<M7>`

### Condições reais

As da persona.

### Passos

1. Abre o JPG e o PDF pelo bloco Pagamento
   - **Esperado:** abrem; o HEIC baixa como arquivo
2. Copia o endereço de um comprovante aberto e cola numa janela anônima
   - **Esperado:** se ainda dentro da validade, o link é de uso temporário e não é o endereço público do arquivo; depois de expirado, não abre
3. Monta o endereço público do arquivo (sem assinatura) e abre na janela anônima e na da `cliente`
   - **Esperado:** não abre
4. Espera passar a validade e reabre o link copiado
   - **Esperado:** não abre; no painel, tocar no comprovante de novo gera um link que abre

### Esperado e fonte

Só admin; link expira e não é público — fonte: PRD CA-04.2, RNF-03; costura Decisão 12 (bucket privado, URL assinada).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Depois de sair | logout do painel e abrir o comprovante pelo histórico do navegador | não abre depois da validade |
| Pedido desfeito | comprovante de um registro desfeito | continua abrindo para admin |
