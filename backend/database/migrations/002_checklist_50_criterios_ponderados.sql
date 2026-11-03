-- Sensus 5S - Fase 2: checklist reduzido com 50 critérios ponderados (10 por senso)
-- ATENÇÃO:
-- 1) Faça backup do banco antes de executar.
-- 2) Execute quando não houver auditoria em andamento.
-- 3) Esta migration não apaga critérios antigos: desativa os que não fazem parte
--    do novo checklist e mantém os registros históricos para consulta.
-- 4) A escala de nota da auditoria é de 1 a 5; o peso de cada critério é de 1 a 3.
--
-- Compatibilidade: MySQL 8.x. Selecione primeiro o banco local correto.

DROP TEMPORARY TABLE IF EXISTS tmp_criterios_sensus;

CREATE TEMPORARY TABLE tmp_criterios_sensus (
    senso_codigo VARCHAR(20) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    objetivo VARCHAR(255) NOT NULL,
    peso TINYINT NOT NULL,
    ordem INT NOT NULL,
    PRIMARY KEY (senso_codigo, titulo)
);

INSERT INTO tmp_criterios_sensus (senso_codigo, titulo, objetivo, peso, ordem)
VALUES

('SEIRI', 'Existem itens sem uso no ambiente', 'Eliminar excessos e manter apenas o necessário.', 2, 1),
('SEIRI', 'Materiais obsoletos foram removidos', 'Eliminar excessos e manter apenas o necessário.', 2, 2),
('SEIRI', 'Ferramentas duplicadas foram eliminadas', 'Eliminar excessos e manter apenas o necessário.', 1, 3),
('SEIRI', 'Documentos antigos foram descartados', 'Eliminar excessos e manter apenas o necessário.', 2, 4),
('SEIRI', 'Itens pessoais são mínimos no ambiente', 'Eliminar excessos e manter apenas o necessário.', 1, 5),
('SEIRI', 'Há identificação de itens desnecessários', 'Eliminar excessos e manter apenas o necessário.', 2, 6),
('SEIRI', 'Sobras de materiais foram reduzidas', 'Eliminar excessos e manter apenas o necessário.', 2, 7),
('SEIRI', 'Equipamentos quebrados foram descartados', 'Eliminar excessos e manter apenas o necessário.', 3, 8),
('SEIRI', 'Estoques excessivos foram eliminados', 'Eliminar excessos e manter apenas o necessário.', 3, 9),
('SEIRI', 'Materiais sem função clara foram removidos', 'Eliminar excessos e manter apenas o necessário.', 2, 10),
('SEITON', 'Itens têm locais definidos', 'Ter tudo no lugar certo e facilitar o acesso.', 3, 1),
('SEITON', 'Ferramentas são guardadas após uso', 'Ter tudo no lugar certo e facilitar o acesso.', 3, 2),
('SEITON', 'Etiquetas de identificação estão visíveis', 'Ter tudo no lugar certo e facilitar o acesso.', 2, 3),
('SEITON', 'A organização facilita o acesso rápido', 'Ter tudo no lugar certo e facilitar o acesso.', 2, 4),
('SEITON', 'O layout do espaço é otimizado', 'Ter tudo no lugar certo e facilitar o acesso.', 3, 5),
('SEITON', 'Materiais são organizados por frequência de uso', 'Ter tudo no lugar certo e facilitar o acesso.', 2, 6),
('SEITON', 'Cores e padrões ajudam na identificação', 'Ter tudo no lugar certo e facilitar o acesso.', 1, 7),
('SEITON', 'Há sinalização clara nos espaços', 'Ter tudo no lugar certo e facilitar o acesso.', 2, 8),
('SEITON', 'Caminhos de circulação estão livres', 'Ter tudo no lugar certo e facilitar o acesso.', 3, 9),
('SEITON', 'A posição dos itens é lógica e intuitiva', 'Ter tudo no lugar certo e facilitar o acesso.', 2, 10),
('SEISO', 'O ambiente está limpo diariamente', 'Manter o ambiente limpo e identificar problemas.', 3, 1),
('SEISO', 'Não há sujeira acumulada', 'Manter o ambiente limpo e identificar problemas.', 2, 2),
('SEISO', 'Ferramentas são limpas após o uso', 'Manter o ambiente limpo e identificar problemas.', 2, 3),
('SEISO', 'Máquinas estão livres de poeira', 'Manter o ambiente limpo e identificar problemas.', 3, 4),
('SEISO', 'A falta de limpeza é rapidamente detectada', 'Manter o ambiente limpo e identificar problemas.', 2, 5),
('SEISO', 'Há rotina de limpeza definida', 'Manter o ambiente limpo e identificar problemas.', 2, 6),
('SEISO', 'Os responsáveis pela limpeza são definidos', 'Manter o ambiente limpo e identificar problemas.', 2, 7),
('SEISO', 'Lixeiras estão disponíveis e são adequadas', 'Manter o ambiente limpo e identificar problemas.', 2, 8),
('SEISO', 'Resíduos são descartados corretamente', 'Manter o ambiente limpo e identificar problemas.', 3, 9),
('SEISO', 'Equipamentos são inspecionados durante a limpeza', 'Manter o ambiente limpo e identificar problemas.', 3, 10),
('SEIKETSU', 'Existem padrões definidos de organização', 'Manter os padrões dos três primeiros sensos.', 3, 1),
('SEIKETSU', 'Procedimentos estão documentados', 'Manter os padrões dos três primeiros sensos.', 2, 2),
('SEIKETSU', 'Checklists são utilizados', 'Manter os padrões dos três primeiros sensos.', 2, 3),
('SEIKETSU', 'Treinamento é realizado regularmente', 'Manter os padrões dos três primeiros sensos.', 2, 4),
('SEIKETSU', 'Padrões visuais são aplicados', 'Manter os padrões dos três primeiros sensos.', 2, 5),
('SEIKETSU', 'Sinalizações são padronizadas', 'Manter os padrões dos três primeiros sensos.', 1, 6),
('SEIKETSU', 'Normas são seguidas por todos', 'Manter os padrões dos três primeiros sensos.', 3, 7),
('SEIKETSU', 'Auditorias internas são feitas', 'Manter os padrões dos três primeiros sensos.', 3, 8),
('SEIKETSU', 'Os processos são consistentes', 'Manter os padrões dos três primeiros sensos.', 3, 9),
('SEIKETSU', 'O ambiente permanece organizado ao longo do tempo', 'Manter os padrões dos três primeiros sensos.', 3, 10),
('SHITSUKE', 'Funcionários seguem as regras espontaneamente', 'Transformar o 5S em cultura e hábito contínuo.', 3, 1),
('SHITSUKE', 'Há disciplina no cumprimento das normas', 'Transformar o 5S em cultura e hábito contínuo.', 3, 2),
('SHITSUKE', 'A cultura 5S é disseminada', 'Transformar o 5S em cultura e hábito contínuo.', 2, 3),
('SHITSUKE', 'Treinamentos contínuos acontecem', 'Transformar o 5S em cultura e hábito contínuo.', 2, 4),
('SHITSUKE', 'A liderança dá exemplo', 'Transformar o 5S em cultura e hábito contínuo.', 3, 5),
('SHITSUKE', 'Há comprometimento da equipe', 'Transformar o 5S em cultura e hábito contínuo.', 2, 6),
('SHITSUKE', 'As regras são cumpridas sem cobrança constante', 'Transformar o 5S em cultura e hábito contínuo.', 3, 7),
('SHITSUKE', 'Auditorias são bem aceitas', 'Transformar o 5S em cultura e hábito contínuo.', 1, 8),
('SHITSUKE', 'A melhoria contínua é incentivada', 'Transformar o 5S em cultura e hábito contínuo.', 2, 9),
('SHITSUKE', 'Há reconhecimento de boas práticas', 'Transformar o 5S em cultura e hábito contínuo.', 1, 10);

-- Desativa critérios antigos desses cinco sensos que não fazem parte do checklist novo.
-- Os critérios e respostas antigas permanecem no banco para preservar o histórico.
UPDATE criterios_5s c
INNER JOIN sensos_5s s ON s.id = c.senso_id
SET c.ativo = FALSE
WHERE (
    UPPER(TRIM(s.codigo)) IN ('SEIRI', 'SEITON', 'SEISO', 'SEIKETSU', 'SHITSUKE')
    OR UPPER(TRIM(s.nome)) LIKE '%SEIRI%'
    OR UPPER(TRIM(s.nome)) LIKE '%SEITON%'
    OR UPPER(TRIM(s.nome)) LIKE '%SEISO%'
    OR UPPER(TRIM(s.nome)) LIKE '%SEIKETSU%'
    OR UPPER(TRIM(s.nome)) LIKE '%SHITSUKE%'
)
AND NOT EXISTS (
    SELECT 1
    FROM tmp_criterios_sensus t
    WHERE TRIM(t.titulo) = TRIM(c.titulo)
      AND (
          UPPER(TRIM(s.codigo)) = t.senso_codigo
          OR UPPER(TRIM(s.nome)) LIKE CONCAT('%', t.senso_codigo, '%')
      )
);

-- Atualiza peso, ordem e objetivo dos critérios que já existirem com o mesmo título.
UPDATE criterios_5s c
INNER JOIN sensos_5s s ON s.id = c.senso_id
INNER JOIN tmp_criterios_sensus t
    ON TRIM(t.titulo) = TRIM(c.titulo)
   AND (
       UPPER(TRIM(s.codigo)) = t.senso_codigo
       OR UPPER(TRIM(s.nome)) LIKE CONCAT('%', t.senso_codigo, '%')
   )
SET
    c.objetivo = t.objetivo,
    c.peso = t.peso,
    c.ordem = t.ordem,
    c.ativo = TRUE;

-- Insere os critérios que ainda não existem, sem duplicar títulos.
INSERT INTO criterios_5s (senso_id, titulo, objetivo, peso, ordem, ativo)
SELECT
    s.id,
    t.titulo,
    t.objetivo,
    t.peso,
    t.ordem,
    TRUE
FROM tmp_criterios_sensus t
INNER JOIN sensos_5s s
    ON UPPER(TRIM(s.codigo)) = t.senso_codigo
    OR UPPER(TRIM(s.nome)) LIKE CONCAT('%', t.senso_codigo, '%')
WHERE NOT EXISTS (
    SELECT 1
    FROM criterios_5s c
    WHERE c.senso_id = s.id
      AND TRIM(c.titulo) = TRIM(t.titulo)
);

DROP TEMPORARY TABLE IF EXISTS tmp_criterios_sensus;

-- Verificação esperada: 10 critérios ativos por senso e 50 no total.
SELECT
    s.codigo,
    s.nome,
    COUNT(c.id) AS criterios_ativos
FROM sensos_5s s
LEFT JOIN criterios_5s c
    ON c.senso_id = s.id
   AND c.ativo = TRUE
GROUP BY s.id, s.codigo, s.nome, s.ordem
ORDER BY s.ordem;
