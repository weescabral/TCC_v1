-- Sensus 5S - Fase 2: Gestão dos planos de ação
-- Faça backup antes de executar. Execute uma única vez no banco utilizado pelo sistema.
ALTER TABLE planos_acao
  ADD COLUMN prazo_conclusao DATE NULL,
  ADD COLUMN causa_raiz TEXT NULL,
  ADD COLUMN resultado_esperado TEXT NULL,
  ADD COLUMN atualizado_em DATETIME NULL DEFAULT NULL;

CREATE INDEX idx_planos_acao_prazo_status ON planos_acao (status, prazo_conclusao);
