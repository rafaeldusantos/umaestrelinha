# Suíte de regressão — <suite> · <WI-ID>

**Tier:** smoke · targeted · full · sanity
**Motivo:** <o que disparou a suíte — mudança, fix de BUG-N, hotfix, release>
**Escrita em:** <AAAA-MM-DD> · **Duração estimada:** <N> min

## O que mudou

<Superfícies e fluxos que o Work Item alterou — da costura. É o que decide quais jornadas entram.>

## Jornadas

| Ordem | Jornada                | Persona | Prioridade | Por que entra                                       | TC                    |
| ----- | ---------------------- | ------- | ---------- | --------------------------------------------------- | --------------------- |
| 1     | J-NN <valor>           | PER-NN  | P0         | smoke · toca a mudança · cruza fronteira · canário · bug corrigido | TC-…, TC-REG-… |

**Canário:** <a jornada P0 que não toca a mudança — obrigatória no targeted>

## Ordem de execução

1. **Smoke** — <TC>. Falhou ⇒ pare: veredito `fail` sem rodar o resto
2. **Jornadas P0** — <TC>
3. **P1, depois P2** — <TC>
4. **Charters** — <CH-NN>
5. **CFR** — <CH-NN, nas duas jornadas mais usadas>

## Casos novos desta suíte

| TC         | Origem             | Por quê                                         |
| ---------- | ------------------ | ----------------------------------------------- |
| TC-REG-NNN | BUG-N · exploratório | <bug corrigido que não pode voltar · jornada não tocada> |

<Ou "nenhum — a suíte reusa casos existentes".>

## Automação

| Automação                  | TC   |
| -------------------------- | ---- |
| `e2e` · `existing`         |      |
| `e2e` · `missing` (pedido) |      |
| `blocked` — <motivo>       |      |
| `manual`                   |      |

## Critérios de saída

- **`pass`** — toda jornada P0 chega ao objetivo, nenhum bug `critical`/`high` aberto, todos os charters rodaram
- **`partial`** — caso P0/P1 `blocked` ou charter que não rodou
- **`fail`** — smoke falhou, caso P0 falhou, ou bug `critical`/`high` aberto

## Fora desta suíte

<Jornadas deixadas de fora e o motivo — ou "nada".>
