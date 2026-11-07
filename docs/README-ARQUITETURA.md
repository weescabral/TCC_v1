# Sensus 3.0 - Arquitetura aplicada

Este pacote contém o frontend. Já o backend tem uma estrutura MVC em Node.js + Express + MySQL.

## Estrutura

```txt
backend/
  config/
  controllers/
  middlewares/
  models/
  routes/
  services/
  uploads/
  utils/
  server.js
frontend/
  index.html
  pages/
  css/
  js/
```

## Rodar backend

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Edite o `.env` e coloque sua senha do MySQL.

## Testar banco

```txt
http://localhost:3000/teste-banco
```

## Primeiro cadastro pelo Postman/Insomnia

POST `http://localhost:3000/api/auth/registrar`

```json
{
  "empresa": {
    "nome": "Mercadinho Central",
    "cnpj": "12.345.678/0001-90",
    "telefone": "(98) 99999-9999",
    "email": "contato@mercado.com",
    "endereco": "Rua A, Centro"
  },
  "usuario": {
    "nome": "Administrador",
    "email": "admin@sensus.com",
    "senha": "123456",
    "perfil": "administrador"
  }
}
```

Depois faça login em POST `/api/auth/login`.
