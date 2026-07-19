const express = require('express');
const AuthController = require('../controllers/AuthController');
const asyncHandler = require('../utils/asyncHandler');
const { autenticar } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/registrar', asyncHandler(AuthController.registrar));
router.post('/login', asyncHandler(AuthController.login));
router.get('/me', autenticar, asyncHandler(AuthController.me));

module.exports = router;
