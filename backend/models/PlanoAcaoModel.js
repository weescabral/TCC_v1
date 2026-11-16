const db = require('../config/database');

const STATUS_VALIDOS = new Set(['pendente', 'em_andamento', 'concluido', 'cancelado']);
const PRIORIDADES_VALIDAS = new Set(['baixa', 'media', 'alta']);

async function listar(empresaId, filtros = {}, usuario = null) {
  const where = ['a.empresa_id = ?'];
  const params = [empresaId];

  if (usuario?.perfil === 'auditor') { where.push('s.auditor_id = ?'); params.push(usuario.id); }
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
      pa.*,
      a.codigo AS auditoria_codigo,
      a.data_auditoria,
      s.nome AS setor_nome,
      c.titulo AS criterio_titulo,
      u.nome AS responsavel_nome,
      plano_anterior.id AS plano_anterior_id,
      plano_anterior.status AS plano_anterior_status,
      plano_anterior.auditoria_codigo AS plano_anterior_auditoria_codigo,
      plano_anterior.data_auditoria AS plano_anterior_data_auditoria,
      CASE WHEN plano_anterior.id IS NULL THEN 0 ELSE 1 END AS recorrente,
      resumo_auditoria.total AS auditoria_total_planos,
      resumo_auditoria.pendentes AS auditoria_planos_pendentes,
      resumo_auditoria.em_andamento AS auditoria_planos_em_andamento,
      resumo_auditoria.concluidos AS auditoria_planos_concluidos,
      resumo_auditoria.cancelados AS auditoria_planos_cancelados,
      resumo_auditoria.atrasados AS auditoria_planos_atrasados,
      DATEDIFF(pa.prazo_conclusao, CURDATE()) AS dias_restantes,
      CASE WHEN pa.prazo_conclusao < CURDATE() AND pa.status NOT IN ('concluido','cancelado') THEN 1 ELSE 0 END AS atrasado
    FROM planos_acao pa
    INNER JOIN auditorias a ON a.id = pa.auditoria_id
    INNER JOIN setores s ON s.id = pa.setor_id
    LEFT JOIN criterios_5s c ON c.id = pa.criterio_id
    LEFT JOIN usuarios u ON u.id = pa.responsavel_id
    LEFT JOIN (
      SELECT pa_ant.id, pa_ant.setor_id, pa_ant.criterio_id, pa_ant.status,
             a_ant.codigo AS auditoria_codigo, a_ant.data_auditoria
      FROM planos_acao pa_ant
      INNER JOIN auditorias a_ant ON a_ant.id = pa_ant.auditoria_id
    ) plano_anterior ON plano_anterior.id = (
      SELECT MAX(pa_prev.id)
      FROM planos_acao pa_prev
      WHERE pa_prev.setor_id = pa.setor_id
        AND pa_prev.criterio_id = pa.criterio_id
        AND pa_prev.auditoria_id <> pa.auditoria_id
        AND pa_prev.id < pa.id
    )
    LEFT JOIN (
      SELECT auditoria_id, COUNT(*) AS total,
             SUM(status = 'pendente') AS pendentes,
             SUM(status = 'em_andamento') AS em_andamento,
             SUM(status = 'concluido') AS concluidos,
             SUM(status = 'cancelado') AS cancelados,
             SUM(status NOT IN ('concluido','cancelado') AND prazo_conclusao < CURDATE()) AS atrasados
      FROM planos_acao
      GROUP BY auditoria_id
    ) resumo_auditoria ON resumo_auditoria.auditoria_id = pa.auditoria_id
    WHERE ${where.join(' AND ')}
    ORDER BY
      CASE pa.status
        WHEN 'pendente' THEN 0
        WHEN 'em_andamento' THEN 1
        WHEN 'concluido' THEN 2
        ELSE 3
      END,
      CASE pa.prioridade
        WHEN 'alta' THEN 0
        WHEN 'media' THEN 1
        ELSE 2
      END,
      pa.id DESC
    `,
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

async function resumo(empresaId, usuario = null) {
  const filtroAuditor = usuario?.perfil === 'auditor' ? ' AND s.auditor_id = ?' : '';
  const params = usuario?.perfil === 'auditor' ? [empresaId, usuario.id] : [empresaId];
  const [[row]] = await db.query(`SELECT COUNT(*) total, SUM(pa.status='pendente') pendentes, SUM(pa.status='em_andamento') em_andamento, SUM(pa.status='concluido') concluidos, SUM(pa.status='cancelado') cancelados, SUM(pa.status NOT IN ('concluido','cancelado') AND pa.prazo_conclusao < CURDATE()) atrasados FROM planos_acao pa INNER JOIN auditorias a ON a.id=pa.auditoria_id INNER JOIN setores s ON s.id=pa.setor_id WHERE a.empresa_id=?${filtroAuditor}`, params);
  const resumo = Object.fromEntries(Object.entries(row).map(([k,v]) => [k, Number(v || 0)]));
  const baseValida = Math.max(0, resumo.total - resumo.cancelados);
  resumo.progresso = baseValida ? Number(((resumo.concluidos / baseValida) * 100).toFixed(1)) : 0;
  return resumo;
}

module.exports = { listar, buscarPorId, atualizar, resumo, STATUS_VALIDOS, PRIORIDADES_VALIDAS };
