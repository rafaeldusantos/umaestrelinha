## TC-FUNC-004: Comprovante fora da regra (tipo, tamanho, mais de três) é recusado antes de gravar, com o motivo

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-03.2, CA-03.10
**Autor:** dev
**Persona:** PER-01 Adri no celular
**Jornada:** J-01, ramo J-01a
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** arquivos fixos (M16) tornam o caso determinístico

### Objetivo

A foto do celular que serve é aceita; a que não serve é recusada na hora, com o motivo, sem perder o resto do formulário.

### Pré-condições

- Conta: `admin`
- Massa: M6; arquivos M16 (JPG, PNG, WebP, HEIC, PDF até 10 MB; um de mais de 10 MB; um GIF ou TXT; quatro válidos)
- Estado de partida: `/admin/pedidos/:id/pagamento`, com meio e observação preenchidos

### Condições reais

As da persona.

### Passos

1. Anexa um de cada: JPG, PNG, WebP, HEIC, PDF (três por vez)
   - **Esperado:** aceitos e listados; o HEIC aceito como chegou
2. Anexa o arquivo de mais de 10 MB
   - **Esperado:** recusado na hora, com o motivo (tamanho, 10 MB); nenhuma gravação
3. Anexa o GIF/TXT
   - **Esperado:** recusado com o motivo (tipo não aceito)
4. Com três anexados, tenta o quarto
   - **Esperado:** recusado com o motivo (no máximo três)
5. Depois das recusas, confere o formulário
   - **Esperado:** meio, data, observação e os anexos válidos continuam

### Esperado e fonte

Até 3, JPG/PNG/WebP/HEIC/PDF, 10 MB cada; recusa antes de qualquer gravação, com motivo — fonte: PRD CA-03.2, CA-03.10; costura Decisão 10.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Exatamente 10 MB | anexar um arquivo de 10 MB | aceito (o limite é "até") |
| Extensão trocada | um `.txt` renomeado para `.jpg` | não grava como comprovante válido em silêncio; se aceitar, registrar o que acontece ao abrir |
| Vários de uma vez | escolher quatro arquivos na mesma seleção | recusa o excedente com o motivo, sem perder os três primeiros |
