require('dotenv').config();
const mysql = require('mysql2/promise');

const requiredVariables = [
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_DATABASE',
  'DB_PORT',
];

const missingVariables = requiredVariables.filter(
  (variable) => !process.env[variable]
);

if (missingVariables.length > 0) {
  throw new Error(
    `Variáveis de ambiente ausentes: ${missingVariables.join(', ')}`
  );
}

const dbPort = Number(process.env.DB_PORT);

if (!Number.isInteger(dbPort)) {
  throw new Error('DB_PORT precisa ser uma porta numérica válida.');
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: dbPort,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

module.exports = pool;