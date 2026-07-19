function classificarPercentual(percentual) {
  if (percentual >= 90) return 'excelente';
  if (percentual >= 75) return 'bom';
  if (percentual >= 60) return 'regular';
  return 'critico';
}
module.exports = { classificarPercentual };
