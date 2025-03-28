const { sequelize } = require('../config/db');
const User = require('../models/User');
const { Post, Like, Comment } = require('../models/Post');
const { Message, Conversation, Participant } = require('../models/Message');
const Follow = require('../models/Follow');

/**
 * Synchroniser les modèles avec la base de données
 */
const initDb = async () => {
  try {
    console.log('🔄 Synchronisation des modèles avec la base de données...');
    
    // Forcer la synchronisation (recréer les tables)
    // ATTENTION: à utiliser uniquement en développement ou avec prudence
    // En production, utilisez plutôt: await sequelize.sync();
    await sequelize.sync({ force: process.env.NODE_ENV === 'development' });
    
    console.log('✅ Synchronisation terminée avec succès!');
    
    // Si en mode développement, ajouter des données de test
    if (process.env.NODE_ENV === 'development') {
      await seedTestData();
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation:', error);
  }
};

/**
 * Ajouter des données de test à la base
 * Uniquement pour le développement
 */
const seedTestData = async () => {
  try {
    console.log('🌱 Ajout de données de test...');
    
    // Créer quelques utilisateurs de test
    const users = await User.bulkCreate([
      {
        username: 'thomas',
        email: 'thomas@example.com',
        password: 'Test1234!',
        fullName: 'Thomas',
        bio: 'Développeur passionné',
        isVerified: true,
        avatar: 'https://i.pravatar.cc/150?img=1'
      },
      {
        username: 'marie',
        email: 'marie@example.com',
        password: 'Test1234!',
        fullName: 'Marie',
        bio: 'Designer et créatrice de contenu',
        isVerified: true,
        avatar: 'https://i.pravatar.cc/150?img=5'
      },
      {
        username: 'lucas',
        email: 'lucas@example.com',
        password: 'Test1234!',
        fullName: 'Lucas',
        bio: 'Photographe amateur',
        isVerified: true,
        avatar: 'https://i.pravatar.cc/150?img=3'
      }
    ]);
    
    // Créer quelques relations de suivi
    await Follow.bulkCreate([
      { followerId: users[0].id, followingId: users[1].id },
      { followerId: users[0].id, followingId: users[2].id },
      { followerId: users[1].id, followingId: users[0].id },
      { followerId: users[2].id, followingId: users[0].id }
    ]);
    
    // Créer quelques posts
    const posts = await Post.bulkCreate([
      {
        content: 'Bonjour à tous ! Voici mon premier post sur FriendZi 😊',
        userId: users[0].id
      },
      {
        content: 'Je travaille sur un nouveau projet passionnant',
        image: 'https://i.pinimg.com/736x/e6/ab/fe/e6abfe9b7b49021f8bdc8c53e1faa45b.jpg',
        userId: users[1].id
      },
      {
        content: 'Une belle journée pour prendre des photos!',
        image: 'https://i.pinimg.com/736x/74/45/82/744582341c579a459b4bd319e7bc1915.jpg',
        userId: users[2].id
      }
    ]);
    
    // Ajouter quelques likes
    await Like.bulkCreate([
      { userId: users[0].id, postId: posts[1].id },
      { userId: users[1].id, postId: posts[0].id },
      { userId: users[2].id, postId: posts[0].id },
      { userId: users[2].id, postId: posts[1].id }
    ]);
    
    // Mettre à jour les compteurs de likes
    await Post.update({ likes: 2 }, { where: { id: posts[0].id } });
    await Post.update({ likes: 2 }, { where: { id: posts[1].id } });
    
    // Ajouter quelques commentaires
    await Comment.bulkCreate([
      { content: 'Super post !', userId: users[1].id, postId: posts[0].id },
      { content: 'Bienvenue sur FriendZi !', userId: users[2].id, postId: posts[0].id },
      { content: 'Ça a l\'air intéressant, tu peux en dire plus?', userId: users[0].id, postId: posts[1].id }
    ]);
    
    // Mettre à jour les compteurs de commentaires
    await Post.update({ commentsCount: 2 }, { where: { id: posts[0].id } });
    await Post.update({ commentsCount: 1 }, { where: { id: posts[1].id } });
    
    // Créer quelques conversations
    const conversation1 = await Conversation.create();
    const conversation2 = await Conversation.create();
    
    // Ajouter des participants aux conversations
    await Participant.bulkCreate([
      { userId: users[0].id, conversationId: conversation1.id },
      { userId: users[1].id, conversationId: conversation1.id },
      { userId: users[0].id, conversationId: conversation2.id },
      { userId: users[2].id, conversationId: conversation2.id }
    ]);
    
    // Ajouter quelques messages
    await Message.bulkCreate([
      { content: 'Salut Marie, comment vas-tu ?', senderId: users[0].id, conversationId: conversation1.id },
      { content: 'Salut Thomas ! Ça va bien, et toi ?', senderId: users[1].id, conversationId: conversation1.id },
      { content: 'Hey Lucas, j\'ai vu tes dernières photos. Elles sont superbes !', senderId: users[0].id, conversationId: conversation2.id }
    ]);
    
    // Mettre à jour les derniers messages des conversations
    await Conversation.update({ lastMessageAt: new Date() }, { where: { id: conversation1.id } });
    await Conversation.update({ lastMessageAt: new Date() }, { where: { id: conversation2.id } });
    
    // Mettre à jour les compteurs de messages non lus
    await Participant.update({ unreadCount: 1 }, { where: { userId: users[2].id, conversationId: conversation2.id } });
    await Participant.update({ unreadCount: 1 }, { where: { userId: users[0].id, conversationId: conversation1.id } });
    
    console.log('✅ Données de test ajoutées avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout des données de test:', error);
  }
};

// Exporter la fonction pour pouvoir l'utiliser ailleurs
module.exports = initDb;

// Si ce fichier est exécuté directement (node initDb.js), initialiser la base
if (require.main === module) {
  initDb()
    .then(() => {
      console.log('🎉 Base de données initialisée avec succès!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Erreur lors de l\'initialisation de la base de données:', error);
      process.exit(1);
    });
}