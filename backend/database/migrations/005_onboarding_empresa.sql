-- Sensus 5S: estado persistente do assistente de primeiro acesso.
-- Execute uma única vez no banco sensus_db.
CREATE TABLE IF NOT EXISTS onboarding_empresa (
  empresa_id INT NOT NULL PRIMARY KEY,
  status ENUM('pendente', 'adiado', 'concluido') NOT NULL DEFAULT 'pendente',
  etapa_atual TINYINT UNSIGNED NOT NULL DEFAULT 1,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  pulado_em DATETIME NULL,
  concluido_em DATETIME NULL,
  CONSTRAINT fk_onboarding_empresa
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
);
