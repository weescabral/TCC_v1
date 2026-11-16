const express = require('express');
const AuthController = require('../controllers/AuthController');
const asyncHandler = require('../utils/asyncHandler');
const { autenticar } = require('../middlewares/authMiddleware');
const multer = require('multer');
const uploadFoto = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

const router = express.Router();

router.post('/registrar', asyncHandler(AuthController.registrar));
router.post('/login', asyncHandler(AuthController.login));
router.post('/recuperar-senha', asyncHandler(AuthController.solicitarRecuperacao));
router.post('/redefinir-senha', asyncHandler(AuthController.redefinirSenha));
router.get('/me', autenticar, asyncHandler(AuthController.me));
router.patch('/perfil', autenticar, asyncHandler(AuthController.atualizarPerfil));
router.post('/perfil/foto', autenticar, uploadFoto.single('foto'), asyncHandler(AuthController.atualizarFotoPerfil));

module.exports = router;
