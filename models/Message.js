const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');

// Modèle de conversation
const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true
});

// Modèle de participant à une conversation
const Participant = sequelize.define('Participant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  unreadCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  timestamps: true
});

// Modèle de message
const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true
});

// Relations
Conversation.belongsToMany(User, { through: Participant, foreignKey: 'conversationId' });
User.belongsToMany(Conversation, { through: Participant, foreignKey: 'userId' });

Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId' });

Conversation.hasMany(Message, { foreignKey: 'conversationId' });
User.hasMany(Message, { foreignKey: 'senderId' });

module.exports = { Message, Conversation, Participant };