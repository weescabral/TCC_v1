const EmpresaModel = require('../models/EmpresaModel');

async function listar(req, res) {
  const empresas = await EmpresaModel.listar();
  return res.json(empresas);
}

async function buscar(req, res) {
  const empresa = await EmpresaModel.buscarPorId(req.params.id);
  if (!empresa) return res.status(404).json({ erro: 'Empresa não encontrada.' });
  return res.json(empresa);
}

async function criar(req, res) {
  if (!req.body.nome) return res.status(400).json({ erro: 'O nome da empresa é obrigatório.' });
  const empresa = await EmpresaModel.criar(req.body);
  return res.status(201).json(empresa);
}

async function atualizar(req, res) {
  if (!req.body.nome) return res.status(400).json({ erro: 'O nome da empresa é obrigatório.' });
  const existente = await EmpresaModel.buscarPorId(req.params.id);
  if (!existente) return res.status(404).json({ erro: 'Empresa não encontrada.' });
  const empresa = await EmpresaModel.atualizar(req.params.id, req.body);
  return res.json(empresa);
}

async function remover(req, res) {
  const existente = await EmpresaModel.buscarPorId(req.params.id);
  if (!existente) return res.status(404).json({ erro: 'Empresa não encontrada.' });
  await EmpresaModel.desativar(req.params.id);
  return res.status(204).send();
}

module.exports = { listar, buscar, criar, atualizar, remover };
