const db = require('../config/database');

function dataBancoISO(valor) {
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  return String(valor || '').slice(0, 10);
}

function montarChavePlano(plano, tipo) {
  const prazo = dataBancoISO(plano.prazo_conclusao);
  return `${tipo}:plano:${plano.id}:${prazo}`;
}

async function inserir(usuario, dados) {
  await db.query(
    `INSERT IGNORE INTO notificacoes
      (empresa_id, usuario_id, tipo, titulo, mensagem, nivel, link,
       referencia_tipo, referencia_id, chave_unica)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      usuario.empresa_id, usuario.id, dados.tipo, dados.titulo, dados.mensagem,
      dados.nivel || 'info', dados.link || null, dados.referencia_tipo || null,
      dados.referencia_id || null, dados.chave_unica,
    ]
  );
}

async function sincronizarAlertasDinamicos(usuario) {
  const empresaId = Number(usuario.empresa_id);
  const usuarioId = Number(usuario.id);
  const ehAuditor = usuario.perfil === 'auditor';

  // Alertas de planos: prazo vencido ou vencendo nos próximos sete dias.
  const filtroPlanoAuditor = ehAuditor ? 'AND (s.auditor_id = ? OR pa.responsavel_id = ?)' : '';
  const parametrosPlanos = ehAuditor ? [empresaId, usuarioId, usuarioId] : [empresaId];
  const [planos] = await db.query(
    `SELECT pa.id, pa.prazo_conclusao, pa.prioridade, pa.descricao,
            a.codigo AS auditoria_codigo, s.id AS setor_id, s.nome AS setor_nome,
            DATEDIFF(pa.prazo_conclusao, CURDATE()) AS dias_restantes
     FROM planos_acao pa
     INNER JOIN auditorias a ON a.id = pa.auditoria_id
     INNER JOIN setores s ON s.id = pa.setor_id
     WHERE a.empresa_id = ?
       AND pa.prazo_conclusao IS NOT NULL
       AND pa.status NOT IN ('concluido', 'cancelado')
       AND pa.prazo_conclusao <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
       ${filtroPlanoAuditor}
     ORDER BY pa.prazo_conclusao ASC, pa.id DESC`,
    parametrosPlanos
  );

  const idsPlanosAtivos = planos.map((p) => Number(p.id));
  if (idsPlanosAtivos.length) {
    await db.query(
      `UPDATE notificacoes
       SET resolvida_em = UTC_TIMESTAMP()
       WHERE empresa_id = ? AND usuario_id = ?
         AND referencia_tipo = 'plano'
         AND tipo IN ('plano_atrasado', 'plano_proximo')
         AND resolvida_em IS NULL
         AND referencia_id NOT IN (?)`,
      [empresaId, usuarioId, idsPlanosAtivos]
    );
  } else {
    await db.query(
      `UPDATE notificacoes SET resolvida_em = UTC_TIMESTAMP()
       WHERE empresa_id = ? AND usuario_id = ? AND referencia_tipo = 'plano'
         AND tipo IN ('plano_atrasado', 'plano_proximo') AND resolvida_em IS NULL`,
      [empresaId, usuarioId]
    );
  }

  for (const plano of planos) {
    const atrasado = Number(plano.dias_restantes) < 0;
    const tipo = atrasado ? 'plano_atrasado' : 'plano_proximo';
    const prazoISO = dataBancoISO(plano.prazo_conclusao);
    const prazo = new Date(`${prazoISO}T12:00:00`).toLocaleDateString('pt-BR');
    const dias = Math.abs(Number(plano.dias_restantes));
    const mensagem = atrasado
      ? `O plano do setor ${plano.setor_nome} venceu há ${dias} dia(s). Prazo: ${prazo}.`
      : Number(plano.dias_restantes) === 0
        ? `O plano do setor ${plano.setor_nome} vence hoje.`
        : `O plano do setor ${plano.setor_nome} vence em ${dias} dia(s), em ${prazo}.`;

    const chaveAtual = montarChavePlano(plano, tipo);
    await db.query(
      `UPDATE notificacoes SET resolvida_em = UTC_TIMESTAMP()
       WHERE empresa_id = ? AND usuario_id = ? AND referencia_tipo = 'plano'
         AND referencia_id = ? AND tipo IN ('plano_atrasado', 'plano_proximo')
         AND chave_unica <> ? AND resolvida_em IS NULL`,
      [empresaId, usuarioId, Number(plano.id), chaveAtual]
    );
    await inserir(usuario, {
      tipo,
      titulo: atrasado ? 'Plano de ação atrasado' : 'Prazo de plano se aproximando',
      mensagem,
      nivel: atrasado ? 'urgente' : 'atencao',
      link: `./planos-acao.html?planoId=${Number(plano.id)}`,
      referencia_tipo: 'plano',
      referencia_id: Number(plano.id),
      chave_unica: chaveAtual,
    });
  }

  // Auditorias vencidas conforme a periodicidade cadastrada para cada setor.
  const filtroSetorAuditor = ehAuditor ? 'AND s.auditor_id = ?' : '';
  const [setores] = await db.query(
    `SELECT s.id, s.nome, s.periodicidade_auditoria,
            s.proxima_auditoria_em AS proxima_auditoria,
            DATEDIFF(s.proxima_auditoria_em, DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-03:00'))) AS dias_restantes
     FROM setores s
     WHERE s.empresa_id = ? AND s.ativo = TRUE
       AND s.proxima_auditoria_em IS NOT NULL
       ${filtroSetorAuditor}
       AND s.proxima_auditoria_em <= DATE_ADD(DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-03:00')), INTERVAL 7 DAY)
     ORDER BY s.proxima_auditoria_em ASC`,
    ehAuditor ? [empresaId, usuarioId] : [empresaId]
  );

  const idsSetoresVencidos = setores.map((s) => Number(s.id));
  if (idsSetoresVencidos.length) {
    await db.query(
      `UPDATE notificacoes
       SET resolvida_em = UTC_TIMESTAMP()
       WHERE empresa_id = ? AND usuario_id = ?
         AND tipo IN ('auditoria_atrasada', 'auditoria_proxima') AND referencia_tipo = 'setor'
         AND resolvida_em IS NULL AND referencia_id NOT IN (?)`,
      [empresaId, usuarioId, idsSetoresVencidos]
    );
  } else {
    await db.query(
      `UPDATE notificacoes SET resolvida_em = UTC_TIMESTAMP()
       WHERE empresa_id = ? AND usuario_id = ? AND tipo IN ('auditoria_atrasada', 'auditoria_proxima')
         AND referencia_tipo = 'setor' AND resolvida_em IS NULL`,
      [empresaId, usuarioId]
    );
  }

  for (const setor of setores) {
    const chaveData = dataBancoISO(setor.proxima_auditoria);
    const dataPrevista = new Date(`${chaveData}T12:00:00`);
    const dataTexto = Number.isNaN(dataPrevista.getTime())
      ? 'data não disponível'
      : dataPrevista.toLocaleDateString('pt-BR');
    const atrasada = Number(setor.dias_restantes) < 0;
    const tipoAuditoria = atrasada ? 'auditoria_atrasada' : 'auditoria_proxima';
    const chaveAuditoria = `${tipoAuditoria}:setor:${setor.id}:${chaveData}`;
    await db.query(
      `UPDATE notificacoes SET resolvida_em = UTC_TIMESTAMP()
       WHERE empresa_id = ? AND usuario_id = ? AND referencia_tipo = 'setor'
         AND referencia_id = ? AND tipo IN ('auditoria_atrasada', 'auditoria_proxima')
         AND chave_unica <> ? AND resolvida_em IS NULL`,
      [empresaId, usuarioId, Number(setor.id), chaveAuditoria]
    );
    await inserir(usuario, {
      tipo: tipoAuditoria,
      titulo: atrasada ? 'Auditoria periódica atrasada' : 'Auditoria próxima do vencimento',
      mensagem: atrasada
        ? `O setor ${setor.nome} está com a auditoria vencida desde ${dataTexto}.`
        : `A próxima auditoria do setor ${setor.nome} deve ocorrer até ${dataTexto}.`,
      nivel: atrasada ? 'urgente' : 'atencao',
      link: './setores.html',
      referencia_tipo: 'setor',
      referencia_id: Number(setor.id),
      chave_unica: chaveAuditoria,
    });
  }
}

async function registrarAuditoriaFinalizada({ auditoriaId, empresaId, codigo, setorId, percentual, usuarioId, totalPlanos }) {
  const [destinatarios] = await db.query(
    `SELECT id FROM usuarios
     WHERE empresa_id = ? AND ativo = TRUE
       AND (perfil = 'administrador' OR id = ? OR id = (
         SELECT auditor_id FROM setores WHERE id = ? AND empresa_id = ? LIMIT 1
       ))`,
    [empresaId, usuarioId, setorId, empresaId]
  );

  for (const destinatario of destinatarios) {
    await inserir({ id: destinatario.id, empresa_id: empresaId }, {
      tipo: 'auditoria_finalizada',
      titulo: 'Auditoria finalizada',
      mensagem: `A auditoria ${codigo} foi concluída com resultado de ${Number(percentual || 0).toFixed(1).replace('.', ',')}%.`,
      nivel: 'sucesso',
      link: `./historico-auditorias.html?auditoriaId=${Number(auditoriaId)}`,
      referencia_tipo: 'auditoria',
      referencia_id: Number(auditoriaId),
      chave_unica: `auditoria_finalizada:${auditoriaId}`,
    });

    if (Number(totalPlanos || 0) > 0) {
      await inserir({ id: destinatario.id, empresa_id: empresaId }, {
        tipo: 'novos_planos',
        titulo: 'Novos planos de ação gerados',
        mensagem: `${Number(totalPlanos)} plano(s) de ação foram criados a partir da auditoria ${codigo}.`,
        nivel: 'atencao',
        link: `./planos-acao.html?auditoriaId=${Number(auditoriaId)}`,
        referencia_tipo: 'auditoria',
        referencia_id: Number(auditoriaId),
        chave_unica: `novos_planos_auditoria:${auditoriaId}`,
      });
    }
  }
}

async function registrarPlanoAtribuido({ empresaId, planoId, responsavelId, atribuidoPorId }) {
  if (!responsavelId || Number(responsavelId) === Number(atribuidoPorId)) return;
  const [[plano]] = await db.query(
    `SELECT pa.id, pa.descricao, a.codigo AS auditoria_codigo,
            s.nome AS setor_nome, c.titulo AS criterio_titulo
     FROM planos_acao pa
     INNER JOIN auditorias a ON a.id = pa.auditoria_id
     INNER JOIN setores s ON s.id = pa.setor_id
     LEFT JOIN criterios_5s c ON c.id = pa.criterio_id
     WHERE pa.id = ? AND a.empresa_id = ? LIMIT 1`,
    [planoId, empresaId]
  );
  if (!plano) return;
  await inserir({ id: Number(responsavelId), empresa_id: Number(empresaId) }, {
    tipo: 'plano_atribuido',
    titulo: 'Novo plano de ação atribuído',
    mensagem: `Você recebeu uma ação para o setor ${plano.setor_nome}${plano.criterio_titulo ? `: ${plano.criterio_titulo}` : ''}.`,
    nivel: 'atencao',
    link: `./planos-acao.html?planoId=${Number(plano.id)}`,
    referencia_tipo: 'plano',
    referencia_id: Number(plano.id),
    chave_unica: `plano_atribuido:${plano.id}:${responsavelId}`,
  });
}

async function listar(usuario) {
  await sincronizarAlertasDinamicos(usuario);
  const [items] = await db.query(
    `SELECT id, tipo, titulo, mensagem, nivel, link, referencia_tipo,
            referencia_id, lida_em, criado_em
     FROM notificacoes
     WHERE empresa_id = ? AND usuario_id = ? AND resolvida_em IS NULL
     ORDER BY (lida_em IS NULL) DESC, criado_em DESC, id DESC
     LIMIT 60`,
    [usuario.empresa_id, usuario.id]
  );
  const [[contagem]] = await db.query(
    `SELECT COUNT(*) AS nao_lidas
     FROM notificacoes
     WHERE empresa_id = ? AND usuario_id = ?
       AND lida_em IS NULL AND resolvida_em IS NULL`,
    [usuario.empresa_id, usuario.id]
  );
  return { items, naoLidas: Number(contagem.nao_lidas || 0) };
}

async function marcarComoLida(id, usuario) {
  const [resultado] = await db.query(
    `UPDATE notificacoes SET lida_em = UTC_TIMESTAMP()
     WHERE id = ? AND empresa_id = ? AND usuario_id = ? AND lida_em IS NULL`,
    [id, usuario.empresa_id, usuario.id]
  );
  return resultado.affectedRows > 0;
}

async function marcarTodasComoLidas(usuario) {
  const [resultado] = await db.query(
    `UPDATE notificacoes SET lida_em = UTC_TIMESTAMP()
     WHERE empresa_id = ? AND usuario_id = ? AND lida_em IS NULL AND resolvida_em IS NULL`,
    [usuario.empresa_id, usuario.id]
  );
  return resultado.affectedRows;
}

module.exports = { listar, marcarComoLida, marcarTodasComoLidas, registrarAuditoriaFinalizada, registrarPlanoAtribuido };
