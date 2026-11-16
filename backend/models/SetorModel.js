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
       (
         SELECT a.percentual_geral
         FROM auditorias a
         WHERE a.setor_id = s.id
           AND a.empresa_id = s.empresa_id
           AND a.status = 'finalizada'
         ORDER BY a.data_auditoria DESC, a.id DESC
         LIMIT 1
       ) AS score_atual,
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
       (
         SELECT a.percentual_geral
         FROM auditorias a
         WHERE a.setor_id = s.id
           AND a.empresa_id = s.empresa_id
           AND a.status = 'finalizada'
         ORDER BY a.data_auditoria DESC, a.id DESC
         LIMIT 1
       ) AS score_atual,
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


async function listarInativos(empresaId) {
  const [rows] = await db.query(
    `SELECT
       s.id, s.codigo, s.empresa_id, s.nome, s.descricao, s.responsavel,
       s.localizacao, s.criado_por, s.criado_em, s.auditor_id,
       u.nome AS auditor_nome, u.email AS auditor_email, u.ativo AS auditor_ativo,
       s.periodicidade_auditoria, s.ativo, s.motivo_inativacao, s.inativado_em
     FROM setores s
     LEFT JOIN usuarios u ON u.id = s.auditor_id
     WHERE s.empresa_id = ? AND s.ativo = FALSE
     ORDER BY s.inativado_em DESC, s.nome`,
    [empresaId]
  );
  return rows;
}

async function reativar(id, empresaId) {
  const [result] = await db.query(
    `UPDATE setores
     SET ativo = TRUE, motivo_inativacao = NULL, inativado_em = NULL
     WHERE id = ? AND empresa_id = ? AND ativo = FALSE`,
    [id, empresaId]
  );
  return result.affectedRows > 0 ? buscarPorId(id, empresaId) : null;
}


async function excluirDefinitivamente(id, empresaId) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [setores] = await connection.query(
      `SELECT id, ativo
       FROM setores
       WHERE id = ? AND empresa_id = ?
       FOR UPDATE`,
      [id, empresaId]
    );

    if (!setores.length) {
      await connection.rollback();
      return { excluido: false, motivo: 'nao_encontrado' };
    }

    if (Boolean(setores[0].ativo)) {
      await connection.rollback();
      return { excluido: false, motivo: 'setor_ativo' };
    }

    const [[contagem]] = await connection.query(
      `SELECT COUNT(*) AS total
       FROM auditorias
       WHERE setor_id = ? AND empresa_id = ?`,
      [id, empresaId]
    );
    const totalAuditorias = Number(contagem.total || 0);

    if (totalAuditorias > 0) {
      await connection.rollback();
      return { excluido: false, motivo: 'possui_historico', totalAuditorias };
    }

    const [resultado] = await connection.query(
      `DELETE FROM setores
       WHERE id = ? AND empresa_id = ? AND ativo = FALSE`,
      [id, empresaId]
    );

    if (!resultado.affectedRows) {
      await connection.rollback();
      return { excluido: false, motivo: 'nao_excluido' };
    }

    await connection.commit();
    return { excluido: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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


async function historico(id, empresaId) {
  const setor = await buscarPorId(id, empresaId);
  if (!setor) return null;

  const [auditorias] = await db.query(
    `SELECT id, codigo, data_auditoria, percentual_geral, classificacao
     FROM auditorias
     WHERE setor_id = ? AND empresa_id = ? AND status = 'finalizada'
     ORDER BY data_auditoria ASC, id ASC`,
    [id, empresaId]
  );

  const [sensos] = await db.query(
    `SELECT a.id AS auditoria_id, s.codigo AS senso, s.nome,
       (SUM(r.nota * COALESCE(r.peso_aplicado, c.peso, 1)) /
        NULLIF(SUM(5 * COALESCE(r.peso_aplicado, c.peso, 1)), 0)) * 100 AS media
     FROM auditorias a
     INNER JOIN respostas_auditoria r ON r.auditoria_id = a.id
     INNER JOIN criterios_5s c ON c.id = r.criterio_id
     INNER JOIN sensos_5s s ON s.id = c.senso_id
     WHERE a.setor_id = ? AND a.empresa_id = ? AND a.status = 'finalizada'
     GROUP BY a.id, s.id, s.codigo, s.nome, s.ordem
     ORDER BY a.data_auditoria ASC, a.id ASC, s.ordem`,
    [id, empresaId]
  );

  const [[planos]] = await db.query(
    `SELECT COUNT(*) AS total,
       SUM(pa.status = 'concluido') AS concluidos,
       SUM(pa.status NOT IN ('concluido','cancelado')) AS pendentes
     FROM planos_acao pa
     INNER JOIN auditorias a ON a.id = pa.auditoria_id
     WHERE a.setor_id = ? AND a.empresa_id = ?`,
    [id, empresaId]
  );

  return { setor, auditorias, sensos, planos: {
    total: Number(planos.total || 0),
    concluidos: Number(planos.concluidos || 0),
    pendentes: Number(planos.pendentes || 0)
  }};
}

module.exports = {
  listar,
  historico,
  listarInativos,
  reativar,
  excluirDefinitivamente,
  buscarPorId,
  criar,
  atualizar,
  atualizarScore,
  desativar,
  listarAuditores,
  contarAtivosPorAuditor,
};
