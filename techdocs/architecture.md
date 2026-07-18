# Arquitetura

Este projeto aplica **Clean Architecture** e conceitos de **DDD (Domain-Driven Design)** de forma proporcional à complexidade real. O Next.js App Router é a borda da aplicação: páginas, Route Handlers e Server Actions são adapters de entrada, não donos da regra de negócio.

## Regra de dependência

Dependências de código apontam para dentro:

```text
presentation   → application → domain
infrastructure → application
infrastructure ──────────────→ domain
```

- `domain` não importa `application`, `infrastructure`, `presentation`, React, Next.js ou ORM.
- `application` depende do `domain` e declara os ports necessários para acessar recursos externos.
- `infrastructure` implementa os ports de `application` e faz o mapeamento para banco de dados, APIs e outros providers.
- `presentation` consome casos de uso e seus contratos; não acessa banco, ORM ou clients externos.

O **composition root** é a exceção deliberada: ele conhece `application` e `infrastructure` para construir casos de uso com suas dependências concretas. Nenhuma regra de negócio vive nele.

## Estrutura de pastas

```text
src/
├── app/                     # App Router e adapters finos do Next.js
├── domain/
│   └── <contexto>/
│       ├── entities/
│       ├── value-objects/
│       └── services/        # somente serviços de domínio realmente necessários
├── application/
│   └── <contexto>/
│       ├── use-cases/
│       ├── ports/           # contratos exigidos pelos casos de uso
│       └── dtos/            # somente quando diferem dos tipos de domínio
├── infrastructure/
│   └── <contexto>/          # implementações de ports, ORM e integrações
├── presentation/
│   └── <contexto>/          # componentes, hooks e view-models reutilizáveis
└── composition/
    └── <contexto>.ts        # factories mínimas para montar os casos de uso
```

Essa árvore é um mapa, não um scaffold obrigatório. Não criar diretórios vazios nem arquivos de exemplo sem uso real.

`<contexto>` representa um bounded context, como `metrics`, `auth` ou `billing`. Contextos não importam entidades ou implementações internas uns dos outros. A integração ocorre por contratos públicos da camada de aplicação, eventos ou dados explicitamente mapeados.

## Camadas

### Domain

- Contém entidades, Value Objects, invariantes e serviços de domínio puros.
- Não conhece persistência, transporte HTTP, UI ou framework.
- Entidades e Value Objects preservam suas próprias invariantes; imutabilidade é preferida quando fizer sentido para o modelo.

### Application

- Contém casos de uso que orquestram o domínio e os ports.
- Cada caso de uso representa uma ação de negócio; pode ser função ou classe, escolhendo a forma mais simples.
- Recebe dependências por parâmetro ou construtor e nunca instancia infraestrutura.
- Declara os ports que realmente usa. Ter apenas uma implementação não elimina a necessidade do port quando ele protege a regra de negócio de uma dependência externa.
- Expõe DTOs quando o contrato de entrada ou saída não deve ser a própria entidade de domínio.

### Infrastructure

- Implementa persistência, APIs externas, cache, filas e demais ports.
- Tipos de ORM e SDKs externos ficam confinados nesta camada.
- Converte dados externos para tipos aceitos por `application` ou `domain`.

### Presentation

- Contém componentes, hooks, view-models e adapters de UI.
- Client Components recebem dados serializáveis e não acessam `infrastructure`.
- Não contém regra de negócio nem decide invariantes do domínio.

### Composition root

- Monta implementações concretas e as injeta nos casos de uso.
- Expõe factories pequenas, agrupadas por contexto; não exige container de DI.
- Apenas módulos de entrada em `app/` importam essas factories. Código reutilizável de `presentation` não importa `composition`.

## Fronteiras e mapeamento

- Não importar tipos de ORM ou SDK fora de `infrastructure`.
- Criar mapper explícito quando os formatos ou responsabilidades forem diferentes; não criar mapper que apenas copie campos idênticos sem proteger uma fronteira real.
- DTOs de `application` formam o contrato com os adapters de entrada quando expor a entidade diretamente acoplaria camadas ou revelaria dados indevidos.
- Erros de domínio e aplicação são convertidos em respostas HTTP ou mensagens de UI somente na borda.

## Next.js dentro da arquitetura

- Server Components são o adapter de leitura padrão e obtêm casos de uso pelo composition root.
- Server Actions são adapters de mutação: validam, autenticam, autorizam, chamam um caso de uso e invalidam o cache necessário.
- Route Handlers são usados para interfaces HTTP reais, como APIs públicas, webhooks e integrações. A UI do próprio servidor não chama Route Handlers por HTTP para acessar a aplicação.
- Arquivos em `app/` coordenam navegação, metadados e adapters; não contêm regra de negócio.
- `proxy.ts` trata somente concerns anteriores ao roteamento. Autorização definitiva continua no caso de uso ou no adapter de entrada.

## Quando simplificar

Nem todo fluxo exige um modelo de domínio completo. Leitura estática e formatação visual podem permanecer em `presentation`; um CRUD sem regra de negócio relevante pode usar uma função de aplicação e um port mínimos, sem entidade, Value Object ou service desnecessário. Quando surgirem invariantes ou comportamento reutilizado, introduzir o modelo de domínio necessário e registrar decisões arquiteturais relevantes.

Simplificar não autoriza misturar regra de negócio com UI, expor segredos, ignorar validação em fronteiras ou acoplar o domínio a frameworks.
