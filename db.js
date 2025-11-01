// db.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('whatsapp_bot_db', 'postgres', 'Ayush@123', {
  host: '127.0.0.1',
  dialect: 'postgres',
  logging: false, // optional
});

module.exports = sequelize;
