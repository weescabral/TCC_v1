const CriterioModel = require('../models/CriterioModel');

async function listar(req, res) {
    const criterios = await CriterioModel.listar();

    return res.status(200).json(criterios);
}

async function listarPorSenso(req, res) {
    const sensoId = Number(req.params.sensoId);

    if (!Number.isInteger(sensoId) || sensoId <= 0) {
        return res.status(400).json({
            erro: 'O ID do senso é inválido.'
        });
    }

    const criterios = await CriterioModel.listarPorSenso(sensoId);

    return res.status(200).json(criterios);
}

async function buscarPorId(req, res) {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            erro: 'O ID do critério é inválido.'
        });
    }

    const criterio = await CriterioModel.buscarPorId(id);

    if (!criterio) {
        return res.status(404).json({
            erro: 'Critério não encontrado.'
        });
    }

    return res.status(200).json(criterio);
}

async function criar(req, res) {
    const {
        senso_id,
        titulo,
        objetivo,
        peso,
        ordem
    } = req.body;

    const sensoId = Number(senso_id);
    const ordemNumero = Number(ordem);
    const pesoNumero = peso === undefined ? 1 : Number(peso);

    if (!Number.isInteger(sensoId) || sensoId <= 0) {
        return res.status(400).json({
            erro: 'O campo senso_id é obrigatório e deve ser válido.'
        });
    }

    if (!titulo || !titulo.trim()) {
        return res.status(400).json({
            erro: 'O título do critério é obrigatório.'
        });
    }

    if (!Number.isInteger(ordemNumero) || ordemNumero <= 0) {
        return res.status(400).json({
            erro: 'A ordem deve ser um número inteiro maior que zero.'
        });
    }

    if (Number.isNaN(pesoNumero) || pesoNumero <= 0) {
        return res.status(400).json({
            erro: 'O peso deve ser um número maior que zero.'
        });
    }

    const criterio = await CriterioModel.criar({
        senso_id: sensoId,
        titulo: titulo.trim(),
        objetivo: objetivo?.trim() || null,
        peso: pesoNumero,
        ordem: ordemNumero
    });

    return res.status(201).json(criterio);
}

async function atualizar(req, res) {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            erro: 'O ID do critério é inválido.'
        });
    }

    const criterioExistente = await CriterioModel.buscarPorId(id);

    if (!criterioExistente) {
        return res.status(404).json({
            erro: 'Critério não encontrado.'
        });
    }

    const {
        senso_id,
        titulo,
        objetivo,
        peso,
        ordem
    } = req.body;

    const sensoId = Number(senso_id);
    const ordemNumero = Number(ordem);
    const pesoNumero = Number(peso);

    if (!Number.isInteger(sensoId) || sensoId <= 0) {
        return res.status(400).json({
            erro: 'O campo senso_id é obrigatório e deve ser válido.'
        });
    }

    if (!titulo || !titulo.trim()) {
        return res.status(400).json({
            erro: 'O título do critério é obrigatório.'
        });
    }

    if (!Number.isInteger(ordemNumero) || ordemNumero <= 0) {
        return res.status(400).json({
            erro: 'A ordem deve ser um número inteiro maior que zero.'
        });
    }

    if (Number.isNaN(pesoNumero) || pesoNumero <= 0) {
        return res.status(400).json({
            erro: 'O peso deve ser um número maior que zero.'
        });
    }

    const criterioAtualizado = await CriterioModel.atualizar(id, {
        senso_id: sensoId,
        titulo: titulo.trim(),
        objetivo: objetivo?.trim() || null,
        peso: pesoNumero,
        ordem: ordemNumero
    });

    return res.status(200).json(criterioAtualizado);
}

async function desativar(req, res) {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            erro: 'O ID do critério é inválido.'
        });
    }

    const criterio = await CriterioModel.buscarPorId(id);

    if (!criterio) {
        return res.status(404).json({
            erro: 'Critério não encontrado.'
        });
    }

    await CriterioModel.desativar(id);

    return res.status(200).json({
        mensagem: 'Critério desativado com sucesso.'
    });
}

module.exports = {
    listar,
    listarPorSenso,
    buscarPorId,
    criar,
    atualizar,
    desativar
};