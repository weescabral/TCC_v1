const express = require('express');
const DashboardController = require('../controllers/DashboardController');
const asyncHandler = require('../utils/asyncHandler');
const { autenticar } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(autenticar);

router.get('/', asyncHandler(DashboardController.resumo));

module.exports = router;
