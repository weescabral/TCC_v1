const db = require('../config/database');

async function listar(empresaId) {
  const [rows] = await db.query(
    `SELECT id, empresa_id, nome, descricao, responsavel, localizacao, score_atual, criado_em, ativo
     FROM setores
     WHERE empresa_id = ? AND ativo = TRUE
     ORDER BY nome`,
    [empresaId]
  );
  return rows;
}

async function buscarPorId(id, empresaId) {
  const [rows] = await db.query(
    `SELECT id, empresa_id, nome, descricao, responsavel, localizacao, score_atual, criado_em, ativo
     FROM setores
     WHERE id = ? AND empresa_id = ?
     LIMIT 1`,
    [id, empresaId]
  );
  return rows[0];
}

async function criar(empresaId, dados) {
  const [result] = await db.query(
    `INSERT INTO setores (empresa_id, nome, descricao, responsavel, localizacao)
     VALUES (?, ?, ?, ?, ?)`,
    [empresaId, dados.nome, dados.descricao || null, dados.responsavel || null, dados.localizacao || null]
  );
  return buscarPorId(result.insertId, empresaId);
}

async function atualizar(id, empresaId, dados) {
  await db.query(
    `UPDATE setores
     SET nome = ?, descricao = ?, responsavel = ?, localizacao = ?
     WHERE id = ? AND empresa_id = ?`,
    [dados.nome, dados.descricao || null, dados.responsavel || null, dados.localizacao || null, id, empresaId]
  );
  return buscarPorId(id, empresaId);
}

async function atualizarScore(id, score) {
  await db.query(`UPDATE setores SET score_atual = ? WHERE id = ?`, [score, id]);
}

async function desativar(id, empresaId) {
  await db.query(`UPDATE setores SET ativo = FALSE WHERE id = ? AND empresa_id = ?`, [id, empresaId]);
}

module.exports = { listar, buscarPorId, criar, atualizar, atualizarScore, desativar };
