# Cadastro público e recuperação de senha — Sensus 5S

## O que foi incluído
- Cadastro público de uma nova empresa e de seu primeiro usuário administrador na própria página inicial.
- O cadastro público sempre cria perfil `administrador`; o navegador não pode escolher perfil de auditor.
- Validação de e-mail, senha mínima de 8 caracteres e confirmação no frontend.
- Recuperação com token aleatório de uso único, armazenado somente como hash SHA-256 e válido por 30 minutos.
- Resposta genérica para não revelar se um e-mail está cadastrado.
- Redefinição da senha com bcrypt e invalidação dos tokens anteriores do usuário.

## Passos obrigatórios
1. Faça backup do banco de dados.
2. Execute uma única vez `backend/database/migrations/004_recuperacao_senha.sql` no banco usado pelo Sensus 5S.
3. No diretório `backend`, execute `npm install` para instalar a dependência Nodemailer adicionada ao `package.json`.
4. Configure no `backend/.env` os campos `FRONTEND_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` e `SMTP_FROM`. Use senha de aplicativo do provedor de e-mail, nunca a senha pessoal da caixa postal.
5. Reinicie o backend.

`FRONTEND_URL` deve ser a origem pública do frontend. Exemplo com Live Server: `http://localhost:5500`. O link enviado será `FRONTEND_URL/index.html?token=...`. Em produção, use HTTPS e o endereço real publicado.

## Endpoints públicos
- `POST /api/auth/registrar` — recebe `{ empresa: { nome }, usuario: { nome, email, senha } }`.
- `POST /api/auth/recuperar-senha` — recebe `{ email }`.
- `POST /api/auth/redefinir-senha` — recebe `{ token, senha }`.

## Observações de segurança
- Não foi ativado login com Google: isso exigiria configuração OAuth própria e não havia credenciais no projeto.
- A recuperação por e-mail só envia mensagens depois de configurar SMTP. Sem SMTP, o endpoint não envia e-mail; configure antes de disponibilizar o recurso aos usuários.
- Em produção, configure limitação de tentativas (rate limiting), HTTPS e uma política de cadastro público conforme a operação da empresa.
