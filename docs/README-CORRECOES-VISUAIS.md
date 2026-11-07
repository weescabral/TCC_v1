# Sensus 5S — correções da atualização visual

Esta versão corrige a integração da atualização visual anterior:

- Sidebar compacta com expansão por hover/foco, mantendo-se sobre o conteúdo sem ser cortada pelo layout.
- Perfil do usuário com edição de nome e foto local do navegador.
- Central de notificações conectada ao endpoint do dashboard.
- Endpoint do dashboard agora também devolve `setoresPendentes` e `setoresAuditados`, campos que já eram calculados no modelo e estavam ausentes da resposta HTTP.
- Gráficos e ranking usam cores semafóricas por desempenho; barras de progresso recebem a classe de cor correspondente.
- Gráfico de planos usa cores conforme o status.

## Importante

1. Faça backup da pasta atual antes de substituir arquivos.
2. Extraia este projeto em uma pasta separada para validar.
3. Inicie o backend normalmente (`npm run dev` dentro de `backend`).
4. Abra o frontend servido pela mesma forma que já utiliza.
5. Faça login novamente e teste dashboard, notificações, sidebar e edição do perfil.

A foto do perfil é armazenada no `localStorage` deste navegador; o nome é atualizado no banco pelo endpoint autenticado `PATCH /api/auth/perfil`.

A validação realizada nesta entrega inclui verificação sintática dos arquivos JavaScript alterados. A integração real com o banco de dados deve ser validada no ambiente do projeto, pois depende das credenciais e dos dados locais do usuário.
