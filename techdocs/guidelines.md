# Guia do Projeto

Este documento orienta qualquer agente de IA ou pessoa trabalhando neste projeto. Para as regras de dependência e organização do código, ver [architecture.md](./architecture.md).

## Stack

- **Next.js** com App Router.
- **TypeScript** em modo estrito.
- **Biome** para lint, formatação e organização de imports.
- **Knip** para detectar arquivos, exports e dependências não usados.

React e Node.js fazem parte do Next.js neste projeto; não são tratados como stacks separadas.

## Biome

- Manter um único `biome.json` na raiz e não usar ESLint ou Prettier em paralelo.
- Partir do preset `recommended` em `linter.rules.preset` e habilitar `assist.actions.source.organizeImports`; adicionar exceções apenas quando houver necessidade concreta.
- Usar `biome check --write .` para correções locais e `biome ci .` no CI.
- Manter `tsc --noEmit` no CI, porque o Biome não substitui a verificação de tipos nem regras que dependem de informação semântica do TypeScript.
- Preferir scripts do `package.json` para que pessoas, agentes e CI executem os mesmos comandos.

## Knip

- Usar o plugin nativo do Next.js, habilitado automaticamente quando `next` está nas dependências.
- Não repetir manualmente os `entry` padrão do App Router. Configurar entradas adicionais somente quando o projeto tiver pontos de entrada não convencionais.
- Antes de remover algo apontado como não usado, confirmar referências que a análise estática pode não enxergar, como imports dinâmicos, nomes em strings e arquivos carregados por ferramentas externas.
- Executar `knip` no CI antes do merge.

## React e Next.js

- Server Components são o padrão. Usar `"use client"` somente quando o componente precisar de estado, efeitos, eventos ou APIs do navegador.
- Buscar dados no servidor chamando a camada de aplicação. Não fazer uma chamada HTTP interna para um Route Handler quando o Server Component puder chamar o caso de uso diretamente.
- Usar Server Actions para mutações iniciadas pela própria UI e Route Handlers quando for necessário expor uma interface HTTP para clientes externos, webhooks ou integrações.
- Tratar argumentos de Server Actions, parâmetros de rota, headers, cookies e payloads HTTP como entrada não confiável: validar, autenticar e autorizar no servidor.
- Após mutações, invalidar somente o dado afetado com as APIs de cache do Next.js adotadas pelo projeto.
- Usar `proxy.ts` apenas para lógica de borda que realmente precisa ocorrer antes da rota, como redirects e rewrites dependentes da requisição; não colocar regra de negócio nele.
- Preferir composição de componentes a prop drilling profundo ou contexto global sem necessidade.
- Seguir as regras de Hooks do React.

## Código de servidor

- Segredos e variáveis de ambiente privadas só podem ser lidos em módulos de servidor; nunca importá-los em Client Components.
- Não devolver stack traces, detalhes de infraestrutura ou mensagens internas cruas ao cliente.
- Definir explicitamente o runtime apenas quando houver necessidade. Código destinado ao Edge não pode depender de APIs exclusivas do Node.js.
- Usar uma biblioteca de validação somente se ela já estiver adotada ou se a complexidade dos contratos justificar a dependência; validações simples não exigem uma abstração própria.

## Convenções gerais

- Arquivos em `kebab-case`; componentes React e tipos em `PascalCase`.
- Um commit representa uma mudança coerente e segue a padronização definida abaixo.
- Não criar abstrações especulativas. Um port existe para inverter uma dependência externa real, não para antecipar uma segunda implementação hipotética.
- Não criar pastas vazias para reproduzir toda a arquitetura: cada pasta nasce com o primeiro código que realmente pertence a ela.
- Testes unitários priorizam regras de `domain` e `application`; fluxos críticos de `presentation` usam testes de integração ou E2E.

## Padronização de commits

Todos os commits devem usar um dos formatos abaixo. O hook versionado em `.githooks/commit-msg` valida a primeira linha da mensagem.

Após clonar o repositório, ativar os hooks e executar o teste:

```sh
git config core.hooksPath .githooks
sh .githooks/commit-msg.test.sh
```

Em sistemas Unix, se necessário, executar `chmod +x .githooks/commit-msg .githooks/commit-msg.test.sh`.

### Commit vinculado a um card

```text
tipo(numero-do-card): descrição
```

Exemplos:

```text
feat(12345): adiciona endpoint de consulta de exames
fix(12346): corrige validação da data de nascimento
refactor(12347): reorganiza fluxo de autenticação
```

### Commit sem card, mas com contexto

Quando não existir card associado, usar uma única palavra que identifique o contexto:

```text
tipo(contexto)!: descrição
```

Exemplos:

```text
chore(dependencias)!: atualiza dependências do projeto
docs(readme)!: adiciona instruções de execução local
refactor(pubsub)!: reorganiza adapter de mensageria
fix(docker)!: corrige configuração do health check
```

O contexto deve conter apenas letras minúsculas ou números, representar claramente a área afetada e não conter espaços, hífens, underscores ou termos genéricos como `ajuste`, `alteracao` ou `outros`.

### Commit sem card e sem contexto específico

Para uma alteração pequena, sem card e sem contexto relevante, usar `?`:

```text
tipo?: descrição
```

Exemplos:

```text
chore?: remove arquivo não utilizado
docs?: corrige erro de digitação
style?: ajusta formatação do código
```

Esse formato não deve representar uma entrega funcional.

### Tipos permitidos

| Tipo | Utilização |
| --- | --- |
| `feat` | Nova funcionalidade |
| `fix` | Correção de defeito |
| `refactor` | Alteração interna sem mudar o comportamento |
| `test` | Inclusão ou alteração de testes |
| `docs` | Alteração de documentação |
| `chore` | Manutenção ou configuração do projeto |
| `build` | Alterações no processo de build |
| `ci` | Alterações na pipeline |
| `perf` | Melhoria de desempenho |
| `style` | Formatação sem alteração de comportamento |
| `revert` | Reversão de um commit anterior |

### Descrição

A descrição deve:

- ser escrita em português;
- começar com letra minúscula;
- usar verbo no presente;
- explicar objetivamente o que foi alterado;
- não terminar com ponto final;
- não usar mensagens genéricas.

Exemplos válidos:

```text
feat(12345): adiciona autenticação por api key
fix(12346): corrige cálculo da idade do paciente
test(12347): adiciona testes do fluxo de publicação
refactor(mensageria)!: separa integração com pubsub
chore(dependencias)!: atualiza versão do nextjs
docs(readme)!: documenta variáveis de ambiente
style?: ajusta formatação dos arquivos
chore?: remove configuração não utilizada
```

Exemplos inválidos:

```text
ajustes
alterações
subindo código
fix bug
feat: adiciona endpoint
feat(ajustes gerais)!: altera projeto
feat(12345) adiciona endpoint
FEAT(12345): adiciona endpoint
```

### Expressão regular

```regex
^(feat|fix|refactor|test|docs|chore|build|ci|perf|style|revert)(\([0-9]+\)|\([a-z0-9]+\)!|\?): [a-zà-ú].+$
```

O hook também rejeita descrições terminadas em ponto final e descrições compostas apenas por termos genéricos conhecidos. Regras linguísticas, como o uso de verbo no presente, continuam dependendo de revisão humana.

## Papel da IA neste projeto

- Ler este guia e [architecture.md](./architecture.md) antes de alterar código.
- Preservar a regra de dependência: regra de negócio não vive em `app/`, componente, Route Handler ou Server Action.
- Antes de adicionar uma dependência, verificar se a plataforma, a biblioteca padrão ou uma dependência já instalada resolve o caso.
- Antes de concluir uma mudança de código, executar os scripts disponíveis de Biome, TypeScript, testes e Knip que sejam aplicáveis. Enquanto o projeto ainda não estiver configurado, não inventar comandos ou arquivos apenas para satisfazer esta regra.
