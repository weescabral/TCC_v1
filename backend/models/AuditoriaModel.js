const db = require('../config/database');
const { classificarPercentual } = require('../utils/classificacao');
const NotificacaoModel = require('./NotificacaoModel');

async function listar(empresaId, usuario = null) {
    const filtroAuditor = usuario?.perfil === 'auditor' ? 'AND s.auditor_id = ?' : '';
    const parametros = usuario?.perfil === 'auditor' ? [empresaId, usuario.id] : [empresaId];
    const [rows] = await db.query(
        `
        SELECT
            a.*,
            s.nome AS setor_nome,
            s.descricao AS setor_descricao,
            s.auditor_id AS setor_auditor_id,
            u.nome AS auditor_nome,
            (SELECT COUNT(*) FROM resultados_sensos rs WHERE rs.auditoria_id = a.id AND rs.status = 'concluido') AS sensos_concluidos
        FROM auditorias a
        INNER JOIN setores s
            ON s.id = a.setor_id
        INNER JOIN usuarios u
            ON u.id = a.usuario_id
        WHERE a.empresa_id = ?
          ${filtroAuditor}
        ORDER BY a.data_auditoria DESC
        `,
        parametros
    );

    return rows;
}

async function buscarPorId(id, empresaId) {
    const [auditorias] = await db.query(
        `
        SELECT
            a.*,
            s.nome AS setor_nome,
            s.descricao AS setor_descricao,
            s.auditor_id AS setor_auditor_id,
            s.periodicidade_auditoria AS setor_periodicidade_auditoria,
            u.nome AS auditor_nome
        FROM auditorias a
        INNER JOIN setores s
            ON s.id = a.setor_id
        INNER JOIN usuarios u
            ON u.id = a.usuario_id
        WHERE a.id = ?
          AND a.empresa_id = ?
        LIMIT 1
        `,
        [id, empresaId]
    );

    const auditoria = auditorias[0];

    if (!auditoria) {
        return null;
    }

    const [respostas] = await db.query(
        `
        SELECT
            r.id,
            r.auditoria_id,
            r.criterio_id,
            r.nota,
            r.peso_aplicado,
            r.pontuacao_obtida,
            r.pontuacao_maxima,
            r.observacao,
            r.gera_plano_acao,

            c.senso_id,
            s.codigo AS senso,
            s.nome AS nome_senso,
            s.ordem AS ordem_senso,

            c.titulo,
            c.objetivo,
            c.peso,
            c.ordem,

            rs.percentual AS percentual_senso,
            rs.classificacao AS classificacao_senso,
            rs.status AS status_senso

        FROM respostas_auditoria r

        INNER JOIN criterios_5s c
            ON c.id = r.criterio_id

        INNER JOIN sensos_5s s
            ON s.id = c.senso_id

        LEFT JOIN resultados_sensos rs
            ON rs.auditoria_id = r.auditoria_id
           AND rs.senso_id = c.senso_id

        WHERE r.auditoria_id = ?

        ORDER BY
            s.ordem,
            c.ordem
        `,
        [id]
    );

    const [resultadosSensos] = await db.query(
        `
        SELECT
            rs.id,
            rs.auditoria_id,
            rs.senso_id,
            s.codigo,
            s.nome,
            s.descricao,
            s.ordem,
            rs.pontuacao_total,
            rs.pontuacao_maxima,
            rs.percentual,
            rs.classificacao,
            rs.status
        FROM resultados_sensos rs
        INNER JOIN sensos_5s s
            ON s.id = rs.senso_id
        WHERE rs.auditoria_id = ?
        ORDER BY s.ordem
        `,
        [id]
    );

    const [evidencias] = await db.query(
        `
        SELECT
            e.id,
            e.auditoria_id,
            e.resposta_id,
            e.criado_por,
            e.nome_original,
            e.nome_arquivo,
            e.caminho,
            e.mime_type,
            e.tamanho_bytes,
            e.descricao,
            e.criado_em
        FROM evidencias_auditoria e
        WHERE e.auditoria_id = ?
        ORDER BY e.criado_em ASC, e.id ASC
        `,
        [id]
    );

    const [planosAcao] = await db.query(
        `
        SELECT
            pa.*,
            c.titulo AS criterio_titulo,
            c.senso_id AS criterio_senso_id,
            s.codigo AS senso,
            s.nome AS nome_senso,
            s.ordem AS ordem_senso,
            u.nome AS responsavel_nome
        FROM planos_acao pa
        LEFT JOIN criterios_5s c
            ON c.id = pa.criterio_id
        LEFT JOIN sensos_5s s
            ON s.id = c.senso_id
        LEFT JOIN usuarios u
            ON u.id = pa.responsavel_id
        WHERE pa.auditoria_id = ?
        ORDER BY pa.id DESC
        `,
        [id]
    );

    const evidenciasPorResposta = new Map();
    for (const evidencia of evidencias) {
        const chave = Number(evidencia.resposta_id || 0);
        if (!evidenciasPorResposta.has(chave)) {
            evidenciasPorResposta.set(chave, []);
        }
        evidenciasPorResposta.get(chave).push(evidencia);
    }

    for (const resposta of respostas) {
        resposta.evidencias = evidenciasPorResposta.get(Number(resposta.id)) || [];
    }

    auditoria.respostas = respostas;
    auditoria.resultados_sensos = resultadosSensos;
    auditoria.evidencias = evidencias;
    auditoria.planos_acao = planosAcao;

    return auditoria;
}

async function criar({
    empresa_id,
    setor_id,
    usuario_id,
    observacao_geral,
    tipo = 'periodica',
    motivo_extraordinaria = null,
    prazo = null,
    notificar_em = null,
    data_auditoria = null
}) {
    const connection = await db.getConnection();
    let bloqueioCodigo = null;

    try {
        await connection.beginTransaction();

        const [setores] = await connection.query(
            `SELECT id, nome, descricao, auditor_id, periodicidade_auditoria, DATE_FORMAT(proxima_auditoria_em, '%Y-%m-%d') AS proxima_auditoria_em, ativo
             FROM setores
             WHERE id = ? AND empresa_id = ?
             LIMIT 1`,
            [setor_id, empresa_id]
        );

        const setor = setores[0];

        if (!setor) {
            const error = new Error('Setor não encontrado.');
            error.status = 404;
            throw error;
        }

        if (!setor.ativo) {
            const error = new Error('Não é possível iniciar auditoria em um setor inativo.');
            error.status = 409;
            throw error;
        }

        if (!setor.auditor_id) {
            const error = new Error('Este setor não possui auditor responsável. Cadastre um auditor antes de iniciar a auditoria.');
            error.status = 409;
            throw error;
        }

        const [auditores] = await connection.query(
            `SELECT id, nome, ativo, perfil
             FROM usuarios
             WHERE id = ? AND empresa_id = ?
             LIMIT 1`,
            [setor.auditor_id, empresa_id]
        );

        const auditor = auditores[0];

        if (!auditor || !auditor.ativo || !['auditor', 'administrador'].includes(auditor.perfil)) {
            const error = new Error('O auditor responsável pelo setor está inativo ou não possui perfil válido.');
            error.status = 409;
            throw error;
        }

        if (usuario_id && Number(usuario_id) !== Number(setor.auditor_id)) {
            const [usuarioLogado] = await connection.query(
                `SELECT id, perfil FROM usuarios WHERE id = ? AND empresa_id = ? LIMIT 1`,
                [usuario_id, empresa_id]
            );

            if (usuarioLogado[0]?.perfil !== 'administrador') {
                const error = new Error('Você só pode realizar auditorias dos setores sob sua responsabilidade.');
                error.status = 403;
                throw error;
            }
        }

        if (!['periodica', 'extraordinaria'].includes(tipo)) {
            const error = new Error('Tipo de auditoria inválido.');
            error.status = 400;
            throw error;
        }

        if (tipo === 'extraordinaria' && !String(motivo_extraordinaria || '').trim()) {
            const error = new Error('Informe o motivo da auditoria extraordinária.');
            error.status = 400;
            throw error;
        }

        const prazoProgramado = tipo === 'periodica' ? (setor.proxima_auditoria_em || prazo) : prazo;
        if (!prazoProgramado && tipo === 'periodica') {
            const error = new Error('Não foi possível calcular o prazo. Confira a periodicidade cadastrada no setor.');
            error.status = 409;
            throw error;
        }

        if (notificar_em && prazoProgramado && new Date(notificar_em) > new Date(prazoProgramado)) {
            const error = new Error('A data de notificação não pode ser posterior ao prazo da auditoria.');
            error.status = 400;
            throw error;
        }

        // O índice UNIQUE de auditorias.codigo é global (não é composto por empresa).
        // Portanto, a sequência e o bloqueio também precisam ser globais por ano.
        // Isso evita colisões entre empresas e concorrência entre criações simultâneas.
        const anoCodigo = new Date().getFullYear();
        bloqueioCodigo = `sensus_aud_global_${anoCodigo}`;
        const [[lock]] = await connection.query(
            'SELECT GET_LOCK(?, 10) AS obtido',
            [bloqueioCodigo]
        );

        if (Number(lock?.obtido) !== 1) {
            const error = new Error('Não foi possível reservar o próximo código. Tente novamente.');
            error.status = 503;
            throw error;
        }

        const prefixo = `AUD-${anoCodigo}-`;
        const [[sequencia]] = await connection.query(
            `SELECT COALESCE(MAX(CAST(SUBSTRING(codigo, ?) AS UNSIGNED)), 0) AS ultimo
             FROM auditorias
             WHERE codigo REGEXP ?`,
            [prefixo.length + 1, `^AUD-${anoCodigo}-[0-9]+$`]
        );

        let proximo = Number(sequencia?.ultimo || 0) + 1;
        let codigo = `${prefixo}${String(proximo).padStart(4, '0')}`;

        // Proteção adicional caso existam códigos antigos fora do padrão esperado.
        // O bloqueio global mantém esta verificação segura entre requisições novas.
        while (true) {
            const [[existente]] = await connection.query(
                'SELECT id FROM auditorias WHERE codigo = ? LIMIT 1',
                [codigo]
            );
            if (!existente) break;
            proximo += 1;
            codigo = `${prefixo}${String(proximo).padStart(4, '0')}`;
        }

        const [result] = await connection.query(
            `INSERT INTO auditorias
            (
                codigo,
                empresa_id,
                setor_id,
                usuario_id,
                data_auditoria,
                observacao_geral,
                status,
                tipo,
                motivo_extraordinaria,
                prazo,
                notificar_em,
                iniciada_em
            )
            VALUES (?, ?, ?, ?, UTC_TIMESTAMP(), ?, 'rascunho', ?, ?, ?, ?, UTC_TIMESTAMP())`,
            [
                codigo,
                empresa_id,
                setor_id,
                setor.auditor_id,
                observacao_geral || null,
                tipo,
                tipo === 'extraordinaria' ? motivo_extraordinaria.trim() : null,
                prazoProgramado || null,
                notificar_em || null
            ]
        );

        const auditoriaId = result.insertId;

        const [sensos] = await connection.query(
            `SELECT id FROM sensos_5s ORDER BY ordem`
        );

        if (sensos.length !== 5) {
            const error = new Error(
                'Os cinco sensos 5S precisam estar cadastrados antes de criar uma auditoria.'
            );
            error.status = 400;
            throw error;
        }

        for (const senso of sensos) {
            await connection.query(
                `INSERT INTO resultados_sensos
                (auditoria_id, senso_id, pontuacao_total, pontuacao_maxima, percentual, classificacao, status)
                VALUES (?, ?, 0, 0, 0, NULL, 'pendente')`,
                [auditoriaId, senso.id]
            );
        }

        await connection.commit();

        return buscarPorId(auditoriaId, empresa_id);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        if (bloqueioCodigo) {
            try { await connection.query('SELECT RELEASE_LOCK(?)', [bloqueioCodigo]); }
            catch (e) { console.error('Falha ao liberar bloqueio do código da auditoria:', e.message); }
        }
        connection.release();
    }
}

async function salvarResposta({
    auditoria_id,
    criterio_id,
    nota,
    observacao
}) {
    const [[criterio]] = await db.query(
        `
        SELECT
            c.id,
            c.senso_id,
            c.peso
        FROM criterios_5s c
        WHERE c.id = ?
          AND c.ativo = TRUE
        LIMIT 1
        `,
        [criterio_id]
    );

    if (!criterio) {
        const error = new Error('Critério não encontrado.');
        error.status = 404;
        throw error;
    }

    const peso = Number(criterio.peso || 1);
    const notaNumero = Number(nota);

    const pontuacaoObtida = notaNumero * peso;
    const pontuacaoMaxima = 5 * peso;
    const geraPlanoAcao = notaNumero <= 2;

    await db.query(
        `
        INSERT INTO respostas_auditoria
        (
            auditoria_id,
            criterio_id,
            nota,
            peso_aplicado,
            pontuacao_obtida,
            pontuacao_maxima,
            observacao,
            gera_plano_acao
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)

        ON DUPLICATE KEY UPDATE
            nota = VALUES(nota),
            peso_aplicado = VALUES(peso_aplicado),
            pontuacao_obtida = VALUES(pontuacao_obtida),
            pontuacao_maxima = VALUES(pontuacao_maxima),
            observacao = VALUES(observacao),
            gera_plano_acao = VALUES(gera_plano_acao)
        `,
        [
            auditoria_id,
            criterio_id,
            notaNumero,
            peso,
            pontuacaoObtida,
            pontuacaoMaxima,
            observacao || null,
            geraPlanoAcao
        ]
    );

    const [[resposta]] = await db.query(
        `
        SELECT id
        FROM respostas_auditoria
        WHERE auditoria_id = ?
          AND criterio_id = ?
        LIMIT 1
        `,
        [auditoria_id, criterio_id]
    );

    const totais = await recalcularResultadoSenso(
        auditoria_id,
        criterio.senso_id
    );

    return {
        resposta_id: resposta?.id || null,
        ...totais
    };
}

async function recalcularResultadoSenso(auditoriaId, sensoId) {
    const [[totais]] = await db.query(
        `
        SELECT
            COALESCE(SUM(r.pontuacao_obtida), 0) AS total,
            COALESCE(SUM(r.pontuacao_maxima), 0) AS maxima,
            COUNT(DISTINCT r.criterio_id) AS criterios_respondidos
        FROM respostas_auditoria r
        INNER JOIN criterios_5s c
            ON c.id = r.criterio_id
        WHERE r.auditoria_id = ?
          AND c.senso_id = ?
        `,
        [auditoriaId, sensoId]
    );

    const [[criterios]] = await db.query(
        `
        SELECT COUNT(*) AS total_criterios
        FROM criterios_5s
        WHERE senso_id = ?
          AND ativo = TRUE
        `,
        [sensoId]
    );

    const total = Number(totais.total || 0);
    const maxima = Number(totais.maxima || 0);

    const criteriosRespondidos = Number(
        totais.criterios_respondidos || 0
    );

    const totalCriterios = Number(
        criterios.total_criterios || 0
    );

    const percentual =
        maxima > 0
            ? Number(((total / maxima) * 100).toFixed(2))
            : 0;

    const classificacao =
        criteriosRespondidos > 0
            ? classificarPercentual(percentual)
            : null;

    let status = 'pendente';

    if (
        criteriosRespondidos > 0
        && criteriosRespondidos < totalCriterios
    ) {
        status = 'em_andamento';
    }

    if (
        totalCriterios > 0
        && criteriosRespondidos === totalCriterios
    ) {
        status = 'concluido';
    }

    await db.query(
        `
        UPDATE resultados_sensos
        SET
            pontuacao_total = ?,
            pontuacao_maxima = ?,
            percentual = ?,
            classificacao = ?,
            status = ?
        WHERE auditoria_id = ?
          AND senso_id = ?
        `,
        [
            total,
            maxima,
            percentual,
            classificacao,
            status,
            auditoriaId,
            sensoId
        ]
    );

    return {
        senso_id: sensoId,
        total,
        maxima,
        percentual,
        classificacao,
        status,
        criteriosRespondidos,
        totalCriterios
    };
}

async function recalcularAuditoria(auditoriaId) {
    const [[totais]] = await db.query(
        `
        SELECT
            COALESCE(SUM(pontuacao_total), 0) AS total,
            COALESCE(SUM(pontuacao_maxima), 0) AS maxima
        FROM resultados_sensos
        WHERE auditoria_id = ?
        `,
        [auditoriaId]
    );

    const total = Number(totais.total || 0);
    const maxima = Number(totais.maxima || 0);

    const percentual =
        maxima > 0
            ? Number(((total / maxima) * 100).toFixed(2))
            : 0;

    const classificacao = classificarPercentual(percentual);

    await db.query(
        `
        UPDATE auditorias
        SET
            pontuacao_total = ?,
            pontuacao_maxima = ?,
            percentual_geral = ?,
            classificacao = ?
        WHERE id = ?
        `,
        [
            total,
            maxima,
            percentual,
            classificacao,
            auditoriaId
        ]
    );

    // O score do setor só é atualizado após a auditoria ser finalizada.
    // Respostas parciais e auditorias canceladas não alteram o último resultado oficial.

    return {
        total,
        maxima,
        percentual,
        classificacao
    };
}

async function finalizar(id, empresaId) {
    const auditoria = await buscarPorId(id, empresaId);

    if (!auditoria) {
        return null;
    }

    if (auditoria.status === 'finalizada') {
        const error = new Error(
            'Esta auditoria já foi finalizada.'
        );

        error.status = 409;
        throw error;
    }

    const [[situacaoSensos]] = await db.query(
        `
        SELECT
            COUNT(*) AS total_sensos,
            SUM(
                CASE
                    WHEN status = 'concluido' THEN 1
                    ELSE 0
                END
            ) AS sensos_concluidos
        FROM resultados_sensos
        WHERE auditoria_id = ?
        `,
        [id]
    );

    const totalSensos = Number(
        situacaoSensos.total_sensos || 0
    );

    const sensosConcluidos = Number(
        situacaoSensos.sensos_concluidos || 0
    );

    if (totalSensos !== 5) {
        const error = new Error(
            'A auditoria precisa possuir os cinco sensos cadastrados.'
        );

        error.status = 400;
        throw error;
    }

    if (sensosConcluidos !== 5) {
        const error = new Error(
            `A auditoria ainda possui ${
                5 - sensosConcluidos
            } senso(s) não concluído(s).`
        );

        error.status = 400;
        throw error;
    }

    const totais = await recalcularAuditoria(id);

    await db.query(
        `
        UPDATE auditorias
        SET
            status = 'finalizada',
            finalizada_em = UTC_TIMESTAMP(),
            duracao_segundos = TIMESTAMPDIFF(SECOND, COALESCE(iniciada_em, data_auditoria), UTC_TIMESTAMP())
        WHERE id = ?
          AND empresa_id = ?
        `,
        [id, empresaId]
    );

    // A próxima auditoria periódica é calculada a partir da conclusão real deste ciclo.
    // Auditorias extraordinárias não alteram o calendário regular do setor.
    if (auditoria.tipo !== 'extraordinaria') {
        await db.query(
            `UPDATE setores s
             SET s.proxima_auditoria_em = DATE(CASE s.periodicidade_auditoria
               WHEN 'semanal' THEN DATE_ADD(DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-03:00')), INTERVAL 1 WEEK)
               WHEN 'quinzenal' THEN DATE_ADD(DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-03:00')), INTERVAL 15 DAY)
               WHEN 'bimestral' THEN DATE_ADD(DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-03:00')), INTERVAL 2 MONTH)
               WHEN 'trimestral' THEN DATE_ADD(DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-03:00')), INTERVAL 3 MONTH)
               WHEN 'semestral' THEN DATE_ADD(DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-03:00')), INTERVAL 6 MONTH)
               WHEN 'anual' THEN DATE_ADD(DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-03:00')), INTERVAL 1 YEAR)
               ELSE DATE_ADD(DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-03:00')), INTERVAL 1 MONTH)
             END)
             WHERE s.id = ? AND s.empresa_id = ?`,
            [auditoria.setor_id, empresaId]
        );
    }

    // Publica o último score do setor somente depois da conclusão dos cinco sensos.
    await db.query(
        `
        UPDATE setores
        SET score_atual = ?
        WHERE id = ?
          AND empresa_id = ?
        `,
        [totais.percentual, auditoria.setor_id, empresaId]
    );

    const [[dadosTempo]] = await db.query(
        `SELECT
            a.duracao_segundos,
            DATE_FORMAT(a.finalizada_em, '%Y-%m-%dT%H:%i:%s.000Z') AS finalizada_em_utc,
            DATE_FORMAT(s.proxima_auditoria_em, '%Y-%m-%d') AS proxima_auditoria_em
         FROM auditorias a
         INNER JOIN setores s ON s.id = a.setor_id
         WHERE a.id = ?
         LIMIT 1`,
        [id]
    );

    const [respostasCriticas] = await db.query(
        `
        SELECT
            r.criterio_id,
            r.observacao,
            c.titulo,
            c.peso AS peso_criterio
        FROM respostas_auditoria r
        INNER JOIN criterios_5s c
            ON c.id = r.criterio_id
        WHERE r.auditoria_id = ?
          AND r.gera_plano_acao = TRUE
        `,
        [id]
    );

    // O prazo inicial dos planos de ação acompanha a periodicidade do setor,
    // contando a partir da data real de conclusão da auditoria.
    const [[prazoAutomatico]] = await db.query(
        `SELECT DATE(CASE periodicidade_auditoria
            WHEN 'semanal' THEN DATE_ADD(DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-03:00')), INTERVAL 7 DAY)
            WHEN 'quinzenal' THEN DATE_ADD(DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-03:00')), INTERVAL 15 DAY)
            WHEN 'mensal' THEN DATE_ADD(DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-03:00')), INTERVAL 1 MONTH)
            WHEN 'bimestral' THEN DATE_ADD(DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-03:00')), INTERVAL 2 MONTH)
            WHEN 'trimestral' THEN DATE_ADD(DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-03:00')), INTERVAL 3 MONTH)
            WHEN 'semestral' THEN DATE_ADD(DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-03:00')), INTERVAL 6 MONTH)
            WHEN 'anual' THEN DATE_ADD(DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-03:00')), INTERVAL 1 YEAR)
            ELSE DATE_ADD(DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-03:00')), INTERVAL 1 MONTH)
        END) AS prazo_conclusao
        FROM setores
        WHERE id = ? AND empresa_id = ?
        LIMIT 1`,
        [auditoria.setor_id, empresaId]
    );
    const prazoInicialPlano = prazoAutomatico?.prazo_conclusao || null;

    for (const resposta of respostasCriticas) {
        const descricao =
            resposta.observacao
            || `Corrigir a não conformidade identificada no critério: ${resposta.titulo}.`;

        // A prioridade inicial acompanha o peso do critério avaliado:
        // peso 1 = baixa, peso 2 = média, peso 3 = alta.
        const pesoCriterio = Number(resposta.peso_criterio);
        const prioridadeInicial = pesoCriterio === 1
            ? 'baixa'
            : pesoCriterio === 3
                ? 'alta'
                : 'media';

        await db.query(
            `
            INSERT INTO planos_acao
            (
                auditoria_id,
                setor_id,
                criterio_id,
                responsavel_id,
                descricao,
                prioridade,
                status,
                prazo_conclusao
            )
            VALUES (?, ?, ?, ?, ?, ?, 'pendente', ?)
            `,
            [
                id,
                auditoria.setor_id,
                resposta.criterio_id,
                auditoria.usuario_id,
                descricao,
                prioridadeInicial,
                prazoInicialPlano
            ]
        );
    }

    // A falha no serviço de notificações não deve impedir a conclusão da auditoria.
    try {
        await NotificacaoModel.registrarAuditoriaFinalizada({
            auditoriaId: Number(id),
            empresaId: Number(empresaId),
            codigo: auditoria.codigo,
            setorId: Number(auditoria.setor_id),
            percentual: totais.percentual,
            usuarioId: Number(auditoria.usuario_id),
            totalPlanos: respostasCriticas.length,
        });
    } catch (erroNotificacao) {
        console.error('Não foi possível registrar as notificações da auditoria:', erroNotificacao.message);
    }

    return {
        ...totais,
        duracao_segundos: Number(dadosTempo?.duracao_segundos || 0),
        finalizada_em: dadosTempo?.finalizada_em_utc || new Date().toISOString(),
        proxima_auditoria_em: dadosTempo?.proxima_auditoria_em || null,
        status: 'finalizada'
    };
}


async function excluirRascunho(id, empresaId) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [auditorias] = await connection.query(
            `SELECT id, status FROM auditorias WHERE id = ? AND empresa_id = ? FOR UPDATE`,
            [id, empresaId]
        );
        const auditoria = auditorias[0];
        if (!auditoria) {
            await connection.rollback();
            return { excluida: false, motivo: 'Auditoria não encontrada.' };
        }
        if (auditoria.status === 'finalizada') {
            await connection.rollback();
            return { excluida: false, motivo: 'Auditorias finalizadas não podem ser excluídas por esta opção.' };
        }
        const [[contagem]] = await connection.query(
            `SELECT COUNT(*) AS total FROM resultados_sensos WHERE auditoria_id = ? AND status = 'concluido'`,
            [id]
        );
        if (Number(contagem.total || 0) > 0) {
            await connection.rollback();
            return { excluida: false, motivo: 'Este rascunho já possui um senso concluído e não pode ser excluído.' };
        }
        // Remove dependências do rascunho explicitamente para não depender de ON DELETE CASCADE.
        await connection.query(`DELETE FROM evidencias_auditoria WHERE auditoria_id = ?`, [id]);
        await connection.query(`DELETE FROM planos_acao WHERE auditoria_id = ?`, [id]);
        await connection.query(`DELETE FROM respostas_auditoria WHERE auditoria_id = ?`, [id]);
        await connection.query(`DELETE FROM resultados_sensos WHERE auditoria_id = ?`, [id]);
        await connection.query(`DELETE FROM auditorias WHERE id = ? AND empresa_id = ?`, [id, empresaId]);
        await connection.commit();
        return { excluida: true };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    listar,
    buscarPorId,
    criar,
    salvarResposta,
    recalcularResultadoSenso,
    recalcularAuditoria,
    finalizar,
    excluirRascunho
};