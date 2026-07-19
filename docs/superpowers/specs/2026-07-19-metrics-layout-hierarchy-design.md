# Hierarquia visual do dashboard de métricas

## Objetivo

Melhorar a hierarquia visual da tela de métricas sem alterar dados, cálculos,
filtros, interações ou contratos entre as camadas da aplicação.

## Direção visual

O layout seguirá uma abordagem equilibrada, com leitura executiva suficiente
para destacar os números e densidade adequada para uso operacional.

- O cabeçalho terá duas camadas visuais: identificação do dashboard e período;
  ações de ajuda e navegação ficarão agrupadas em uma superfície própria.
- Cada grupo de métricas terá título e separação claros, evitando bordas ou
  fundos em excesso ao redor das seções.
- Situação atual continuará primeiro, em uma grade compacta.
- Resultado da semana dará maior destaque aos valores principais.
- Tempo do fluxo manterá os seis indicadores com menor peso visual que o bloco
  de resultados.
- A área de tendências ficará separada do resumo e manterá os quatro gráficos
  existentes em cards maiores.
- Valores usarão maior contraste e peso tipográfico; rótulos e informações
  auxiliares permanecerão secundários.

## Cores e informação nos cards

Os cards usarão cores semânticas com baixa saturação no fundo e maior saturação
na borda e no ícone: teal para desempenho e WIP, vermelho para bloqueio, azul
para review, roxo para testes e ciano para publicação. Os cards de tempo seguem
a cor da etapa correspondente. Cada indicador terá um ícone Lucide já disponível
no projeto, e partes auxiliares do valor, como `%`, denominador e taxa de
retrabalho, usarão a cor do indicador.

O gráfico decorativo de WIP da referência não será implementado porque o
dashboard possui apenas o snapshot atual de WIP. Nenhum histórico ou dado novo
será criado para sustentar decoração.

## Escopo técnico

A mudança ficará restrita a componentes de `src/presentation/metrics-dashboard`
e, se necessário, aos tokens visuais já existentes em `src/app/globals.css`.
Não serão alterados casos de uso, fórmulas, consultas, DTOs ou composição.
Nenhuma dependência será adicionada; os ícones virão de `lucide-react`, já
instalado.

## Responsividade e acessibilidade

As grades continuarão empilhando em telas menores. Controles manterão rótulos
acessíveis, estados de seleção e foco visível. A hierarquia não dependerá apenas
de cor: tipografia, espaçamento e agrupamento também comunicarão importância.

## Verificação

Os testes existentes devem permanecer verdes. A revisão incluirá Biome,
TypeScript, testes focados em métricas e inspeção do diff para confirmar que não
houve alteração de dados ou regras. A implementação ficará sem commit para
revisão visual do usuário.
