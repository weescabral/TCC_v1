# Backend Sensus 3.0

## Como rodar

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

No arquivo `.env`, coloque a senha do MySQL.

## Teste rápido

Abra:

```txt
http://localhost:3000/teste-banco
```

## Fluxo inicial

1. Registrar empresa e administrador: `POST /api/auth/registrar`
2. Fazer login: `POST /api/auth/login`
3. Copiar o token JWT.
4. Nas outras rotas, usar header:

```txt
Authorization: Bearer SEU_TOKEN
```

## Rotas principais

- `POST /api/auth/registrar`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/empresas`
- `GET /api/usuarios`
- `GET /api/setores`
- `GET /api/5s/sensos`
- `GET /api/5s/criterios`
- `POST /api/auditorias`
- `POST /api/auditorias/:id/respostas`
- `POST /api/auditorias/:id/finalizar`
- `GET /api/dashboard/resumo`

## Migrações

As alterações estruturais do sistema ficam em `backend/database/migrations/`.

Para a primeira fase das melhorias, execute no MySQL/Railway:

`001_melhorias_setores_auditores.sql`

Ela adiciona código do setor, responsável pelo cadastro, auditor responsável, periodicidade, histórico de inativação, dados de prazo/execução da auditoria e a tabela de evidências.
