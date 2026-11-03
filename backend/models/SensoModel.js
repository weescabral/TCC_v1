const db = require('../config/database');

async function listar() {
    const [rows] = await db.query(`
        SELECT
            id,
            codigo,
            nome,
            descricao,
            ordem
        FROM sensos_5s
        ORDER BY ordem
    `);

    return rows;
}

async function buscarPorId(id) {
    const [rows] = await db.query(
        `
        SELECT
            id,
            codigo,
            nome,
            descricao,
            ordem
        FROM sensos_5s
        WHERE id = ?
        LIMIT 1
        `,
        [id]
    );

    return rows[0];
}

module.exports = {
    listar,
    buscarPorId
};