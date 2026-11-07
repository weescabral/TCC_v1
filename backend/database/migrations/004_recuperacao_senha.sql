-- Sensus 5S - Recuperação segura de senha
-- Faça backup e execute uma única vez no banco utilizado pelo sistema.
CREATE TABLE IF NOT EXISTS recuperacao_senha (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expira_em DATETIME NOT NULL,
  usado_em DATETIME NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_recuperacao_token (token_hash),
  INDEX idx_recuperacao_usuario (usuario_id),
  INDEX idx_recuperacao_expiracao (expira_em),
  CONSTRAINT fk_recuperacao_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
