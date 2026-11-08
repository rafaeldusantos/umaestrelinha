## TC-FUNC-010: O CEP com 8 dígitos completa o endereço, e o CEP não achado libera os campos para digitar

**Tipo:** functional
**Prioridade:** P1
**Origem:** UC-04 (D-13)
**Autor:** dev
**Persona:** PER-01 Adri no WhatsApp
**Jornada:** J-01, passo 4
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** depende do serviço de CEP da loja no ambiente local

### Objetivo

A Adri digita só o CEP e o número; quando o serviço não ajuda, ela consegue digitar o resto.

### Pré-condições

- Conta: `admin-atelie`
- Massa: CEP real de Porto Alegre (ex.: `90020-008`); CEP inexistente (`99999-999`)
- Estado de partida: passo 1, formulário de endereço aberto

### Condições reais

As da persona.

### Passos

1. Digita o CEP real
   - **Esperado:** rua, bairro, cidade e UF preenchidos; a dica "Porto Alegre/RS · endereço completado pelo CEP."
2. Apaga e digita o CEP inexistente
   - **Esperado:** "Não achei este CEP. Confira, ou preencha o endereço à mão."; os quatro campos editáveis
3. Preenche à mão e segue
   - **Esperado:** "Continuar" liga

### Esperado e fonte

Fonte: PRD › Passo 1 ("CEP com 8 dígitos completa rua, bairro, cidade e UF […] CEP que o serviço não encontra — ou serviço de CEP fora do ar — libera"); spec D-13.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| serviço fora do ar | corta a rede só da consulta de CEP | a mesma frase e os campos liberados |
| CEP de cidade (sem rua) | digita CEP geral com a rua já escrita | a rua escrita não some |
| CEP com 7 dígitos | digita e segue | "Confira o CEP do endereço novo." |
