const db = require('../config/database');

async function criarEmpresaComAdmin({ empresa, usuario }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [existente] = await connection.query('SELECT id FROM usuarios WHERE email = ? LIMIT 1', [usuario.email]);
    if (existente.length) { const erro = new Error('Este e-mail já está cadastrado.'); erro.status = 409; throw erro; }

    const [empresaResult] = await connection.query(
      `INSERT INTO empresas (nome, cnpj, telefone, email, endereco)
       VALUES (?, ?, ?, ?, ?)`,
      [empresa.nome, empresa.cnpj || null, empresa.telefone || null, empresa.email || null, empresa.endereco || null]
    );

    const empresaId = empresaResult.insertId;

    const [usuarioResult] = await connection.query(
      `INSERT INTO usuarios (empresa_id, nome, email, senha, perfil)
       VALUES (?, ?, ?, ?, ?)`,
      [empresaId, usuario.nome, usuario.email, usuario.senhaHash, 'administrador']
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

async function criarTokenRecuperacao({ usuarioId, tokenHash, expiraEm }) {
  await db.query('INSERT INTO recuperacao_senha (usuario_id, token_hash, expira_em) VALUES (?, ?, ?)', [usuarioId, tokenHash, expiraEm]);
}

async function buscarUsuarioPorToken(tokenHash) {
  const [rows] = await db.query(
    `SELECT r.id AS recuperacao_id, r.usuario_id, u.ativo FROM recuperacao_senha r
     INNER JOIN usuarios u ON u.id = r.usuario_id
     WHERE r.token_hash = ? AND r.usado_em IS NULL AND r.expira_em > NOW() LIMIT 1`, [tokenHash]
  );
  return rows[0];
}

async function concluirRecuperacao(recuperacaoId, usuarioId, senhaHash) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      'SELECT id FROM recuperacao_senha WHERE id = ? AND usuario_id = ? AND usado_em IS NULL AND expira_em > NOW() FOR UPDATE',
      [recuperacaoId, usuarioId]
    );
    if (!rows.length) { const erro = new Error('Este link expirou ou já foi utilizado. Solicite uma nova recuperação.'); erro.status = 400; throw erro; }
    await connection.query('UPDATE usuarios SET senha = ? WHERE id = ?', [senhaHash, usuarioId]);
    await connection.query('UPDATE recuperacao_senha SET usado_em = NOW() WHERE usuario_id = ? AND usado_em IS NULL', [usuarioId]);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

async function atualizarPerfil(id, nome) {
  await db.query('UPDATE usuarios SET nome = ? WHERE id = ?', [nome, id]);
  return buscarUsuarioSeguro(id);
}

module.exports = { criarEmpresaComAdmin, buscarPorEmail, buscarUsuarioSeguro, atualizarPerfil, criarTokenRecuperacao, buscarUsuarioPorToken, concluirRecuperacao };
