const db = require('../config/database');
const AuditoriaModel = require('./AuditoriaModel');
const DashboardModel = require('./DashboardModel');

function filtroAuditor(usuario, alias = 's') {
  return usuario?.perfil === 'auditor' ? ` AND ${alias}.auditor_id = ? ` : '';
}

async function buscarAuditoria(id, empresaId, usuario) {
  const auditoria = await AuditoriaModel.buscarPorId(id, empresaId);
  if (!auditoria) return null;
  if (usuario?.perfil === 'auditor' && Number(auditoria.setor_auditor_id) !== Number(usuario.id)) {
    const error = new Error('Você não possui acesso a esta auditoria.');
    error.status = 403;
    throw error;
  }
  if (auditoria.status !== 'finalizada') {
    const error = new Error('Somente auditorias finalizadas podem gerar relatório oficial.');
    error.status = 409;
    throw error;
  }
  return auditoria;
}

async function opcoes(empresaId, usuario) {
  const filtro = filtroAuditor(usuario);
  const params = usuario?.perfil === 'auditor' ? [empresaId, usuario.id] : [empresaId];
  const [setores] = await db.query(
    `SELECT s.id, s.nome FROM setores s WHERE s.empresa_id = ? AND s.ativo = TRUE ${filtro} ORDER BY s.nome`,
    params
  );
  const filtroA = usuario?.perfil === 'auditor' ? ' AND s.auditor_id = ? ' : '';
  const paramsA = usuario?.perfil === 'auditor' ? [empresaId, usuario.id] : [empresaId];
  const [auditorias] = await db.query(
    `SELECT a.id, a.codigo, a.data_auditoria, s.nome AS setor_nome
     FROM auditorias a INNER JOIN setores s ON s.id=a.setor_id
     WHERE a.empresa_id=? AND a.status='finalizada' ${filtroA}
     ORDER BY a.data_auditoria DESC, a.id DESC LIMIT 300`,
    paramsA
  );
  return { setores, auditorias };
}

async function porSetor(empresaId, setorId, inicio, fim, usuario) {
  const filtro = usuario?.perfil === 'auditor' ? ' AND s.auditor_id = ? ' : '';
  const params = [Number(setorId), empresaId];
  if (usuario?.perfil === 'auditor') params.push(usuario.id);
  const [[setor]] = await db.query(
    `SELECT s.id, s.nome, s.descricao, s.periodicidade_auditoria, u.nome AS auditor_responsavel
     FROM setores s LEFT JOIN usuarios u ON u.id=s.auditor_id
     WHERE s.id=? AND s.empresa_id=? ${filtro} LIMIT 1`, params
  );
  if (!setor) {
    const error = new Error('Setor não encontrado ou sem permissão.');
    error.status = 404;
    throw error;
  }
  const paramsA = [empresaId, Number(setorId)];
  let periodo = '';
  if (inicio) { periodo += ' AND a.data_auditoria >= ?'; paramsA.push(inicio); }
  if (fim) { periodo += ' AND a.data_auditoria < DATE_ADD(?, INTERVAL 1 DAY)'; paramsA.push(fim); }
  const [auditorias] = await db.query(
    `SELECT a.id, a.codigo, a.data_auditoria, a.finalizada_em, a.percentual_geral, a.classificacao, a.tipo, u.nome AS auditor_nome
     FROM auditorias a INNER JOIN usuarios u ON u.id=a.usuario_id
     WHERE a.empresa_id=? AND a.setor_id=? AND a.status='finalizada' ${periodo}
     ORDER BY a.data_auditoria DESC, a.id DESC`, paramsA
  );
  const [planos] = await db.query(
    `SELECT pa.id, pa.descricao, pa.status, pa.prioridade, pa.prazo_conclusao,
            pa.causa_raiz, pa.resultado_esperado, u.nome AS responsavel_nome, a.codigo AS auditoria_codigo
     FROM planos_acao pa INNER JOIN auditorias a ON a.id=pa.auditoria_id
     LEFT JOIN usuarios u ON u.id=pa.responsavel_id
     WHERE a.empresa_id=? AND a.setor_id=? AND a.status='finalizada' ${periodo.replaceAll('a.data_auditoria','a.data_auditoria')}
     ORDER BY pa.id DESC`, paramsA
  );
  const media = auditorias.length
    ? auditorias.reduce((s, a) => s + Number(a.percentual_geral || 0), 0) / auditorias.length : 0;
  return { setor, auditorias, planos, indicadores: { totalAuditorias: auditorias.length, media: Number(media.toFixed(2)), ultimoScore: auditorias[0]?.percentual_geral ?? null } };
}

async function gerencial(empresaId) {
  const [[empresa]] = await db.query(
    'SELECT nome, cnpj, email, telefone, endereco FROM empresas WHERE id=? LIMIT 1', [empresaId]
  );
  const dashboard = await DashboardModel.resumo(empresaId);
  const [auditoriasRecentes] = await db.query(
    `SELECT a.codigo, a.data_auditoria, a.percentual_geral, s.nome AS setor_nome, u.nome AS auditor_nome
     FROM auditorias a INNER JOIN setores s ON s.id=a.setor_id INNER JOIN usuarios u ON u.id=a.usuario_id
     WHERE a.empresa_id=? AND a.status='finalizada'
     ORDER BY a.data_auditoria DESC, a.id DESC LIMIT 20`, [empresaId]
  );
  const [planos] = await db.query(
    `SELECT pa.status, pa.prioridade, COUNT(*) AS total
     FROM planos_acao pa INNER JOIN auditorias a ON a.id=pa.auditoria_id
     WHERE a.empresa_id=? AND a.status='finalizada' GROUP BY pa.status, pa.prioridade`, [empresaId]
  );
  return { empresa, dashboard, auditoriasRecentes, planos };
}

async function periodico(empresaId, inicio, fim, usuario) {
  const params = [empresaId, inicio, fim];
  let filtro = '';
  if (usuario?.perfil === 'auditor') { filtro = ' AND s.auditor_id=?'; params.push(usuario.id); }
  const [auditorias] = await db.query(
    `SELECT a.id, a.codigo, a.data_auditoria, a.percentual_geral, a.classificacao,
            s.nome AS setor_nome, u.nome AS auditor_nome
     FROM auditorias a INNER JOIN setores s ON s.id=a.setor_id
     INNER JOIN usuarios u ON u.id=a.usuario_id
     WHERE a.empresa_id=? AND a.status='finalizada'
       AND a.data_auditoria >= ? AND a.data_auditoria < DATE_ADD(?, INTERVAL 1 DAY) ${filtro}
     ORDER BY a.data_auditoria ASC, a.id ASC`, params
  );
  const [porMes] = await db.query(
    `SELECT DATE_FORMAT(a.data_auditoria, '%Y-%m') AS mes,
            COUNT(*) AS total, ROUND(AVG(a.percentual_geral),2) AS media,
            ROUND(MAX(a.percentual_geral),2) AS melhor, ROUND(MIN(a.percentual_geral),2) AS menor
     FROM auditorias a INNER JOIN setores s ON s.id=a.setor_id
     WHERE a.empresa_id=? AND a.status='finalizada'
       AND a.data_auditoria >= ? AND a.data_auditoria < DATE_ADD(?, INTERVAL 1 DAY) ${filtro}
     GROUP BY DATE_FORMAT(a.data_auditoria, '%Y-%m') ORDER BY mes`, params
  );
  const [porSetor] = await db.query(
    `SELECT s.nome AS setor, COUNT(*) AS total, ROUND(AVG(a.percentual_geral),2) AS media
     FROM auditorias a INNER JOIN setores s ON s.id=a.setor_id
     WHERE a.empresa_id=? AND a.status='finalizada'
       AND a.data_auditoria >= ? AND a.data_auditoria < DATE_ADD(?, INTERVAL 1 DAY) ${filtro}
     GROUP BY s.id, s.nome ORDER BY media DESC`, params
  );
  const media = auditorias.length ? auditorias.reduce((s,a)=>s+Number(a.percentual_geral||0),0)/auditorias.length : 0;
  return { inicio, fim, auditorias, porMes, porSetor, indicadores: { totalAuditorias: auditorias.length, media: Number(media.toFixed(2)) } };
}

async function gerar(tipo, filtros, empresaId, usuario) {
  if (tipo === 'auditoria') return { tipo, auditoria: await buscarAuditoria(filtros.auditoria_id, empresaId, usuario) };
  if (tipo === 'setor') {
    if (!filtros.setor_id) { const e = new Error('Selecione um setor.'); e.status=400; throw e; }
    return { tipo, ...(await porSetor(empresaId, filtros.setor_id, filtros.inicio, filtros.fim, usuario)) };
  }
  if (tipo === 'gerencial') {
    if (usuario?.perfil !== 'administrador') { const e = new Error('O relatório gerencial completo é exclusivo do administrador.'); e.status=403; throw e; }
    return { tipo, ...(await gerencial(empresaId)) };
  }
  if (tipo === 'periodico') {
    if (!filtros.inicio || !filtros.fim || filtros.inicio > filtros.fim) { const e = new Error('Informe um período válido.'); e.status=400; throw e; }
    return { tipo, ...(await periodico(empresaId, filtros.inicio, filtros.fim, usuario)) };
  }
  const error = new Error('Tipo de relatório inválido.');
  error.status = 400;
  throw error;
}

module.exports = { opcoes, gerar };
