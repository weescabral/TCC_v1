const db = require('../config/database');

async function validarContexto(auditoriaId, respostaId, empresaId) {
  const [rows] = await db.query(
    `
    SELECT
      a.id AS auditoria_id,
      r.id AS resposta_id
    FROM auditorias a
    LEFT JOIN respostas_auditoria r
      ON r.auditoria_id = a.id
     AND r.id = ?
    WHERE a.id = ?
      AND a.empresa_id = ?
    LIMIT 1
    `,
    [respostaId || null, auditoriaId, empresaId]
  );

  const contexto = rows[0];
  if (!contexto) return null;
  if (respostaId && !contexto.resposta_id) return null;
  return contexto;
}

async function listarPorAuditoria(auditoriaId, empresaId) {
  const [rows] = await db.query(
    `
    SELECT
      e.id,
      e.auditoria_id,
      e.resposta_id,
      e.criado_por,
      e.nome_original,
      e.nome_arquivo,
      e.caminho,
      e.mime_type,
      e.tamanho_bytes,
      e.descricao,
      e.criado_em
    FROM evidencias_auditoria e
    INNER JOIN auditorias a
      ON a.id = e.auditoria_id
    WHERE e.auditoria_id = ?
      AND a.empresa_id = ?
    ORDER BY e.criado_em ASC, e.id ASC
    `,
    [auditoriaId, empresaId]
  );
  return rows;
}

async function criar({
  auditoriaId,
  respostaId,
  usuarioId,
  nomeOriginal,
  nomeArquivo,
  caminho,
  mimeType,
  tamanhoBytes,
  descricao,
}) {
  const [result] = await db.query(
    `
    INSERT INTO evidencias_auditoria
    (
      auditoria_id,
      resposta_id,
      criado_por,
      nome_original,
      nome_arquivo,
      caminho,
      mime_type,
      tamanho_bytes,
      descricao
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      auditoriaId,
      respostaId || null,
      usuarioId,
      nomeOriginal,
      nomeArquivo,
      caminho,
      mimeType || null,
      tamanhoBytes || null,
      descricao || null,
    ]
  );

  const [[evidencia]] = await db.query(
    `SELECT * FROM evidencias_auditoria WHERE id = ? LIMIT 1`,
    [result.insertId]
  );

  return evidencia;
}

async function remover(id, auditoriaId, empresaId) {
  const [rows] = await db.query(
    `
    SELECT e.*
    FROM evidencias_auditoria e
    INNER JOIN auditorias a
      ON a.id = e.auditoria_id
    WHERE e.id = ?
      AND e.auditoria_id = ?
      AND a.empresa_id = ?
    LIMIT 1
    `,
    [id, auditoriaId, empresaId]
  );

  if (!rows[0]) return null;

  await db.query(
    `DELETE FROM evidencias_auditoria WHERE id = ?`,
    [id]
  );

  return rows[0];
}

module.exports = {
  validarContexto,
  listarPorAuditoria,
  criar,
  remover,
};
