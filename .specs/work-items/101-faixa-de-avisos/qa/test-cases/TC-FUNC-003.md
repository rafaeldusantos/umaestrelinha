## TC-FUNC-003: Endereço de fora colado no Destino é recusado no campo, com o motivo, e o Salvar fica desabilitado

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-04, UC-03
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, ramo J-01a
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** regra pura com mensagem; determinístico

### Objetivo

A Adri copia o endereço da barra do navegador (com `https://…`) e cola no Destino. A faixa não pode levar a cliente para fora da loja, e a dona precisa entender por quê e o que escrever no lugar.

### Pré-condições

- Conta: `admin-loja`
- Massa: a faixa do manifesto; **não salvar** nada nesta sessão
- Estado de partida: em `/admin/faixa-de-avisos`, com o A1 aberto

### Condições reais

as da persona

### Passos

1. Cola no Destino do A1 o endereço completo de uma página da loja
   - Entrada: `https://umaestrelinha.com.br/ofertas`
   - **Esperado:** o campo mostra um motivo em linguagem da dona, dizendo que o endereço tem de ser um caminho da loja começando com "/"; a barra diz "Corrija o que está marcado para salvar." e o Salvar fica desabilitado
2. Troca por um endereço que começa com duas barras
   - Entrada: `//exemplo.com`
   - **Esperado:** recusado com "Este endereço leva para fora da loja. Use um caminho da loja, começando com uma só “/” — por exemplo, “/ofertas”." (precedido do número do aviso)
3. Devolve o destino de antes (C1)
   - **Esperado:** a recusa some e o Salvar volta a habilitar; a prévia segue igual à de antes

### Esperado e fonte

Destino externo é recusado com o motivo, e não se grava — fonte: PRD CA-04, UC-03; spec PR-6, H-09, H-12, I-02

### Variações

| Variação | Ação | Esperado |
| --- | --- | --- |
| barra invertida | `/\exemplo.com` | recusado como externo |
| espaço no fim do caminho colado | `/aneis ` (com espaço) | ou aceito aparado, ou recusado com o motivo — nunca gravado com o espaço; registrar o que viu |
| destino no aviso de imagem | mesma entrada do passo 1 no A4 | a mesma recusa |
