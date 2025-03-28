const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');

const Follow = sequelize.define('Follow', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  }
}, {
  timestamps: true
});

// Définition des relations
User.belongsToMany(User, { 
  through: Follow, 
  as: 'followers', 
  foreignKey: 'followingId', 
  otherKey: 'followerId' 
});

User.belongsToMany(User, { 
  through: Follow, 
  as: 'following', 
  foreignKey: 'followerId', 
  otherKey: 'followingId' 
});

module.exports = Follow;