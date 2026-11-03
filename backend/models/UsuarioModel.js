const db = require('../config/database');

async function listarPorEmpresa(empresaId) {
  const [rows] = await db.query(
    `SELECT id, empresa_id, nome, email, perfil, ativo, motivo_inativacao, inativado_em, criado_em
     FROM usuarios
     WHERE empresa_id = ? AND ativo = TRUE
     ORDER BY nome`,
    [empresaId]
  );
  return rows;
}

async function buscarPorId(id, empresaId) {
  const [rows] = await db.query(
    `SELECT id, empresa_id, nome, email, perfil, ativo, motivo_inativacao, inativado_em, criado_em
     FROM usuarios
     WHERE id = ? AND empresa_id = ?
     LIMIT 1`,
    [id, empresaId]
  );
  return rows[0];
}

async function criar({ empresa_id, nome, email, senhaHash, perfil }) {
  const [result] = await db.query(
    `INSERT INTO usuarios (empresa_id, nome, email, senha, perfil)
     VALUES (?, ?, ?, ?, ?)`,
    [empresa_id, nome, email, senhaHash, perfil || 'auditor']
  );
  return buscarPorId(result.insertId, empresa_id);
}

async function atualizar(id, empresaId, dados) {
  await db.query(
    `UPDATE usuarios SET nome = ?, email = ?, perfil = ?
     WHERE id = ? AND empresa_id = ?`,
    [dados.nome, dados.email, dados.perfil || 'auditor', id, empresaId]
  );
  return buscarPorId(id, empresaId);
}

async function trocarSenha(id, empresaId, senhaHash) {
  await db.query(`UPDATE usuarios SET senha = ? WHERE id = ? AND empresa_id = ?`, [senhaHash, id, empresaId]);
}

async function desativar(id, empresaId, motivo) {
  await db.query(
    `UPDATE usuarios
     SET ativo = FALSE, motivo_inativacao = ?, inativado_em = NOW()
     WHERE id = ? AND empresa_id = ?`,
    [motivo, id, empresaId]
  );
}

module.exports = { listarPorEmpresa, buscarPorId, criar, atualizar, trocarSenha, desativar };
