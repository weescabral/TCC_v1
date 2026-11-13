const db = require('../config/database');

async function listarPorEmpresa(empresaId, status = 'ativos') {
  const [rows] = await db.query(
    `SELECT u.id, u.empresa_id, u.nome, u.email, u.perfil, u.ativo, u.motivo_inativacao, u.inativado_em, u.criado_em,
            (SELECT COUNT(*) FROM setores s WHERE s.auditor_id = u.id AND s.empresa_id = u.empresa_id AND s.ativo = TRUE) AS setores_atribuidos
     FROM usuarios u
     WHERE u.empresa_id = ? AND u.ativo = ?
     ORDER BY u.nome`,
    [empresaId, status === 'inativos' ? 0 : 1]
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


async function reativar(id, empresaId) {
  const [result] = await db.query(
    `UPDATE usuarios
     SET ativo = TRUE, motivo_inativacao = NULL, inativado_em = NULL
     WHERE id = ? AND empresa_id = ? AND ativo = FALSE AND perfil = 'auditor'`,
    [id, empresaId]
  );
  return result.affectedRows > 0 ? buscarPorId(id, empresaId) : null;
}

module.exports = { listarPorEmpresa, buscarPorId, criar, atualizar, trocarSenha, desativar, reativar };
