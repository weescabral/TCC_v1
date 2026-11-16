# Sensus 5S — melhorias incorporadas (15/11/2026)

## Base técnica
- Frontend mantido em HTML, CSS e JavaScript puro; sem React.
- Backend Node.js/Express e banco MySQL preservados.
- Não foi alterado o contrato de autenticação nem removidas rotas existentes.

## Dashboard
- Índice atual calculado pela média do resultado mais recente de cada setor ativo.
- Indicadores anteriores preservados: média anual, auditorias finalizadas, cobertura, planos pendentes, melhor e pior resultado.
- Legenda oficial de desempenho aplicada: crítico 0–49%, atenção 50–79%, bom 80–100%.
- Cartões da coluna direita invertidos (melhor resultado no cartão superior e auditorias finalizadas no inferior).
- Comparativo dos cinco sensos entre as duas auditorias mais recentes por setor ativo, considerando somente setores com duas auditorias finalizadas.
- Histórico resumido de evolução por setor no dashboard.

## Setores
- Endpoint autenticado GET /api/setores/:id/historico, limitado à empresa do usuário e com validação de atribuição para auditores.
- Janela de histórico no frontend com evolução do índice, comparação dos sensos e resumo de planos.

## Relatórios e notificações
- Relatórios periódicos agora retornam médias por senso e distribuição dos planos por status, além das séries por mês e setor.
- Notificações do cabeçalho passam a incluir planos atrasados e planos próximos do vencimento (sete dias).

## Interface
- Rodapé institucional inserido no final das páginas internas.
- Auditoria centralizada e ajustes responsivos no checklist.
- Estilos do dashboard e tabela comparativa adicionados.

## Banco de dados
Não foi adicionada migração SQL nesta entrega. O histórico utiliza tabelas/colunas já presentes no projeto (`auditorias`, `respostas_auditoria`, `criterios_5s`, `sensos_5s`, `planos_acao`).

## Testes realizados
- Verificação de sintaxe (`node --check`) nos arquivos JavaScript alterados.
- Não foi possível executar testes de integração sem conexão com o banco MySQL configurado pelo usuário.

## Dashboard por perfil e setor (16/11/2026)

- Administradores mantêm a visão consolidada de toda a empresa, incluindo ranking de setores e setores pendentes de auditoria.
- Auditores visualizam somente setores ativos atribuídos ao próprio usuário.
- O dashboard do auditor oferece seletor para alternar entre um setor específico e a visão consolidada dos setores sob sua responsabilidade.
- Indicadores, histórico, comparação dos cinco sensos, gráficos e distribuição de planos de ação são calculados somente com os setores autorizados.
- As consultas do backend validam o vínculo do auditor com o setor selecionado; não dependem apenas de ocultar componentes na interface.
- A listagem, o resumo e a atualização dos planos de ação também respeitam os setores atribuídos ao auditor.
