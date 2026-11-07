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
  if (filtros.setor_id) { where.push('pa.setor_id = ?'); params.push(Number(filtros.setor_id)); }
  if (filtros.prioridade && PRIORIDADES_VALIDAS.has(filtros.prioridade)) { where.push('pa.prioridade = ?'); params.push(filtros.prioridade); }
  if (filtros.prazo === 'atrasado') where.push("pa.prazo_conclusao < CURDATE() AND pa.status NOT IN ('concluido','cancelado')");
  if (filtros.prazo === 'sem_prazo') where.push('pa.prazo_conclusao IS NULL');

  const [rows] = await db.query(
    `
    SELECT
      pa.*,\n      a.codigo AS auditoria_codigo,\n      a.data_auditoria,\n      s.nome AS setor_nome,\n      c.titulo AS criterio_titulo,\n      u.nome AS responsavel_nome,
      DATEDIFF(pa.prazo_conclusao, CURDATE()) AS dias_restantes,
      CASE WHEN pa.prazo_conclusao < CURDATE() AND pa.status NOT IN ('concluido','cancelado') THEN 1 ELSE 0 END AS atrasado\n    FROM planos_acao pa\n    INNER JOIN auditorias a ON a.id = pa.auditoria_id\n    INNER JOIN setores s ON s.id = pa.setor_id\n    LEFT JOIN criterios_5s c ON c.id = pa.criterio_id\n    LEFT JOIN usuarios u ON u.id = pa.responsavel_id\n    WHERE ${where.join(' AND ')}\n    ORDER BY\n      CASE pa.status\n        WHEN 'pendente' THEN 0\n        WHEN 'em_andamento' THEN 1\n        WHEN 'concluido' THEN 2\n        ELSE 3\n      END,\n      CASE pa.prioridade\n        WHEN 'alta' THEN 0\n        WHEN 'media' THEN 1\n        ELSE 2\n      END,\n      pa.id DESC\n    `,
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
  const prazoConclusao = dados.prazo_conclusao !== undefined ? (dados.prazo_conclusao || null) : existente.prazo_conclusao;
  const causaRaiz = dados.causa_raiz !== undefined ? String(dados.causa_raiz || '').trim() : existente.causa_raiz;
  const resultadoEsperado = dados.resultado_esperado !== undefined ? String(dados.resultado_esperado || '').trim() : existente.resultado_esperado;
  const responsavelId = dados.responsavel_id !== undefined ? (dados.responsavel_id || null) : existente.responsavel_id;
  if (prazoConclusao && !/^\d{4}-\d{2}-\d{2}$/.test(String(prazoConclusao))) { const error = new Error('Informe um prazo válido.'); error.status = 400; throw error; }

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
    SET descricao = ?, prioridade = ?, status = ?, prazo_conclusao = ?,
        causa_raiz = ?, resultado_esperado = ?, responsavel_id = ?, atualizado_em = NOW()
    WHERE id = ?
    `,
    [descricao, prioridade, status, prazoConclusao, causaRaiz, resultadoEsperado, responsavelId, id]
  );

  return buscarPorId(id, empresaId);
}

async function resumo(empresaId) {
  const [[row]] = await db.query(`SELECT COUNT(*) total, SUM(pa.status='pendente') pendentes, SUM(pa.status='em_andamento') em_andamento, SUM(pa.status='concluido') concluidos, SUM(pa.status NOT IN ('concluido','cancelado') AND pa.prazo_conclusao < CURDATE()) atrasados FROM planos_acao pa INNER JOIN auditorias a ON a.id=pa.auditoria_id WHERE a.empresa_id=?`, [empresaId]);
  return Object.fromEntries(Object.entries(row).map(([k,v]) => [k, Number(v || 0)]));
}

module.exports = { listar, buscarPorId, atualizar, resumo, STATUS_VALIDOS, PRIORIDADES_VALIDAS };
