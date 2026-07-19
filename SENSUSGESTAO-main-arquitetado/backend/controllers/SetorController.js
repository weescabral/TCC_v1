const SetorModel = require('../models/SetorModel');

async function listar(req, res) {
  const setores = await SetorModel.listar(req.usuario.empresa_id);

  return res.json(setores);
}

async function buscar(req, res) {
  const setor = await SetorModel.buscarPorId(
    req.params.id,
    req.usuario.empresa_id
  );

  if (!setor) {
    return res.status(404).json({
      erro: 'Setor não encontrado.',
    });
  }

  return res.json(setor);
}

async function criar(req, res) {
  const nome = req.body.nome?.trim();

  if (!nome) {
    return res.status(400).json({
      erro: 'O nome do setor é obrigatório.',
    });
  }

  const setor = await SetorModel.criar(req.usuario.empresa_id, {
    ...req.body,
    nome,
  });

  return res.status(201).json(setor);
}

async function atualizar(req, res) {
  const nome = req.body.nome?.trim();

  if (!nome) {
    return res.status(400).json({
      erro: 'O nome do setor é obrigatório.',
    });
  }

  const setorExistente = await SetorModel.buscarPorId(
    req.params.id,
    req.usuario.empresa_id
  );

  if (!setorExistente) {
    return res.status(404).json({
      erro: 'Setor não encontrado.',
    });
  }

  const setorAtualizado = await SetorModel.atualizar(
    req.params.id,
    req.usuario.empresa_id,
    {
      ...req.body,
      nome,
    }
  );

  return res.json(setorAtualizado);
}

async function remover(req, res) {
  const setor = await SetorModel.buscarPorId(
    req.params.id,
    req.usuario.empresa_id
  );

  if (!setor) {
    return res.status(404).json({
      erro: 'Setor não encontrado.',
    });
  }

  await SetorModel.desativar(
    req.params.id,
    req.usuario.empresa_id
  );

  return res.status(200).json({
    mensagem: 'Setor removido com sucesso.',
  });
}

module.exports = {
  listar,
  buscar,
  criar,
  atualizar,
  remover,
};