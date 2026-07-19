# Design: Métricas por desenvolvedor

Data: 2026-07-19

## Contexto e objetivo

Criar uma página de métricas por desenvolvedor, privada para líderes, para apoiar feedbacks a cada sprint ou quinzena. A página mostra sinais objetivos sobre apoio necessário, entrega e qualidade, sempre acompanhados das tasks que explicam o número.

Os dados não formam nota, ranking ou conclusão automática sobre desempenho. Bloqueios, atrasos, retrabalho e bugs são pontos de investigação; não atribuem culpa ao desenvolvedor.

## Navegação e filtros

- Página dedicada em `/metrics/developers`, separada do dashboard agregado.
- Um combo nativo de desenvolvedores fica no cabeçalho. A troca altera somente o desenvolvedor e preserva o período selecionado.
- O filtro reutiliza o comportamento do dashboard atual: Semana, Quinzena, Mês, Período atual, anterior, próximo e intervalo personalizado por datas.
- Não existe nome ou número de sprint. O cabeçalho exibe somente o intervalo, por exemplo `01/07/2026 — 15/07/2026`.
- A URL guarda o desenvolvedor e o período, permitindo compartilhar ou revisitar a mesma consulta histórica.
- O dashboard agregado ganha apenas um link discreto para a nova página.

O histórico não será salvo como snapshot. Ele será recalculado a partir dos eventos já registrados para o intervalo escolhido, igual ao dashboard atual. Como o time informou que uma task permanece com o mesmo responsável do início ao fim, o responsável atual é suficiente para a atribuição nesta versão.

## Conteúdo da página

A interface mantém o tema, componentes, termos e fórmulas do dashboard existente. As métricas ficam organizadas em três grupos:

### Apoio

- Tempo bloqueado.
- Tempo em code review.
- Tempo em testes.

### Entrega

- Tasks concluídas (throughput).
- Previsibilidade.
- Cycle time.
- Tasks não planejadas.

### Qualidade

- Tasks com retrabalho.
- Bugs associados às entregas do desenvolvedor.

Cada card compara o período selecionado ao período anterior equivalente quando houver dados. Um elemento nativo `<details>` no próprio card lista as tasks que entraram no cálculo, com identificador e descrição. Isso evita criar modal ou estado de interface apenas para evidências.

WIP não entra nesta versão: o banco conhece o estado atual, mas não reconstrói com segurança o WIP de uma data passada. Misturá-lo com o filtro histórico tornaria a leitura enganosa.

## Dados e regras

O fluxo existente será reutilizado: `app` chama o caso de uso pelo composition root; `application/metrics` calcula os indicadores; `infrastructure/metrics` consulta o Drizzle; `presentation` apenas renderiza o resultado.

O port de métricas aceitará um filtro opcional de responsável. Sem o filtro, continuará alimentando o dashboard agregado; com o filtro, todas as consultas relevantes considerarão somente tasks atribuídas ao membro selecionado.

O snapshot será enriquecido apenas com os dados necessários para as evidências: `assigneeId`, `externalId` e `description`. Para bugs, a associação individual considera o responsável da task de origem; a interface usa o texto “bugs associados”, nunca “bugs causados”. As fórmulas existentes continuam sendo a única fonte dos valores de lead/cycle time, bloqueio, previsibilidade, retrabalho e throughput.

O caso de uso da página:

1. valida que o time atual existe e que o membro selecionado pertence a ele;
2. carrega o período atual e o anterior equivalente;
3. obtém os mesmos indicadores já usados pelo dashboard, filtrados pelo responsável;
4. monta as listas de evidências a partir das mesmas tasks usadas em cada cálculo;
5. devolve um DTO serializável para a apresentação.

## Estados e erros

- Sem desenvolvedores: mostrar estado vazio e link para cadastrar membros.
- Sem desenvolvedor selecionado: selecionar o primeiro membro disponível e refletir o ID na URL.
- ID inexistente ou de outro time: tratar como entrada inválida e voltar ao primeiro membro válido, sem consultar dados de outro time.
- Período sem tasks: manter os três grupos e mostrar `sem dados`; contagens reais permanecem `0` quando essa já é a semântica da fórmula existente.
- Métrica sem período anterior comparável: ocultar a comparação, sem inventar variação zero.
- Task sem responsável: não entra nas métricas individuais e continua entrando no dashboard agregado.

## Testes

- Caso de uso: filtra por responsável, preserva as fórmulas existentes, calcula o período anterior e retorna as evidências corretas.
- Infraestrutura: aplica o responsável em todas as consultas relevantes, inclusive bugs via task de origem, sem alterar o resultado do dashboard sem filtro.
- Apresentação: seletor preserva os parâmetros do período; intervalo personalizado e navegação anterior/próximo mantêm o desenvolvedor.
- E2E mínimo: alternar entre dois desenvolvedores no mesmo período e confirmar que números e evidências mudam sem perder o filtro.

## Fora do escopo

- Ranking ou comparação nominal entre desenvolvedores.
- Nota, avaliação automática ou texto de feedback gerado.
- Registro de feedbacks, metas ou planos de ação.
- Histórico de troca de responsável ou autoria compartilhada.
- Novas fórmulas, bibliotecas ou componentes gráficos quando os atuais forem suficientes.
