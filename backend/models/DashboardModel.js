const db = require('../config/database');


async function resumoAuditor(empresaId, usuarioId, setorId = null) {
  const [setoresAtribuidos] = await db.query(
    `SELECT id, nome, periodicidade_auditoria
     FROM setores
     WHERE empresa_id = ? AND auditor_id = ? AND ativo = TRUE
     ORDER BY nome`,
    [empresaId, usuarioId]
  );

  const idsAtribuidos = setoresAtribuidos.map((setor) => Number(setor.id));
  if (!idsAtribuidos.length) {
    return {
      kpis: {}, porSetor: [], porSenso: [], planos: [], evolucao: [],
      cobertura: [], setoresPendentes: [], setoresAuditados: 0,
      comparativoSensos: [], setoresComparados: 0, alertasPlanos: {},
      meusSetores: [], setorSelecionado: null,
    };
  }

  let idsEscopo = idsAtribuidos;
  if (setorId !== null && setorId !== undefined && setorId !== '') {
    const idSolicitado = Number(setorId);
    if (!idsAtribuidos.includes(idSolicitado)) {
      const erro = new Error('Você não possui permissão para visualizar este setor.');
      erro.status = 403;
      throw erro;
    }
    idsEscopo = [idSolicitado];
  } else if (idsAtribuidos.length === 1) {
    idsEscopo = [idsAtribuidos[0]];
  }

  const setoresEscopo = setoresAtribuidos.filter((setor) => idsEscopo.includes(Number(setor.id)));
  const [[kpis]] = await db.query(
    `SELECT
      (SELECT COUNT(*) FROM auditorias a
       WHERE a.empresa_id = ? AND a.setor_id IN (?) AND a.status = 'finalizada') AS totalAuditorias,
      (SELECT COUNT(*) FROM setores s
       WHERE s.empresa_id = ? AND s.ativo = TRUE AND s.id IN (?)) AS totalSetores,
      (SELECT COUNT(*) FROM planos_acao pa
       INNER JOIN auditorias a ON a.id = pa.auditoria_id
       WHERE a.empresa_id = ? AND a.setor_id IN (?) AND pa.status = 'pendente') AS planosPendentes,
      (SELECT COALESCE(MAX(a.percentual_geral), 0) FROM auditorias a
       WHERE a.empresa_id = ? AND a.setor_id IN (?) AND a.status = 'finalizada') AS melhorScore,
      (SELECT COALESCE(MIN(a.percentual_geral), 0) FROM auditorias a
       WHERE a.empresa_id = ? AND a.setor_id IN (?) AND a.status = 'finalizada') AS piorScore,
      (SELECT COALESCE(AVG((
         SELECT a.percentual_geral FROM auditorias a
         WHERE a.setor_id = s.id AND a.empresa_id = ? AND a.status = 'finalizada'
         ORDER BY a.data_auditoria DESC, a.id DESC LIMIT 1
       )), 0) FROM setores s
       WHERE s.empresa_id = ? AND s.ativo = TRUE AND s.id IN (?)) AS indiceAtual,
      (SELECT COALESCE(AVG(a.percentual_geral), 0) FROM auditorias a
       WHERE a.empresa_id = ? AND a.setor_id IN (?) AND a.status = 'finalizada'
         AND YEAR(a.data_auditoria) = YEAR(CURDATE())) AS mediaGeral`,
    [
      empresaId, idsEscopo, empresaId, idsEscopo,
      empresaId, idsEscopo, empresaId, idsEscopo,
      empresaId, idsEscopo, empresaId, empresaId, idsEscopo,
      empresaId, idsEscopo,
    ]
  );

  const [porSetor] = await db.query(
    `SELECT s.id, s.nome,
       COALESCE((SELECT a.percentual_geral FROM auditorias a
         WHERE a.setor_id = s.id AND a.empresa_id = ? AND a.status = 'finalizada'
         ORDER BY a.data_auditoria DESC, a.id DESC LIMIT 1), 0) AS score
     FROM setores s
     WHERE s.empresa_id = ? AND s.ativo = TRUE AND s.id IN (?)
     ORDER BY score DESC, s.nome ASC`,
    [empresaId, empresaId, idsEscopo]
  );

  const [porSenso] = await db.query(
    `SELECT s.id, s.codigo AS senso, s.nome,
       COALESCE((SUM(r.nota * COALESCE(r.peso_aplicado, c.peso, 1)) /
       NULLIF(SUM(5 * COALESCE(r.peso_aplicado, c.peso, 1)), 0)) * 100, 0) AS media
     FROM auditorias a
     INNER JOIN respostas_auditoria r ON r.auditoria_id = a.id
     INNER JOIN criterios_5s c ON c.id = r.criterio_id
     INNER JOIN sensos_5s s ON s.id = c.senso_id
     WHERE a.empresa_id = ? AND a.setor_id IN (?) AND a.status = 'finalizada'
     GROUP BY s.id, s.codigo, s.nome, s.ordem
     ORDER BY s.ordem`,
    [empresaId, idsEscopo]
  );

  const [planos] = await db.query(
    `SELECT pa.status, COUNT(*) AS total
     FROM planos_acao pa
     INNER JOIN auditorias a ON a.id = pa.auditoria_id
     WHERE a.empresa_id = ? AND a.setor_id IN (?)
     GROUP BY pa.status ORDER BY pa.status`,
    [empresaId, idsEscopo]
  );

  const [evolucao] = await db.query(
    `SELECT a.id, a.codigo, a.data_auditoria AS data, a.percentual_geral AS score,
       s.nome AS setor
     FROM auditorias a
     INNER JOIN setores s ON s.id = a.setor_id
     WHERE a.empresa_id = ? AND a.setor_id IN (?) AND a.status = 'finalizada'
     ORDER BY a.data_auditoria ASC, a.id ASC`,
    [empresaId, idsEscopo]
  );

  const [cobertura] = await db.query(
    `SELECT s.id, s.nome, s.periodicidade_auditoria, s.auditor_id,
       ultima.data_auditoria AS ultima_auditoria,
       CASE
         WHEN ultima.data_auditoria IS NULL THEN NULL
         WHEN s.periodicidade_auditoria = 'semanal' THEN DATE_ADD(ultima.data_auditoria, INTERVAL 1 WEEK)
         WHEN s.periodicidade_auditoria = 'quinzenal' THEN DATE_ADD(ultima.data_auditoria, INTERVAL 2 WEEK)
         WHEN s.periodicidade_auditoria = 'mensal' THEN DATE_ADD(ultima.data_auditoria, INTERVAL 1 MONTH)
         WHEN s.periodicidade_auditoria = 'bimestral' THEN DATE_ADD(ultima.data_auditoria, INTERVAL 2 MONTH)
         WHEN s.periodicidade_auditoria = 'trimestral' THEN DATE_ADD(ultima.data_auditoria, INTERVAL 3 MONTH)
         WHEN s.periodicidade_auditoria = 'semestral' THEN DATE_ADD(ultima.data_auditoria, INTERVAL 6 MONTH)
         WHEN s.periodicidade_auditoria = 'anual' THEN DATE_ADD(ultima.data_auditoria, INTERVAL 1 YEAR)
         ELSE DATE_ADD(ultima.data_auditoria, INTERVAL 1 MONTH)
       END AS proxima_auditoria
     FROM setores s
     LEFT JOIN (
       SELECT a1.* FROM auditorias a1
       INNER JOIN (
         SELECT setor_id, MAX(id) AS ultimo_id FROM auditorias
         WHERE empresa_id = ? AND status = 'finalizada' AND setor_id IN (?)
         GROUP BY setor_id
       ) ultimos ON ultimos.ultimo_id = a1.id
     ) ultima ON ultima.setor_id = s.id
     WHERE s.empresa_id = ? AND s.ativo = TRUE AND s.id IN (?)
     ORDER BY s.nome`,
    [empresaId, idsEscopo, empresaId, idsEscopo]
  );

  const setoresPendentes = cobertura.filter((setor) => {
    if (!setor.ultima_auditoria) return true;
    return new Date(setor.proxima_auditoria) <= new Date();
  });

  const [auditoriasPorSetor] = await db.query(
    `SELECT a.id, a.setor_id, a.data_auditoria
     FROM auditorias a
     WHERE a.empresa_id = ? AND a.setor_id IN (?) AND a.status = 'finalizada'
     ORDER BY a.setor_id, a.data_auditoria DESC, a.id DESC`,
    [empresaId, idsEscopo]
  );
  const historicoPorSetor = new Map();
  for (const auditoria of auditoriasPorSetor) {
    const lista = historicoPorSetor.get(Number(auditoria.setor_id)) || [];
    if (lista.length < 2) lista.push(auditoria);
    historicoPorSetor.set(Number(auditoria.setor_id), lista);
  }
  const paresComparacao = [...historicoPorSetor.values()].filter((lista) => lista.length === 2);
  const idsComparacao = paresComparacao.flatMap((lista) => lista.map((item) => item.id));
  let comparativoSensos = [];
  if (idsComparacao.length) {
    const [resultados] = await db.query(
      `SELECT a.id AS auditoria_id, a.setor_id, s.id AS senso_id,
         s.codigo AS senso, s.nome, s.ordem,
         (SUM(r.nota * COALESCE(r.peso_aplicado, c.peso, 1)) /
         NULLIF(SUM(5 * COALESCE(r.peso_aplicado, c.peso, 1)), 0)) * 100 AS media
       FROM auditorias a
       INNER JOIN respostas_auditoria r ON r.auditoria_id = a.id
       INNER JOIN criterios_5s c ON c.id = r.criterio_id
       INNER JOIN sensos_5s s ON s.id = c.senso_id
       WHERE a.empresa_id = ? AND a.status = 'finalizada' AND a.id IN (?)
       GROUP BY a.id, a.setor_id, s.id, s.codigo, s.nome, s.ordem
       ORDER BY s.ordem`,
      [empresaId, idsComparacao]
    );
    const paresPorSetor = new Map(paresComparacao.map(([atual, anterior]) => [
      Number(atual.setor_id), { atualId: Number(atual.id), anteriorId: Number(anterior.id) }
    ]));
    const acumulado = new Map();
    for (const linha of resultados) {
      const par = paresPorSetor.get(Number(linha.setor_id));
      if (!par) continue;
      const item = acumulado.get(Number(linha.senso_id)) || {
        senso: linha.senso, nome: linha.nome, ordem: linha.ordem,
        atualTotal: 0, atualCount: 0, anteriorTotal: 0, anteriorCount: 0,
      };
      if (Number(linha.auditoria_id) === par.atualId) {
        item.atualTotal += Number(linha.media || 0); item.atualCount += 1;
      } else if (Number(linha.auditoria_id) === par.anteriorId) {
        item.anteriorTotal += Number(linha.media || 0); item.anteriorCount += 1;
      }
      acumulado.set(Number(linha.senso_id), item);
    }
    comparativoSensos = [...acumulado.values()]
      .filter((item) => item.atualCount && item.anteriorCount)
      .sort((a, b) => a.ordem - b.ordem)
      .map((item) => {
        const atual = item.atualTotal / item.atualCount;
        const anterior = item.anteriorTotal / item.anteriorCount;
        return { senso: item.senso, nome: item.nome, atual, anterior, variacao: atual - anterior };
      });
  }

  const [[alertasPlanos]] = await db.query(
    `SELECT
       SUM(CASE WHEN pa.prazo_conclusao < CURDATE()
         AND pa.status NOT IN ('concluido', 'cancelado') THEN 1 ELSE 0 END) AS planosAtrasados,
       SUM(CASE WHEN pa.prazo_conclusao BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
         AND pa.status NOT IN ('concluido', 'cancelado') THEN 1 ELSE 0 END) AS planosProximos
     FROM planos_acao pa
     INNER JOIN auditorias a ON a.id = pa.auditoria_id
     WHERE a.empresa_id = ? AND a.setor_id IN (?)`,
    [empresaId, idsEscopo]
  );

  return {
    kpis,
    porSetor,
    porSenso,
    planos,
    evolucao,
    cobertura,
    setoresAuditados: cobertura.filter((setor) => setor.ultima_auditoria).length,
    setoresPendentes,
    comparativoSensos,
    setoresComparados: paresComparacao.length,
    alertasPlanos: {
      atrasados: Number(alertasPlanos?.planosAtrasados || 0),
      proximos: Number(alertasPlanos?.planosProximos || 0),
    },
    meusSetores: setoresAtribuidos,
    setorSelecionado: idsEscopo.length === 1 ? idsEscopo[0] : null,
  };
}

async function resumo(empresaId) {
  const [[kpis]] = await db.query(
    `
    SELECT
      (
        SELECT COUNT(*)
        FROM auditorias
        WHERE empresa_id = ?
          AND status = 'finalizada'
      ) AS totalAuditorias,

      (
        SELECT COUNT(*)
        FROM setores
        WHERE empresa_id = ?
          AND ativo = TRUE
      ) AS totalSetores,

      (
        SELECT COUNT(*)
        FROM planos_acao pa
        INNER JOIN auditorias a
          ON a.id = pa.auditoria_id
        WHERE a.empresa_id = ?
          AND pa.status = 'pendente'
      ) AS planosPendentes,

      (
        SELECT COALESCE(MAX(percentual_geral), 0)
        FROM auditorias
        WHERE empresa_id = ?
          AND status = 'finalizada'
      ) AS melhorScore,

      (
        SELECT COALESCE(MIN(percentual_geral), 0)
        FROM auditorias
        WHERE empresa_id = ?
          AND status = 'finalizada'
      ) AS piorScore,

      (
        SELECT COALESCE(AVG((
          SELECT a.percentual_geral
          FROM auditorias a
          WHERE a.setor_id = setor_ativo.id
            AND a.empresa_id = ?
            AND a.status = 'finalizada'
          ORDER BY a.data_auditoria DESC, a.id DESC
          LIMIT 1
        )), 0)
        FROM setores setor_ativo
        WHERE setor_ativo.empresa_id = ?
          AND setor_ativo.ativo = TRUE
      ) AS indiceAtual,

      (
        SELECT COALESCE(AVG(percentual_geral), 0)
        FROM auditorias
        WHERE empresa_id = ?
          AND status = 'finalizada'
          AND YEAR(data_auditoria) = YEAR(CURDATE())
      ) AS mediaGeral
    `,
    [
      empresaId,
      empresaId,
      empresaId,
      empresaId,
      empresaId,
      empresaId,
      empresaId,
      empresaId,
    ]
  );

  const [porSetor] = await db.query(
    `
    SELECT
      s.id,
      s.nome,
      COALESCE(
        (
          SELECT a.percentual_geral
          FROM auditorias a
          WHERE a.setor_id = s.id
            AND a.empresa_id = ?
            AND a.status = 'finalizada'
          ORDER BY a.data_auditoria DESC, a.id DESC
          LIMIT 1
        ),
        0
      ) AS score
    FROM setores s
    WHERE s.empresa_id = ?
      AND s.ativo = TRUE
    ORDER BY score DESC, s.nome ASC
    `,
    [empresaId, empresaId]
  );

  const [porSenso] = await db.query(
    `
    SELECT
      s.id,
      s.codigo AS senso,
      s.nome,
      COALESCE(
        (
          SUM(r.nota * COALESCE(r.peso_aplicado, c.peso, 1)) /
          NULLIF(SUM(5 * COALESCE(r.peso_aplicado, c.peso, 1)), 0)
        ) * 100,
        0
      ) AS media
    FROM auditorias a

    INNER JOIN respostas_auditoria r
      ON r.auditoria_id = a.id

    INNER JOIN criterios_5s c
      ON c.id = r.criterio_id

    INNER JOIN sensos_5s s
      ON s.id = c.senso_id

    WHERE a.empresa_id = ?
      AND a.status = 'finalizada'

    GROUP BY
      s.id,
      s.codigo,
      s.nome,
      s.ordem

    ORDER BY s.ordem
    `,
    [empresaId]
  );


  // Compara os resultados por senso entre a auditoria mais recente e a anterior
  // de cada setor ativo. A comparação usa a mesma amostra de setores (somente
  // setores com pelo menos duas auditorias finalizadas), evitando distorções.
  const [auditoriasPorSetor] = await db.query(
    `
    SELECT a.id, a.setor_id, a.data_auditoria
    FROM auditorias a
    INNER JOIN setores st
      ON st.id = a.setor_id
     AND st.empresa_id = a.empresa_id
     AND st.ativo = TRUE
    WHERE a.empresa_id = ?
      AND a.status = 'finalizada'
    ORDER BY a.setor_id, a.data_auditoria DESC, a.id DESC
    `,
    [empresaId]
  );

  const historicoPorSetor = new Map();
  for (const auditoria of auditoriasPorSetor) {
    const lista = historicoPorSetor.get(auditoria.setor_id) || [];
    if (lista.length < 2) lista.push(auditoria);
    historicoPorSetor.set(auditoria.setor_id, lista);
  }

  const paresComparacao = [...historicoPorSetor.values()].filter(lista => lista.length === 2);
  const idsComparacao = paresComparacao.flatMap(lista => lista.map(item => item.id));
  let comparativoSensos = [];

  if (idsComparacao.length) {
    const [resultadosPorAuditoria] = await db.query(
      `
      SELECT
        a.id AS auditoria_id,
        a.setor_id,
        s.id AS senso_id,
        s.codigo AS senso,
        s.nome,
        s.ordem,
        (
          SUM(r.nota * COALESCE(r.peso_aplicado, c.peso, 1)) /
          NULLIF(SUM(5 * COALESCE(r.peso_aplicado, c.peso, 1)), 0)
        ) * 100 AS media
      FROM auditorias a
      INNER JOIN respostas_auditoria r ON r.auditoria_id = a.id
      INNER JOIN criterios_5s c ON c.id = r.criterio_id
      INNER JOIN sensos_5s s ON s.id = c.senso_id
      WHERE a.empresa_id = ?
        AND a.status = 'finalizada'
        AND a.id IN (?)
      GROUP BY a.id, a.setor_id, s.id, s.codigo, s.nome, s.ordem
      ORDER BY s.ordem
      `,
      [empresaId, idsComparacao]
    );

    const paresPorSetor = new Map(paresComparacao.map(([atual, anterior]) => [
      atual.setor_id,
      { atualId: atual.id, anteriorId: anterior.id }
    ]));
    const acumulado = new Map();

    for (const linha of resultadosPorAuditoria) {
      const par = paresPorSetor.get(linha.setor_id);
      if (!par) continue;
      const chave = linha.senso_id;
      const item = acumulado.get(chave) || {
        senso: linha.senso,
        nome: linha.nome,
        ordem: linha.ordem,
        atualTotal: 0,
        atualCount: 0,
        anteriorTotal: 0,
        anteriorCount: 0
      };
      if (Number(linha.auditoria_id) === Number(par.atualId)) {
        item.atualTotal += Number(linha.media || 0);
        item.atualCount += 1;
      } else if (Number(linha.auditoria_id) === Number(par.anteriorId)) {
        item.anteriorTotal += Number(linha.media || 0);
        item.anteriorCount += 1;
      }
      acumulado.set(chave, item);
    }

    comparativoSensos = [...acumulado.values()]
      .filter(item => item.atualCount && item.anteriorCount)
      .sort((a, b) => a.ordem - b.ordem)
      .map(item => {
        const atual = item.atualTotal / item.atualCount;
        const anterior = item.anteriorTotal / item.anteriorCount;
        return {
          senso: item.senso,
          nome: item.nome,
          atual,
          anterior,
          variacao: atual - anterior
        };
      });
  }

  const [[alertasPlanos]] = await db.query(
    `
    SELECT
      SUM(CASE
        WHEN pa.prazo_conclusao < CURDATE()
         AND pa.status NOT IN ('concluido', 'cancelado')
        THEN 1 ELSE 0 END
      ) AS planosAtrasados,
      SUM(CASE
        WHEN pa.prazo_conclusao BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
         AND pa.status NOT IN ('concluido', 'cancelado')
        THEN 1 ELSE 0 END
      ) AS planosProximos
    FROM planos_acao pa
    INNER JOIN auditorias a ON a.id = pa.auditoria_id
    WHERE a.empresa_id = ?
    `,
    [empresaId]
  );

  const [planos] = await db.query(
    `
    SELECT
      pa.status,
      COUNT(*) AS total
    FROM planos_acao pa

    INNER JOIN auditorias a
      ON a.id = pa.auditoria_id

    WHERE a.empresa_id = ?

    GROUP BY pa.status
    ORDER BY pa.status
    `,
    [empresaId]
  );

  const [evolucao] = await db.query(
    `
    SELECT
      a.id,
      a.codigo,
      a.data_auditoria AS data,
      a.percentual_geral AS score,
      s.nome AS setor
    FROM auditorias a

    INNER JOIN setores s
      ON s.id = a.setor_id

    WHERE a.empresa_id = ?
      AND a.status = 'finalizada'

    ORDER BY a.data_auditoria ASC, a.id ASC
    `,
    [empresaId]
  );

  const [cobertura] = await db.query(
    `
    SELECT
      s.id,
      s.nome,
      s.periodicidade_auditoria,
      s.auditor_id,
      u.nome AS auditor_nome,
      ultima.data_auditoria AS ultima_auditoria,
      CASE
        WHEN ultima.data_auditoria IS NULL THEN NULL
        WHEN s.periodicidade_auditoria = 'semanal' THEN DATE_ADD(ultima.data_auditoria, INTERVAL 1 WEEK)
        WHEN s.periodicidade_auditoria = 'quinzenal' THEN DATE_ADD(ultima.data_auditoria, INTERVAL 2 WEEK)
        WHEN s.periodicidade_auditoria = 'mensal' THEN DATE_ADD(ultima.data_auditoria, INTERVAL 1 MONTH)
        WHEN s.periodicidade_auditoria = 'bimestral' THEN DATE_ADD(ultima.data_auditoria, INTERVAL 2 MONTH)
        WHEN s.periodicidade_auditoria = 'trimestral' THEN DATE_ADD(ultima.data_auditoria, INTERVAL 3 MONTH)
        WHEN s.periodicidade_auditoria = 'semestral' THEN DATE_ADD(ultima.data_auditoria, INTERVAL 6 MONTH)
        WHEN s.periodicidade_auditoria = 'anual' THEN DATE_ADD(ultima.data_auditoria, INTERVAL 1 YEAR)
        ELSE DATE_ADD(ultima.data_auditoria, INTERVAL 1 MONTH)
      END AS proxima_auditoria
    FROM setores s
    LEFT JOIN usuarios u
      ON u.id = s.auditor_id
    LEFT JOIN (
      SELECT a1.*
      FROM auditorias a1
      INNER JOIN (
        SELECT setor_id, MAX(id) AS ultimo_id
        FROM auditorias
        WHERE empresa_id = ?
          AND status = 'finalizada'
        GROUP BY setor_id
      ) ultimos
        ON ultimos.ultimo_id = a1.id
    ) ultima
      ON ultima.setor_id = s.id
    WHERE s.empresa_id = ?
      AND s.ativo = TRUE
    ORDER BY
      CASE
        WHEN ultima.data_auditoria IS NULL THEN 0
        WHEN CASE
          WHEN s.periodicidade_auditoria = 'semanal' THEN DATE_ADD(ultima.data_auditoria, INTERVAL 1 WEEK)
          WHEN s.periodicidade_auditoria = 'quinzenal' THEN DATE_ADD(ultima.data_auditoria, INTERVAL 2 WEEK)
          WHEN s.periodicidade_auditoria = 'mensal' THEN DATE_ADD(ultima.data_auditoria, INTERVAL 1 MONTH)
          WHEN s.periodicidade_auditoria = 'bimestral' THEN DATE_ADD(ultima.data_auditoria, INTERVAL 2 MONTH)
          WHEN s.periodicidade_auditoria = 'trimestral' THEN DATE_ADD(ultima.data_auditoria, INTERVAL 3 MONTH)
          WHEN s.periodicidade_auditoria = 'semestral' THEN DATE_ADD(ultima.data_auditoria, INTERVAL 6 MONTH)
          WHEN s.periodicidade_auditoria = 'anual' THEN DATE_ADD(ultima.data_auditoria, INTERVAL 1 YEAR)
          ELSE DATE_ADD(ultima.data_auditoria, INTERVAL 1 MONTH)
        END < NOW() THEN 0
        ELSE 1
      END,
      s.nome
    `,
    [empresaId, empresaId]
  );

  const setoresAuditados = cobertura.filter((setor) => setor.ultima_auditoria).length;
  const setoresPendentes = cobertura.filter((setor) => {
    if (!setor.ultima_auditoria) return true;
    return new Date(setor.proxima_auditoria) <= new Date();
  });


  return {
    kpis,
    porSetor,
    porSenso,
    planos,
    evolucao,
    cobertura,
    setoresAuditados,
    setoresPendentes,
    comparativoSensos,
    setoresComparados: paresComparacao.length,
    alertasPlanos: {
      atrasados: Number(alertasPlanos?.planosAtrasados || 0),
      proximos: Number(alertasPlanos?.planosProximos || 0),
    },
  };
}

module.exports = {
  resumo,
  resumoAuditor,
};