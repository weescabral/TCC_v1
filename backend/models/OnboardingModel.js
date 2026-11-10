const db = require('../config/database');

async function buscar(empresaId) {
  const [rows] = await db.query(
    `SELECT empresa_id, status, etapa_atual, atualizado_em, pulado_em, concluido_em
     FROM onboarding_empresa WHERE empresa_id = ? LIMIT 1`,
    [empresaId]
  );
  if (rows[0]) return rows[0];
  await db.query(
    `INSERT INTO onboarding_empresa (empresa_id, status, etapa_atual)
     VALUES (?, 'pendente', 1)`,
    [empresaId]
  );
  return { empresa_id: empresaId, status: 'pendente', etapa_atual: 1 };
}

async function atualizar(empresaId, dados) {
  const status = ['pendente', 'adiado', 'concluido'].includes(dados.status)
    ? dados.status : 'pendente';
  const etapa = Math.min(6, Math.max(1, Number(dados.etapa_atual) || 1));
  await db.query(
    `INSERT INTO onboarding_empresa (empresa_id, status, etapa_atual, pulado_em, concluido_em)
     VALUES (?, ?, ?, IF(? = 'adiado', NOW(), NULL), IF(? = 'concluido', NOW(), NULL))
     ON DUPLICATE KEY UPDATE
       status = VALUES(status),
       etapa_atual = VALUES(etapa_atual),
       pulado_em = IF(VALUES(status) = 'adiado', NOW(), IF(VALUES(status) = 'pendente', NULL, pulado_em)),
       concluido_em = IF(VALUES(status) = 'concluido', NOW(), IF(VALUES(status) = 'pendente', NULL, concluido_em))`,
    [empresaId, status, etapa, status, status]
  );
  return buscar(empresaId);
}

module.exports = { buscar, atualizar };
