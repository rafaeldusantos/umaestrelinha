# acme-pedidos (Java 21 · Spring Boot 3 · Maven)

## Comandos

- Compilar: `mvn -q compile`
- Um teste: `mvn -q test -Dtest=<Classe>`
- Verificação mínima: `mvn -q verify -DskipITs=false`

## Testes

Repositórios JPA se testam contra Postgres via Testcontainers; o Flyway aplica o schema na subida do teste.
