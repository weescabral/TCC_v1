const db = require('../config/database');

async function criarEmpresaComAdmin({ empresa, usuario }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [empresaResult] = await connection.query(
      `INSERT INTO empresas (nome, cnpj, telefone, email, endereco)
       VALUES (?, ?, ?, ?, ?)`,
      [empresa.nome, empresa.cnpj || null, empresa.telefone || null, empresa.email || null, empresa.endereco || null]
    );

    const empresaId = empresaResult.insertId;

    const [usuarioResult] = await connection.query(
      `INSERT INTO usuarios (empresa_id, nome, email, senha, perfil)
       VALUES (?, ?, ?, ?, ?)`,
      [empresaId, usuario.nome, usuario.email, usuario.senhaHash, usuario.perfil || 'administrador']
    );

    await connection.commit();
    return { empresa_id: empresaId, usuario_id: usuarioResult.insertId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function buscarPorEmail(email) {
  const [rows] = await db.query(
    `SELECT u.id, u.empresa_id, u.nome, u.email, u.senha, u.perfil, u.ativo, e.nome AS empresa_nome
     FROM usuarios u
     INNER JOIN empresas e ON e.id = u.empresa_id
     WHERE u.email = ?
     LIMIT 1`,
    [email]
  );
  return rows[0];
}

async function buscarUsuarioSeguro(id) {
  const [rows] = await db.query(
    `SELECT id, empresa_id, nome, email, perfil, ativo, criado_em
     FROM usuarios
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0];
}

module.exports = { criarEmpresaComAdmin, buscarPorEmail, buscarUsuarioSeguro };
