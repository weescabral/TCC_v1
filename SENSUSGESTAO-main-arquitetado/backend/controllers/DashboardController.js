const DashboardModel = require('../models/DashboardModel');

async function resumo(req, res) {
  const empresaId = req.usuario.empresa_id;

  const dados = await DashboardModel.resumo(empresaId);

  return res.status(200).json({
    mensagem: 'Dashboard carregado com sucesso.',

    kpis: {
      indiceAtual: Number(dados.kpis.indiceAtual || 0),
      mediaGeral: Number(dados.kpis.mediaGeral || 0),
      totalAuditorias: Number(dados.kpis.totalAuditorias || 0),
      totalSetores: Number(dados.kpis.totalSetores || 0),
      planosPendentes: Number(dados.kpis.planosPendentes || 0),
      melhorScore: Number(dados.kpis.melhorScore || 0),
      piorScore: Number(dados.kpis.piorScore || 0),
    },

    porSetor: dados.porSetor.map((item) => ({
      id: item.id,
      nome: item.nome,
      score: Number(item.score || 0),
    })),

    porSenso: dados.porSenso.map((item) => ({
      senso: item.senso,
      media: Number(item.media || 0),
    })),

    planos: dados.planos.map((item) => ({
      status: item.status,
      total: Number(item.total || 0),
    })),

    evolucao: dados.evolucao.map((item) => ({
      id: item.id,
      codigo: item.codigo,
      data: item.data,
      setor: item.setor,
      score: Number(item.score || 0),
    })),
  });
}

module.exports = {
  resumo,
};