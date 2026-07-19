require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const db = require('./config/database');
const routes = require('./routes');
const errorMiddleware = require('./middlewares/errorMiddleware');

const app = express();

app.use(cors());
app.use(express.json());

app.use(
    '/uploads',
    express.static(path.join(__dirname, 'uploads'))
);

app.get('/', (req, res) => {
    return res.status(200).json({
        sistema: 'Sensus 5S',
        arquitetura: 'MVC - Express + MySQL',
        status: 'Online'
    });
});

app.get('/teste-banco', async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT NOW() AS horario
        `);

        return res.status(200).json({
            conectado: true,
            banco: process.env.DB_DATABASE,
            horario: rows[0].horario
        });
    } catch (error) {
        return next(error);
    }
});

app.use('/api', routes);

// Deve permanecer depois de todas as rotas
app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
    try {
        await db.query('SELECT 1');

        console.log('✅ Banco conectado com sucesso!');

        app.listen(PORT, () => {
            console.log(
                `🚀 Servidor iniciado em http://localhost:${PORT}`
            );
        });
    } catch (error) {
        console.error(
            '❌ Não foi possível iniciar o servidor:',
            error.message
        );

        process.exit(1);
    }
}

iniciarServidor();