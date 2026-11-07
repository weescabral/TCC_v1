const express = require('express');
const OnboardingController = require('../controllers/OnboardingController');
const asyncHandler = require('../utils/asyncHandler');
const { autenticar, autorizar } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(autenticar, autorizar('administrador'));
router.get('/', asyncHandler(OnboardingController.obter));
router.patch('/', asyncHandler(OnboardingController.atualizar));

module.exports = router;
