const db = require('../config/database');

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
        SELECT COALESCE(percentual_geral, 0)
        FROM auditorias
        WHERE empresa_id = ?
          AND status = 'finalizada'
        ORDER BY data_auditoria DESC, id DESC
        LIMIT 1
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
          SUM(r.nota * c.peso) /
          NULLIF(SUM(5 * c.peso), 0)
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
      AND c.ativo = TRUE

    GROUP BY
      s.id,
      s.codigo,
      s.nome,
      s.ordem

    ORDER BY s.ordem
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
  };
}

module.exports = {
  resumo,
};