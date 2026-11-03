-- Sensus 5S - Fase 1
-- Migration simples para o banco existente.
-- IMPORTANTE: execute este arquivo UMA vez, depois de selecionar o banco sensus_db.
-- Não use DELIMITER, PROCEDURE ou PREPARE.

USE sensus_db;

-- ============================================================
-- 1) SETORES
-- ============================================================
ALTER TABLE setores
    ADD COLUMN ativo BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN codigo VARCHAR(40) NULL,
    ADD COLUMN criado_por INT NULL,
    ADD COLUMN auditor_id INT NULL,
    ADD COLUMN periodicidade_auditoria VARCHAR(20) NOT NULL DEFAULT 'mensal',
    ADD COLUMN motivo_inativacao TEXT NULL,
    ADD COLUMN inativado_em DATETIME NULL;

-- Gera código para os setores que já existiam antes desta melhoria.
UPDATE setores
SET codigo = CONCAT('SET-', empresa_id, '-', id)
WHERE codigo IS NULL OR codigo = '';

-- Depois de preencher os registros antigos, o código passa a ser obrigatório.
ALTER TABLE setores
    MODIFY COLUMN codigo VARCHAR(40) NOT NULL;

-- ============================================================
-- 2) USUÁRIOS / AUDITORES
-- ============================================================
ALTER TABLE usuarios
    ADD COLUMN motivo_inativacao TEXT NULL,
    ADD COLUMN inativado_em DATETIME NULL;

-- ============================================================
-- 3) AUDITORIAS
-- ============================================================
ALTER TABLE auditorias
    ADD COLUMN tipo VARCHAR(20) NOT NULL DEFAULT 'periodica',
    ADD COLUMN motivo_extraordinaria TEXT NULL,
    ADD COLUMN prazo DATE NULL,
    ADD COLUMN notificar_em DATETIME NULL,
    ADD COLUMN iniciada_em DATETIME NULL,
    ADD COLUMN finalizada_em DATETIME NULL,
    ADD COLUMN duracao_segundos INT NULL;

-- ============================================================
-- 4) EVIDÊNCIAS
-- ============================================================
CREATE TABLE IF NOT EXISTS evidencias_auditoria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    auditoria_id INT NOT NULL,
    resposta_id INT NULL,
    criado_por INT NULL,
    nome_original VARCHAR(255) NOT NULL,
    nome_arquivo VARCHAR(255) NOT NULL,
    caminho VARCHAR(500) NOT NULL,
    mime_type VARCHAR(120) NULL,
    tamanho_bytes BIGINT NULL,
    descricao TEXT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_evidencias_auditoria (auditoria_id),
    INDEX idx_evidencias_resposta (resposta_id)
);

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================
