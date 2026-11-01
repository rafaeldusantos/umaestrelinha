# Spec — WI-03 Exportar relatório de pedidos

## Escopo

UC-01 exportar pedidos de um período · UC-02 período sem pedidos

## Código — acme-pedidos

- **O que muda** — `app/pedidos/page.tsx` ganha o botão "Exportar" (só perfil `gerente`); `app/api/pedidos/export/route.ts` gera o CSV em UTF-8 com BOM

## Cobertura dos UCs

| UC | Critérios | Reivindicado por |
|---|---|---|
| UC-01 | P1-AC01 · P1-AC02 · P1-AC03 | acme-pedidos |
| UC-02 | P1-AC04 | acme-pedidos |
