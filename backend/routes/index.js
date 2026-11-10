const express = require('express');

const authRoutes = require('./authRoutes');
const empresaRoutes = require('./empresaRoutes');
const usuarioRoutes = require('./usuarioRoutes');
const setorRoutes = require('./setorRoutes');
const sensoRoutes = require('./sensoRoutes');
const criterioRoutes = require('./criterioRoutes');
const auditoriaRoutes = require('./auditoriaRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const evidenciaRoutes = require('./evidenciaRoutes');
const planoAcaoRoutes = require('./planoAcaoRoutes');
const onboardingRoutes = require('./onboardingRoutes');
const relatorioRoutes = require('./relatorioRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/empresas', empresaRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/setores', setorRoutes);
router.use('/sensos', sensoRoutes);
router.use('/criterios', criterioRoutes);
router.use('/auditorias', auditoriaRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/evidencias', evidenciaRoutes);
router.use('/planos-acao', planoAcaoRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/relatorios', relatorioRoutes);

module.exports = router;