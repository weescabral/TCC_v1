function errorMiddleware(err, req, res, next) {
  console.error(err);

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ erro: 'Registro duplicado. Verifique e-mail, CNPJ ou código.' });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ erro: 'Registro relacionado não encontrado.' });
  }

  return res.status(err.status || 500).json({
    erro: err.message || 'Erro interno do servidor.'
  });
}

module.exports = errorMiddleware;
