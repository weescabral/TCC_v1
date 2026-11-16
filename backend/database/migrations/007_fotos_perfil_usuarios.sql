-- Sensus 5S - Fotos de perfil compartilhadas entre os usuários da empresa
-- Execute uma única vez no banco utilizado pelo sistema.
ALTER TABLE usuarios
    ADD COLUMN foto_url VARCHAR(1000) NULL,
    ADD COLUMN foto_public_id VARCHAR(255) NULL;
