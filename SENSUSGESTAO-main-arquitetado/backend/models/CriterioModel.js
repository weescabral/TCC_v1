const db = require('../config/database');

async function listar() {
    const [rows] = await db.query(`
        SELECT
            c.id,
            c.senso_id,
            s.codigo AS senso,
            s.nome AS nome_senso,
            c.titulo,
            c.objetivo,
            c.peso,
            c.ordem,
            c.ativo,
            c.criado_em,
            c.atualizado_em
        FROM criterios_5s c
        INNER JOIN sensos_5s s
            ON s.id = c.senso_id
        WHERE c.ativo = TRUE
        ORDER BY
            s.ordem,
            c.ordem
    `);

    return rows;
}

async function listarPorSenso(sensoId) {
    const [rows] = await db.query(
        `
        SELECT
            c.id,
            c.senso_id,
            s.codigo AS senso,
            s.nome AS nome_senso,
            c.titulo,
            c.objetivo,
            c.peso,
            c.ordem,
            c.ativo,
            c.criado_em,
            c.atualizado_em
        FROM criterios_5s c
        INNER JOIN sensos_5s s
            ON s.id = c.senso_id
        WHERE c.ativo = TRUE
          AND c.senso_id = ?
        ORDER BY c.ordem
        `,
        [sensoId]
    );

    return rows;
}

async function buscarPorId(id) {
    const [rows] = await db.query(
        `
        SELECT
            c.id,
            c.senso_id,
            s.codigo AS senso,
            s.nome AS nome_senso,
            c.titulo,
            c.objetivo,
            c.peso,
            c.ordem,
            c.ativo,
            c.criado_em,
            c.atualizado_em
        FROM criterios_5s c
        INNER JOIN sensos_5s s
            ON s.id = c.senso_id
        WHERE c.id = ?
        LIMIT 1
        `,
        [id]
    );

    return rows[0];
}

async function criar(dados) {
    const [result] = await db.query(
        `
        INSERT INTO criterios_5s
        (
            senso_id,
            titulo,
            objetivo,
            peso,
            ordem
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
            dados.senso_id,
            dados.titulo,
            dados.objetivo || null,
            dados.peso ?? 1,
            dados.ordem
        ]
    );

    return buscarPorId(result.insertId);
}

async function atualizar(id, dados) {
    await db.query(
        `
        UPDATE criterios_5s
        SET
            senso_id = ?,
            titulo = ?,
            objetivo = ?,
            peso = ?,
            ordem = ?
        WHERE id = ?
        `,
        [
            dados.senso_id,
            dados.titulo,
            dados.objetivo || null,
            dados.peso ?? 1,
            dados.ordem,
            id
        ]
    );

    return buscarPorId(id);
}

async function desativar(id) {
    await db.query(
        `
        UPDATE criterios_5s
        SET ativo = FALSE
        WHERE id = ?
        `,
        [id]
    );
}

module.exports = {
    listar,
    listarPorSenso,
    buscarPorId,
    criar,
    atualizar,
    desativar
};