## TC-FUNC-002: O aviso de imagem só é aceito com as duas artes e o texto alternativo

**Tipo:** functional
**Prioridade:** P1
**Origem:** UC-02, UC-03
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passo 4
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** envio de arquivo pelo `setInputFiles`, determinístico

### Objetivo

A Adri sobe a arte da campanha. Sem texto alternativo, quem usa leitor de tela e o Google não sabem o que a arte diz; sem uma das artes, um dos dispositivos fica sem nada.

### Pré-condições

- Conta: `admin-loja`
- Massa: `arte-1440x48.png` e `arte-780x96.png` de `Uploads`
- Estado de partida: em `/admin/faixa-de-avisos`, com um aviso novo aberto

### Condições reais

as da persona

### Passos

1. Troca "Tipo do aviso" para **Imagem**
   - **Esperado:** aparecem "Enviar arte · 1440 × 48", "Enviar arte · 780 × 96", "Texto alternativo" (com a dica "O que está escrito na arte.") e "Destino"
2. Envia só a arte do computador e deixa o texto alternativo vazio
   - **Esperado:** a miniatura da arte enviada aparece; o aviso é recusado com o motivo no campo — falta a arte do celular e "Descreva a arte: é o que o leitor de tela e o Google leem."; a barra diz "Corrija o que está marcado para salvar." e o Salvar fica desabilitado
3. Envia a arte do celular e escreve o texto alternativo do manifesto (A4)
   - **Esperado:** as recusas somem; o Salvar volta a habilitar
4. Confere a prévia, no Celular e no Computador
   - **Esperado:** a arte inteira, centralizada, com o ouro sobrando dos lados

### Esperado e fonte

Imagem exige as duas artes e o texto alternativo; destino é opcional — fonte: PRD UC-02/UC-03; spec H-19, Design ("Texto alternativo" obrigatório)

### Variações

| Variação | Ação | Esperado |
| --- | --- | --- |
| arquivo que não é imagem | envia `arte-errada.txt` no campo da arte | recusado no campo com a mensagem do envio (spec H-23); nenhuma arte gravada |
| trocar de Imagem para Texto e voltar | com as artes enviadas, troca o tipo duas vezes | não aparece "salvo" sem o usuário salvar; o que estiver na tela ao salvar é o que vale |
| texto alternativo só com espaços | digita três espaços | recusado como vazio |
