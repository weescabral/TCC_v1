# Central de Notificações Inteligentes

## Instalação

Execute uma única vez no banco de dados da aplicação:

`backend/database/migrations/006_central_notificacoes.sql`

A migration cria a tabela `notificacoes`. Não altera nem apaga dados existentes.

## Avisos gerados

- Planos de ação com prazo vencido.
- Planos de ação com vencimento nos próximos sete dias.
- Auditorias periódicas vencidas ou com vencimento nos próximos sete dias, respeitando a periodicidade de cada setor.
- Auditorias finalizadas e quantidade de planos de ação gerados.
- Novos planos atribuídos diretamente a um responsável.

## Permissões

- Administradores recebem avisos de todos os setores ativos da empresa.
- Auditores recebem avisos apenas dos setores sob sua responsabilidade ou dos planos atribuídos diretamente a eles.
- Cada usuário possui seu próprio estado de leitura. Marcar uma notificação como lida não altera a visualização dos demais usuários.

## Comportamento

Os avisos de prazo são sincronizados quando a central é aberta. A chave única evita notificações repetidas a cada consulta. Alertas de prazo deixam de aparecer quando a ação é concluída/cancelada ou quando o prazo deixa de estar na janela de alerta. A central permite marcar uma notificação individualmente ou marcar todas como lidas.

A central é interna ao sistema; esta versão não envia e-mails, SMS ou notificações push do navegador.
