## TC-SEC-004: Robô e loja aberta fora do endereço de produção não aparecem na Loja ao vivo

**Tipo:** security
**Prioridade:** P1
**Origem:** §10.3
**Autor:** dev
**Persona:** PER-04 Helena
**Jornada:** J-04, ramo J-04c
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** o robô é o próprio Playwright sem neutralização; o host interno é a loja aberta por `127.0.0.1` com `production_host` = `localhost`

### Objetivo

Visitas de robô e da própria equipe em homologação não podem virar "gente na loja" para a Adri.

### Pré-condições

- Conta: `anonima` com estatística aceita; a Adri com `/ao-vivo` aberta
- Massa: ambiente do CH-01 (`production_host` = `localhost`)
- Estado de partida: ninguém na loja

### Condições reais

as da persona

### Passos

1. Num contexto **sem** neutralizar `navigator.webdriver` (e com o UA padrão do headless), navega por joias por 3 min
   - **Esperado:** a Loja ao vivo continua sem ninguém
2. Num contexto neutralizado, abre a loja por `http://127.0.0.1:8082/` e navega por 3 min
   - **Esperado:** continua sem ninguém
3. No mesmo contexto neutralizado, abre por `http://localhost:8082/`
   - **Esperado:** passa a 1 pessoa em até 75 s (prova de que a contagem funciona)

### Esperado e fonte

Robô e host interno nunca aparecem — fonte: PRD §10.3; spec D-06 (host decidido no servidor)

### Variações

| Variação               | Ação                                     | Esperado      |
| ---------------------- | ---------------------------------------- | ------------- |
| UA de buscador          | UA do Googlebot num contexto neutralizado | não aparece   |
