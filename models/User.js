const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const User = sequelize.define(
  'User',
  {
    phone_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: 'users',
    underscored: false,
  }
);

module.exports = User;
