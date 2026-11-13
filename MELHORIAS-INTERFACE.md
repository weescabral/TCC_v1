# Melhorias de interface — Sensus 5S

Foram aplicadas melhorias de experiência do usuário sem alterações nas regras de negócio ou no banco de dados:

1. **Diagnóstico executivo:** estado vazio mais amigável para empresas sem auditorias concluídas; mensagens técnicas de exceção não são mais exibidas no painel.
2. **Gráficos do dashboard:** callbacks do gráfico de evolução protegidos contra pontos ainda não disponíveis, evitando leitura de `y` indefinido.
3. **Notificações:** os `alert()` existentes passam a usar notificações visuais próprias do Sensus 5S, com classificação automática de sucesso, atenção, erro e informação.
4. **Acesso:** o botão do cabeçalho da página inicial rola até o formulário de login e direciona o foco ao campo de e-mail.
5. **Suporte:** o item abre um popover com o endereço `sensusgestao@gmail.com`, selecionável e com ação para copiar.

## Arquivos principais alterados

- `frontend/index.html`
- `frontend/js/auth.js`
- `frontend/js/components.js`
- `frontend/js/dashboard.js`
- `frontend/pages/dashboard.html`
- `frontend/css/login.css`
- `frontend/css/styles.css`

## Observações

- Não houve alteração no banco de dados nem nos cálculos da metodologia 5S.
- O arquivo `backend/.env` e a pasta `.git` não fazem parte deste pacote por segurança.
- Os arquivos JavaScript do frontend passaram pela verificação sintática `node --check`.
