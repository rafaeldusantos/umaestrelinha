## TC-FUNC-003: O card explica o que muda e quanto tempo leva, mostra o perfil em uso e só deixa salvar quando há mudança

**Tipo:** functional
**Prioridade:** P1
**Origem:** UC-01 (terceiro item), RN-05, D-02
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passos 1 a 3
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** texto literal e estado do botão, determinísticos

### Objetivo

A dona precisa saber, antes de salvar, que só as cores mudam e que pode levar até 1 hora para todos verem — senão ela
acha que não funcionou e mexe de novo.

### Pré-condições

- Conta: `admin-loja`
- Massa: perfil salvo = Padrão
- Estado de partida: `/admin/configuracoes/dados-da-loja`

### Condições reais

As da persona.

### Passos

1. Rola até o card
   - **Esperado:** é o último card da seção (H11), com o título "Perfil de estilo da loja" e o texto "Muda só as cores
     da loja. Textos, blocos da Home, preços e menu continuam iguais, e voltar ao Padrão é a mesma escolha."
2. Lê as opções
   - **Esperado:** grupo de opções com rótulo acessível "Perfil de estilo"; "Padrão" — "Ardósia e ouro, a cara de
     sempre da loja." com "Em uso"; "Black Friday" — "Preto e ouro, para a campanha."; cada uma com quatro amostras
3. Lê o aviso com o relógio
   - **Esperado:** "Depois de salvar, quem abrir a loja já vê o perfil novo nas páginas de produto e de categoria em até
     5 minutos, e nas outras páginas em até 1 hora. Quem já está com a loja aberta vê ao trocar de página."
4. Sem marcar nada, olha o botão de salvar; marca Black Friday; marca Padrão de novo
   - **Esperado:** desabilitado → habilitado → desabilitado

### Esperado e fonte

O card diz o que muda e o prazo, e o salvar só existe com mudança — fonte: PRD UC-01, RN-05, D-02; spec › Design
(card), H7, H9, H11.

### Variações

| Variação                 | Ação                          | Esperado                                                 |
| ------------------------ | ----------------------------- | -------------------------------------------------------- |
| amostras                 | lê as cores dos quatro quadrados | Padrão `#283A4A` `#34495E` `#B8945F` `#F1EBE1`; Black Friday `#0D0C0B` `#1C1A18` `#C2A063` `#F0EADF` |
| card a 390 × 844         | abre a seção no celular       | opções empilhadas, sem rolagem horizontal do body        |
