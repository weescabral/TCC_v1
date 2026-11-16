-- Central de Notificações Inteligentes - Sensus 5S
-- Execute uma única vez no banco utilizado pelo sistema.

CREATE TABLE IF NOT EXISTS notificacoes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id BIGINT UNSIGNED NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  tipo VARCHAR(40) NOT NULL,
  titulo VARCHAR(180) NOT NULL,
  mensagem VARCHAR(500) NOT NULL,
  nivel ENUM('info', 'atencao', 'urgente', 'sucesso') NOT NULL DEFAULT 'info',
  link VARCHAR(255) NULL,
  referencia_tipo VARCHAR(40) NULL,
  referencia_id BIGINT UNSIGNED NULL,
  chave_unica VARCHAR(190) NOT NULL,
  lida_em DATETIME NULL,
  resolvida_em DATETIME NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_notificacoes_usuario_chave (usuario_id, chave_unica),
  KEY idx_notificacoes_usuario_status (usuario_id, resolvida_em, lida_em, criado_em),
  KEY idx_notificacoes_empresa (empresa_id, criado_em),
  KEY idx_notificacoes_referencia (referencia_tipo, referencia_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
