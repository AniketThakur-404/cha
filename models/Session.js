const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Session = sequelize.define(
  'Session',
  {
    current_step: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    context: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    tableName: 'sessions',
  }
);

module.exports = Session;
