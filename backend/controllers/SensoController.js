const SensoModel = require('../models/SensoModel');

async function listar(req, res) {
    const sensos = await SensoModel.listar();

    return res.status(200).json(sensos);
}

async function buscarPorId(req, res) {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            erro: 'O ID do senso é inválido.'
        });
    }

    const senso = await SensoModel.buscarPorId(id);

    if (!senso) {
        return res.status(404).json({
            erro: 'Senso não encontrado.'
        });
    }

    return res.status(200).json(senso);
}

module.exports = {
    listar,
    buscarPorId
};