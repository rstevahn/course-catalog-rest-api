// jshint esversion: 9
// jshint node: true
'use strict';
const Sequelize = require('sequelize');

module.exports = (sequelize) => {
  class Course extends Sequelize.Model {}
  Course.init({
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
          notEmpty: { msg: '"Title" is required'},
          notNull: { msg: '"Title" is required'}
      }
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: '"Description" is required'},
        notNull: { msg: '"Description" is required'}
      }
    },
    estimatedTime: Sequelize.STRING, // optional
    materialsNeeded: Sequelize.STRING // optional
  }, { sequelize });

  Course.associate = (models) => {
    Course.belongsTo(models.User, {
      as: 'user', // alias
      foreignKey: {
        fieldName: 'userId',
        allowNull: false,
      },
    });
  };

  return Course;
};
