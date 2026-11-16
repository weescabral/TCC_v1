# Gestão de planos de ação por auditoria

## Organização

A tela de Planos de Ação agrupa os registros pelo `auditoria_id`, mantendo cada plano vinculado à auditoria que o originou. Os grupos são ordenados da auditoria mais recente para a mais antiga e podem ser expandidos ou recolhidos. Os filtros existentes continuam funcionando dentro dos grupos.

## Indicadores

O progresso é calculado por quantidade de ações, e não pela soma de percentuais: `planos concluídos / (total de planos - planos cancelados) × 100`. Ações canceladas são exibidas separadamente e não entram no denominador. O progresso geral usa todos os planos visíveis ao perfil; o resumo de cada auditoria é calculado sem os filtros de listagem para não distorcer o percentual quando o usuário filtra status, prioridade ou prazo.

## Ações antigas

Uma nova auditoria não encerra nem substitui planos anteriores. Ações pendentes ou em andamento continuam abertas até que sejam atualizadas para concluídas ou canceladas.

## Recorrência

Quando um novo plano tem o mesmo setor e o mesmo critério de um plano de auditoria anterior, a tela apresenta um aviso de possível recorrência e informa o ID, o status e o código da auditoria anterior. Se a ação anterior ainda estiver pendente ou em andamento, isso é destacado. A identificação é informativa: o sistema não presume automaticamente que a causa raiz seja idêntica.

## Banco de dados

Esta melhoria não adiciona nem altera colunas. A identificação de recorrência e os totais por auditoria são calculados a partir das tabelas existentes (`planos_acao`, `auditorias` e `setores`). Portanto, não há migration SQL adicional para esta atualização.
