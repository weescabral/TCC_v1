const db = require('../config/database');

const STATUS_VALIDOS = new Set(['pendente', 'em_andamento', 'concluido', 'cancelado']);
const PRIORIDADES_VALIDAS = new Set(['baixa', 'media', 'alta']);

async function listar(empresaId, filtros = {}) {
  const where = ['a.empresa_id = ?'];
  const params = [empresaId];

  if (filtros.status && STATUS_VALIDOS.has(filtros.status)) {
    where.push('pa.status = ?');
    params.push(filtros.status);
  }

  const [rows] = await db.query(
    `
    SELECT
      pa.*,\n      a.codigo AS auditoria_codigo,\n      a.data_auditoria,\n      s.nome AS setor_nome,\n      c.titulo AS criterio_titulo,\n      u.nome AS responsavel_nome\n    FROM planos_acao pa\n    INNER JOIN auditorias a ON a.id = pa.auditoria_id\n    INNER JOIN setores s ON s.id = pa.setor_id\n    LEFT JOIN criterios_5s c ON c.id = pa.criterio_id\n    LEFT JOIN usuarios u ON u.id = pa.responsavel_id\n    WHERE ${where.join(' AND ')}\n    ORDER BY\n      CASE pa.status\n        WHEN 'pendente' THEN 0\n        WHEN 'em_andamento' THEN 1\n        WHEN 'concluido' THEN 2\n        ELSE 3\n      END,\n      CASE pa.prioridade\n        WHEN 'alta' THEN 0\n        WHEN 'media' THEN 1\n        ELSE 2\n      END,\n      pa.id DESC\n    `,
    params
  );
  return rows;
}

async function buscarPorId(id, empresaId) {
  const [rows] = await db.query(
    `
    SELECT pa.*, a.empresa_id
    FROM planos_acao pa
    INNER JOIN auditorias a ON a.id = pa.auditoria_id
    WHERE pa.id = ? AND a.empresa_id = ?
    LIMIT 1
    `,
    [id, empresaId]
  );
  return rows[0] || null;
}

async function atualizar(id, empresaId, dados) {
  const existente = await buscarPorId(id, empresaId);
  if (!existente) return null;

  const status = dados.status || existente.status;
  const prioridade = dados.prioridade || existente.prioridade;
  const descricao = dados.descricao !== undefined ? String(dados.descricao).trim() : existente.descricao;

  if (!STATUS_VALIDOS.has(status)) {
    const error = new Error('Status de plano de ação inválido.');
    error.status = 400;
    throw error;
  }

  if (!PRIORIDADES_VALIDAS.has(prioridade)) {
    const error = new Error('Prioridade inválida.');
    error.status = 400;
    throw error;
  }

  if (!descricao) {
    const error = new Error('A descrição da ação é obrigatória.');
    error.status = 400;
    throw error;
  }

  await db.query(
    `
    UPDATE planos_acao
    SET descricao = ?,
        prioridade = ?,
        status = ?
    WHERE id = ?
    `,
    [descricao, prioridade, status, id]
  );

  return buscarPorId(id, empresaId);
}

module.exports = { listar, buscarPorId, atualizar, STATUS_VALIDOS, PRIORIDADES_VALIDAS };
