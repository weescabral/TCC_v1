const jwt = require('jsonwebtoken');

function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ erro: 'Token não informado.' });

  const [, token] = authHeader.split(' ');
  if (!token) return res.status(401).json({ erro: 'Token inválido.' });

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET || 'sensus_dev_secret');
    return next();
  } catch (error) {
    return res.status(401).json({ erro: 'Token expirado ou inválido.' });
  }
}

function autorizar(...perfisPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) return res.status(401).json({ erro: 'Usuário não autenticado.' });
    if (!perfisPermitidos.includes(req.usuario.perfil)) {
      return res.status(403).json({ erro: 'Acesso não permitido para este perfil.' });
    }
    return next();
  };
}

module.exports = { autenticar, autorizar };
