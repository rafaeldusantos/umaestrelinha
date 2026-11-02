## TC-SEC-006: Quem não tem acesso ao ateliê cai na recusa do app sem ver, nem por um instante, o número da loja

**Tipo:** security
**Prioridade:** P0
**Origem:** LAV-60
**Autor:** dev
**Persona:** PER-05 Marina
**Jornada:** J-06, ramo J-06a
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** P0 de acesso; precisa da conta `admin-secundaria` já removida do painel

### Objetivo

O movimento da loja é da Adri; quem perdeu o acesso não pode ler quantas pessoas estão comprando.

### Pré-condições

- Conta: `admin-secundaria`, já removida do painel pela Adri
- Massa: ambiente do CH-01; 2 clientes presentes
- Estado de partida: app deslogado

### Condições reais

as da persona

### Passos

1. Entra com a conta e abre o Início
   - **Esperado:** a recusa do app (a mesma tela de "sem acesso" das outras abas); nenhum cartão "Agora na loja" com número
2. Abre `http://localhost:8084/ao-vivo` direto
   - **Esperado:** a recusa do app; nenhum número de pessoas, de joias ou de Acessos em instante algum (screenshot nos primeiros 2 s)
3. Volta e avança pelo navegador
   - **Esperado:** nunca um número

### Esperado e fonte

A recusa cai no episódio único do app — fonte: PRD LAV-60; spec D-10

### Variações

| Variação               | Ação                            | Esperado                           |
| ---------------------- | ------------------------------- | ---------------------------------- |
| rede cai na recusa      | offline e volta                  | falha de rede não vira acesso; recusa não vira "Não consegui carregar." |
