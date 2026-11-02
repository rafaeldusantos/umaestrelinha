## TC-FUNC-012: "De onde vieram" conta cada pessoa na faixa de onde ela chegou à loja

**Tipo:** functional
**Prioridade:** P1
**Origem:** LAV-40
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-02, passo 2 e ramo J-02c
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** a origem se controla no pouso (`utm_source` e cabeçalho `Referer`)

### Objetivo

A Adri sabe se o post do Instagram, a busca do Google ou o WhatsApp trouxe gente agora.

### Pré-condições

- Conta: `admin-atelie`
- Massa: ambiente do CH-01; cinco contextos de cliente
- Estado de partida: `/ao-vivo`, ninguém na loja

### Condições reais

as da persona

### Passos

1. Pousam: A com `?utm_source=instagram`; B com `Referer: https://www.google.com/`; C com `Referer: https://wa.me/`; D sem referência; E com `Referer` de outro site
   - **Esperado:** barra empilhada e legenda com Instagram 1, Google 1, WhatsApp 1, Direto 1, Outros 1; a soma é o total "Agora na loja" (5)
2. Lê a legenda
   - **Esperado:** grade de duas colunas, a quinta faixa ocupando a linha inteira
3. Lê a letra pequena
   - **Esperado:** uma nota dizendo que link sem marcação de origem aberto dentro do app do Instagram ou do WhatsApp conta como Direto
4. A navega por mais três páginas
   - **Esperado:** continua em Instagram (a faixa é a do pouso)
5. Todas saem
   - **Esperado:** "Ninguém na loja agora."

### Esperado e fonte

Cinco faixas fixas pela chegada; mesmas pessoas do total; quinta faixa em linha inteira; nota do Direto; vazio com a frase — fonte: PRD LAV-40; spec D-08

### Variações

| Variação                         | Ação                                              | Esperado                     |
| -------------------------------- | ------------------------------------------------- | ---------------------------- |
| `utm_source` e referrer diferentes | `?utm_source=whatsapp` com `Referer` do Google   | WhatsApp                     |
| `l.instagram.com`                 | `Referer: https://l.instagram.com/`               | Instagram                    |
| `api.whatsapp.com`                | `Referer: https://api.whatsapp.com/`              | WhatsApp                     |
