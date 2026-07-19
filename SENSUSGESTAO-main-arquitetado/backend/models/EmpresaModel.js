const db = require('../config/database');

async function listar() {
  const [rows] = await db.query(
    `SELECT id, nome, cnpj, telefone, email, endereco, criado_em, ativo
     FROM empresas
     WHERE ativo = TRUE
     ORDER BY nome`
  );
  return rows;
}

async function buscarPorId(id) {
  const [rows] = await db.query(
    `SELECT id, nome, cnpj, telefone, email, endereco, criado_em, ativo
     FROM empresas
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0];
}

async function criar(dados) {
  const [result] = await db.query(
    `INSERT INTO empresas (nome, cnpj, telefone, email, endereco)
     VALUES (?, ?, ?, ?, ?)`,
    [dados.nome, dados.cnpj || null, dados.telefone || null, dados.email || null, dados.endereco || null]
  );
  return buscarPorId(result.insertId);
}

async function atualizar(id, dados) {
  await db.query(
    `UPDATE empresas
     SET nome = ?, cnpj = ?, telefone = ?, email = ?, endereco = ?
     WHERE id = ?`,
    [dados.nome, dados.cnpj || null, dados.telefone || null, dados.email || null, dados.endereco || null, id]
  );
  return buscarPorId(id);
}

async function desativar(id) {
  await db.query(`UPDATE empresas SET ativo = FALSE WHERE id = ?`, [id]);
}

module.exports = { listar, buscarPorId, criar, atualizar, desativar };
