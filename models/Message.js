const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Message = sequelize.define(
  'Message',
  {
    sender: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message_text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: 'messages',
  }
);

module.exports = Message;
