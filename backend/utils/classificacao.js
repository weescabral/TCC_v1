function classificarPercentual(percentual) {
  const valor = Number(percentual) || 0;

  if (valor >= 85) return 'excelente';
  if (valor >= 70) return 'regular';
  if (valor >= 50) return 'atencao';
  return 'critico';
}

module.exports = { classificarPercentual };
