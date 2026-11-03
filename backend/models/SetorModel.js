const db = require('../config/database');

async function listar(empresaId, usuario = null) {
  const [rows] = await db.query(
    `SELECT
       s.id,
       s.codigo,
       s.empresa_id,
       s.nome,
       s.descricao,
       s.responsavel,
       s.localizacao,
       s.score_atual,
       s.criado_por,
       s.criado_em,
       s.auditor_id,
       u.nome AS auditor_nome,
       u.email AS auditor_email,
       s.periodicidade_auditoria,
       s.ativo,
       s.motivo_inativacao,
       s.inativado_em
     FROM setores s
     LEFT JOIN usuarios u ON u.id = s.auditor_id
     WHERE s.empresa_id = ?
       AND s.ativo = TRUE
       AND (? IN ('administrador', 'gestor') OR s.auditor_id = ?)
     ORDER BY s.nome`,
    [empresaId, usuario?.perfil || 'auditor', usuario?.id || 0]
  );
  return rows;
}

async function buscarPorId(id, empresaId, incluirInativos = true) {
  const [rows] = await db.query(
    `SELECT
       s.id,
       s.codigo,
       s.empresa_id,
       s.nome,
       s.descricao,
       s.responsavel,
       s.localizacao,
       s.score_atual,
       s.criado_por,
       s.criado_em,
       s.auditor_id,
       u.nome AS auditor_nome,
       u.email AS auditor_email,
       s.periodicidade_auditoria,
       s.ativo,
       s.motivo_inativacao,
       s.inativado_em
     FROM setores s
     LEFT JOIN usuarios u ON u.id = s.auditor_id
     WHERE s.id = ?
       AND s.empresa_id = ?
       ${incluirInativos ? '' : 'AND s.ativo = TRUE'}
     LIMIT 1`,
    [id, empresaId]
  );
  return rows[0];
}

async function criar(empresaId, dados) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const codigo = dados.codigo || `SET-${empresaId}-${dados.criado_por}-${Date.now()}`;

    const [result] = await connection.query(
      `INSERT INTO setores
        (codigo, empresa_id, criado_por, auditor_id, nome, descricao, responsavel, localizacao, periodicidade_auditoria)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigo,
        empresaId,
        dados.criado_por,
        dados.auditor_id,
        dados.nome,
        dados.descricao || null,
        dados.responsavel || null,
        dados.localizacao || null,
        dados.periodicidade_auditoria || 'mensal'
      ]
    );

    await connection.commit();
    return buscarPorId(result.insertId, empresaId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function atualizar(id, empresaId, dados) {
  await db.query(
    `UPDATE setores
     SET nome = ?,
         descricao = ?,
         responsavel = ?,
         localizacao = ?,
         auditor_id = ?,
         periodicidade_auditoria = ?
     WHERE id = ? AND empresa_id = ? AND ativo = TRUE`,
    [
      dados.nome,
      dados.descricao || null,
      dados.responsavel || null,
      dados.localizacao || null,
      dados.auditor_id,
      dados.periodicidade_auditoria || 'mensal',
      id,
      empresaId
    ]
  );

  return buscarPorId(id, empresaId);
}

async function atualizarScore(id, score) {
  await db.query(`UPDATE setores SET score_atual = ? WHERE id = ?`, [score, id]);
}

async function desativar(id, empresaId, motivo) {
  await db.query(
    `UPDATE setores
     SET ativo = FALSE,
         motivo_inativacao = ?,
         inativado_em = NOW()
     WHERE id = ? AND empresa_id = ?`,
    [motivo, id, empresaId]
  );
}

async function listarAuditores(empresaId) {
  const [rows] = await db.query(
    `SELECT id, nome, email, perfil
     FROM usuarios
     WHERE empresa_id = ?
       AND ativo = TRUE
       AND perfil IN ('auditor', 'administrador')
     ORDER BY nome`,
    [empresaId]
  );

  return rows;
}

async function contarAtivosPorAuditor(auditorId, empresaId) {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM setores
     WHERE empresa_id = ?
       AND auditor_id = ?
       AND ativo = TRUE`,
    [empresaId, auditorId]
  );

  return Number(row.total || 0);
}

module.exports = {
  listar,
  buscarPorId,
  criar,
  atualizar,
  atualizarScore,
  desativar,
  listarAuditores,
  contarAtivosPorAuditor,
};
