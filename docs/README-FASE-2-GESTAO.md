# Sensus 5S — Fase 2: Gestão

## O que foi implementado
- Resumo de ações: total, pendentes, em andamento, concluídas e atrasadas.
- Filtros por status, prioridade e prazo (atrasadas/sem prazo).
- Plano de ação com ação corretiva, causa raiz, resultado esperado e prazo de conclusão.
- Identificação visual de ações atrasadas.
- Atualização dos dados sem alterar o fluxo de auditoria nem excluir planos existentes.
- Endpoint autenticado `GET /api/planos-acao/resumo`.

## Passo obrigatório no banco
1. Faça backup do banco utilizado pelo Sensus 5S.
2. Abra `backend/database/migrations/003_gestao_planos_acao.sql` no MySQL Workbench.
3. Selecione o banco correto e execute a migration uma única vez.
4. Reinicie o backend e atualize a página de Gestão de Ações.

A migration apenas acrescenta colunas e um índice à tabela `planos_acao`; não apaga registros. Não execute novamente depois de aplicada, pois o MySQL pode informar que as colunas já existem.

## Testes recomendados
- Abrir Gestão de Ações e conferir os cinco indicadores.
- Filtrar por status e prioridade.
- Preencher causa raiz, resultado esperado e prazo em um plano de teste.
- Alterar status para Em andamento e depois Concluído.
- Confirmar que o dashboard e o histórico de auditorias continuam carregando.

## Limites desta entrega
A geração automática de planos continua baseada nas respostas críticas já definidas pelo sistema. A seleção de um novo responsável por meio de lista de usuários e a geração automática de auditorias recorrentes ficam para etapas seguintes, para não alterar permissões ou regras existentes sem validação.
