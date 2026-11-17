-- Programação automática dos ciclos de auditoria por setor.
ALTER TABLE setores
  ADD COLUMN proxima_auditoria_em DATE NULL AFTER periodicidade_auditoria;

-- Primeiro ciclo: cadastro do setor + periodicidade.
-- Setores com auditoria concluída: conclusão mais recente + periodicidade.
UPDATE setores s
LEFT JOIN (
  SELECT setor_id, MAX(finalizada_em) AS ultima_conclusao
  FROM auditorias
  WHERE status = 'finalizada' AND finalizada_em IS NOT NULL
  GROUP BY setor_id
) ult ON ult.setor_id = s.id
SET s.proxima_auditoria_em = DATE(
  CASE s.periodicidade_auditoria
    WHEN 'semanal' THEN DATE_ADD(COALESCE(ult.ultima_conclusao, s.criado_em), INTERVAL 1 WEEK)
    WHEN 'quinzenal' THEN DATE_ADD(COALESCE(ult.ultima_conclusao, s.criado_em), INTERVAL 15 DAY)
    WHEN 'bimestral' THEN DATE_ADD(COALESCE(ult.ultima_conclusao, s.criado_em), INTERVAL 2 MONTH)
    WHEN 'trimestral' THEN DATE_ADD(COALESCE(ult.ultima_conclusao, s.criado_em), INTERVAL 3 MONTH)
    WHEN 'semestral' THEN DATE_ADD(COALESCE(ult.ultima_conclusao, s.criado_em), INTERVAL 6 MONTH)
    WHEN 'anual' THEN DATE_ADD(COALESCE(ult.ultima_conclusao, s.criado_em), INTERVAL 1 YEAR)
    ELSE DATE_ADD(COALESCE(ult.ultima_conclusao, s.criado_em), INTERVAL 1 MONTH)
  END
);
