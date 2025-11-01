// db.js
const { Sequelize } = require('sequelize');

const {
  DATABASE_URL,
  DB_NAME = 'whatsapp_bot_db',
  DB_USER = 'postgres',
  DB_PASSWORD = 'Ayush@123',
  DB_HOST = '127.0.0.1',
  DB_PORT = '5432',
  DB_DIALECT = 'postgres',
  DB_SSL,
} = process.env;

let sequelize;

if (DATABASE_URL) {
  sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: DB_SSL === 'true' ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  });
} else {
  sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: DB_DIALECT,
    logging: false,
  });
}

module.exports = sequelize;
