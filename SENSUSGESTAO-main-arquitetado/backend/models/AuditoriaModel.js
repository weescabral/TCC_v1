const db = require('../config/database');
const { classificarPercentual } = require('../utils/classificacao');

async function listar(empresaId) {
    const [rows] = await db.query(
        `
        SELECT
            a.*,
            s.nome AS setor_nome,
            u.nome AS auditor_nome
        FROM auditorias a
        INNER JOIN setores s
            ON s.id = a.setor_id
        INNER JOIN usuarios u
            ON u.id = a.usuario_id
        WHERE a.empresa_id = ?
        ORDER BY a.data_auditoria DESC
        `,
        [empresaId]
    );

    return rows;
}

async function buscarPorId(id, empresaId) {
    const [auditorias] = await db.query(
        `
        SELECT
            a.*,
            s.nome AS setor_nome,
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

    auditoria.respostas = respostas;
    auditoria.resultados_sensos = resultadosSensos;

    return auditoria;
}

async function criar({
    empresa_id,
    setor_id,
    usuario_id,
    observacao_geral
}) {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const codigo = `AUD-${Date.now()}`;

        const [result] = await connection.query(
            `
            INSERT INTO auditorias
            (
                codigo,
                empresa_id,
                setor_id,
                usuario_id,
                observacao_geral,
                status
            )
            VALUES (?, ?, ?, ?, ?, 'rascunho')
            `,
            [
                codigo,
                empresa_id,
                setor_id,
                usuario_id,
                observacao_geral || null
            ]
        );

        const auditoriaId = result.insertId;

        const [sensos] = await connection.query(
            `
            SELECT id
            FROM sensos_5s
            ORDER BY ordem
            `
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
                `
                INSERT INTO resultados_sensos
                (
                    auditoria_id,
                    senso_id,
                    pontuacao_total,
                    pontuacao_maxima,
                    percentual,
                    classificacao,
                    status
                )
                VALUES (?, ?, 0, 0, 0, NULL, 'pendente')
                `,
                [auditoriaId, senso.id]
            );
        }

        await connection.commit();

        return buscarPorId(auditoriaId, empresa_id);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
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

    return recalcularResultadoSenso(
        auditoria_id,
        criterio.senso_id
    );
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

    const [[auditoria]] = await db.query(
        `
        SELECT setor_id
        FROM auditorias
        WHERE id = ?
        LIMIT 1
        `,
        [auditoriaId]
    );

    if (auditoria?.setor_id) {
        await db.query(
            `
            UPDATE setores
            SET score_atual = ?
            WHERE id = ?
            `,
            [percentual, auditoria.setor_id]
        );
    }

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
        SET status = 'finalizada'
        WHERE id = ?
          AND empresa_id = ?
        `,
        [id, empresaId]
    );

    const [respostasCriticas] = await db.query(
        `
        SELECT
            r.criterio_id,
            r.observacao,
            c.titulo
        FROM respostas_auditoria r
        INNER JOIN criterios_5s c
            ON c.id = r.criterio_id
        WHERE r.auditoria_id = ?
          AND r.gera_plano_acao = TRUE
        `,
        [id]
    );

    for (const resposta of respostasCriticas) {
        const descricao =
            resposta.observacao
            || `Corrigir a não conformidade identificada no critério: ${resposta.titulo}.`;

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
                status
            )
            VALUES (?, ?, ?, ?, ?, 'alta', 'pendente')
            `,
            [
                id,
                auditoria.setor_id,
                resposta.criterio_id,
                auditoria.usuario_id,
                descricao
            ]
        );
    }

    return {
        ...totais,
        status: 'finalizada'
    };
}

module.exports = {
    listar,
    buscarPorId,
    criar,
    salvarResposta,
    recalcularResultadoSenso,
    recalcularAuditoria,
    finalizar
};