const { Message, Conversation, Participant } = require('../models/Message');
const User = require('../models/User');
const { Op, Sequelize } = require('sequelize');

/**
 * Créer ou récupérer une conversation entre utilisateurs
 * @route POST /api/messages/conversations
 */
const createOrGetConversation = async (req, res) => {
  try {
    const { userId } = req.body; // ID de l'utilisateur avec qui créer/récupérer une conversation
    const currentUserId = req.user.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'L\'ID de l\'utilisateur est requis'
      });
    }

    // Vérifier que l'utilisateur existe
    const otherUser = await User.findByPk(userId);
    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier si une conversation existe déjà entre les deux utilisateurs
    // Recherche toutes les conversations où les deux utilisateurs sont participants
    const conversations = await Conversation.findAll({
      include: [
        {
          model: User,
          where: {
            id: currentUserId
          }
        }
      ]
    });

    // Parmi ces conversations, trouver celles où l'autre utilisateur est également participant
    const conversationIds = conversations.map(conv => conv.id);
    
    const existingConversation = await Participant.findOne({
      where: {
        userId,
        conversationId: {
          [Op.in]: conversationIds
        }
      },
      include: [
        {
          model: Conversation
        }
      ]
    });

    let conversation;

    if (existingConversation) {
      // Si une conversation existe déjà, la récupérer
      conversation = existingConversation.Conversation;
    } else {
      // Sinon, créer une nouvelle conversation
      conversation = await Conversation.create();

      // Ajouter les participants
      await Participant.bulkCreate([
        {
          userId: currentUserId,
          conversationId: conversation.id
        },
        {
          userId,
          conversationId: conversation.id
        }
      ]);
    }

    // Récupérer la conversation complète avec les participants
    const fullConversation = await Conversation.findByPk(conversation.id, {
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'fullName', 'avatar', 'isVerified', 'isOnline', 'lastSeen']
        },
        {
          model: Message,
          limit: 1,
          order: [['createdAt', 'DESC']],
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'username']
            }
          ]
        }
      ]
    });

    return res.status(200).json({
      success: true,
      conversation: fullConversation
    });
  } catch (error) {
    console.error('Erreur lors de la création/récupération de la conversation:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création/récupération de la conversation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Récupérer les conversations d'un utilisateur
 * @route GET /api/messages/conversations
 */
const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Récupérer les IDs des conversations auxquelles l'utilisateur participe
    const userParticipations = await Participant.findAll({
      where: { userId },
      attributes: ['conversationId']
    });

    const conversationIds = userParticipations.map(p => p.conversationId);

    // Récupérer les conversations
    const conversations = await Conversation.findAndCountAll({
      where: {
        id: {
          [Op.in]: conversationIds
        }
      },
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'fullName', 'avatar', 'isVerified', 'isOnline', 'lastSeen']
        },
        {
          model: Message,
          limit: 1,
          order: [['createdAt', 'DESC']],
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'username']
            }
          ]
        }
      ],
      order: [['lastMessageAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Récupérer le nombre de messages non lus pour chaque conversation
    const participantsWithUnread = await Participant.findAll({
      where: {
        userId,
        conversationId: {
          [Op.in]: conversationIds
        }
      },
      attributes: ['conversationId', 'unreadCount']
    });

    // Créer un map des messages non lus par conversation
    const unreadByConversation = {};
    participantsWithUnread.forEach(p => {
      unreadByConversation[p.conversationId] = p.unreadCount;
    });

    // Formater les conversations avec le nombre de messages non lus
    const formattedConversations = conversations.rows.map(conversation => {
      const conversationData = conversation.toJSON();
      // Filtrer les utilisateurs pour exclure l'utilisateur actuel
      conversationData.Users = conversationData.Users.filter(user => user.id !== userId);
      // Ajouter le nombre de messages non lus
      conversationData.unreadCount = unreadByConversation[conversation.id] || 0;
      return conversationData;
    });

    return res.status(200).json({
      success: true,
      conversations: formattedConversations,
      totalCount: conversations.count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(conversations.count / limit)
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des conversations:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des conversations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Récupérer les messages d'une conversation
 * @route GET /api/messages/conversations/:id
 */
const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Vérifier que l'utilisateur est participant à cette conversation
    const participant = await Participant.findOne({
      where: {
        userId,
        conversationId: id
      }
    });

    if (!participant) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à accéder à cette conversation'
      });
    }

    // Récupérer les messages
    const messages = await Message.findAndCountAll({
      where: { conversationId: id },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'fullName', 'avatar', 'isVerified']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Marquer les messages comme lus
    await Message.update(
      { isRead: true },
      {
        where: {
          conversationId: id,
          senderId: { [Op.ne]: userId }, // Ne pas marquer ses propres messages
          isRead: false
        }
      }
    );

    // Réinitialiser le compteur de messages non lus
    await Participant.update(
      { unreadCount: 0 },
      {
        where: {
          userId,
          conversationId: id
        }
      }
    );

    return res.status(200).json({
      success: true,
      messages: messages.rows,
      totalCount: messages.count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(messages.count / limit)
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des messages',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Envoyer un message
 * @route POST /api/messages/conversations/:id
 */
const sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const senderId = req.user.id;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Le contenu du message est requis'
      });
    }

    // Vérifier que l'utilisateur est participant à cette conversation
    const participant = await Participant.findOne({
      where: {
        userId: senderId,
        conversationId: id
      }
    });

    if (!participant) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à envoyer des messages dans cette conversation'
      });
    }

    // Créer le message
    const message = await Message.create({
      content,
      senderId,
      conversationId: id
    });

    // Mettre à jour la date du dernier message de la conversation
    await Conversation.update(
      { lastMessageAt: new Date() },
      { where: { id } }
    );

    // Trouver les autres participants pour incrémenter leur compteur de messages non lus
    await Participant.increment('unreadCount', {
      where: {
        conversationId: id,
        userId: { [Op.ne]: senderId }
      }
    });

    // Récupérer le message avec les infos de l'expéditeur
    const messageWithSender = await Message.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'fullName', 'avatar', 'isVerified']
        }
      ]
    });

    return res.status(201).json({
      success: true,
      message: messageWithSender
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'envoi du message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Marquer les messages d'une conversation comme lus
 * @route PUT /api/messages/conversations/:id/read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Vérifier que l'utilisateur est participant à cette conversation
    const participant = await Participant.findOne({
      where: {
        userId,
        conversationId: id
      }
    });

    if (!participant) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à accéder à cette conversation'
      });
    }

    // Marquer les messages comme lus
    await Message.update(
      { isRead: true },
      {
        where: {
          conversationId: id,
          senderId: { [Op.ne]: userId }, // Ne pas marquer ses propres messages
          isRead: false
        }
      }
    );

    // Réinitialiser le compteur de messages non lus
    await Participant.update(
      { unreadCount: 0 },
      {
        where: {
          userId,
          conversationId: id
        }
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Messages marqués comme lus'
    });
  } catch (error) {
    console.error('Erreur lors du marquage des messages comme lus:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du marquage des messages comme lus',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createOrGetConversation,
  getConversations,
  getMessages,
  sendMessage,
  markAsRead
};