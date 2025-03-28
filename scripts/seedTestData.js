require('dotenv').config();
const { sequelize } = require('../config/db');
const User = require('../models/User');
const { Post, Like, Comment } = require('../models/Post');
const { Message, Conversation, Participant } = require('../models/Message');
const Follow = require('../models/Follow');

/**
 * Ajouter des données de test à la base
 * Ce script peut être exécuté indépendamment pour remplir la base avec des données de test
 */
const seedTestData = async () => {
  try {
    console.log('🌱 Ajout de données de test...');
    
    // Tester la connexion à la base de données
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données établie avec succès.');
    
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
    
    console.log('✅ Utilisateurs créés:', users.map(u => u.username).join(', '));
    
    // Créer quelques relations de suivi
    await Follow.bulkCreate([
      { followerId: users[0].id, followingId: users[1].id },
      { followerId: users[0].id, followingId: users[2].id },
      { followerId: users[1].id, followingId: users[0].id },
      { followerId: users[2].id, followingId: users[0].id }
    ]);
    
    console.log('✅ Relations de suivi créées');
    
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
    
    console.log('✅ Posts créés');
    
    // Ajouter quelques likes
    await Like.bulkCreate([
      { userId: users[0].id, postId: posts[1].id },
      { userId: users[1].id, postId: posts[0].id },
      { userId: users[2].id, postId: posts[0].id },
      { userId: users[2].id, postId: posts[1].id }
    ]);
    
    console.log('✅ Likes ajoutés');
    
    // Mettre à jour les compteurs de likes
    await Post.update({ likes: 2 }, { where: { id: posts[0].id } });
    await Post.update({ likes: 2 }, { where: { id: posts[1].id } });
    
    // Ajouter quelques commentaires
    await Comment.bulkCreate([
      { content: 'Super post !', userId: users[1].id, postId: posts[0].id },
      { content: 'Bienvenue sur FriendZi !', userId: users[2].id, postId: posts[0].id },
      { content: 'Ça a l\'air intéressant, tu peux en dire plus?', userId: users[0].id, postId: posts[1].id }
    ]);
    
    console.log('✅ Commentaires ajoutés');
    
    // Mettre à jour les compteurs de commentaires
    await Post.update({ commentsCount: 2 }, { where: { id: posts[0].id } });
    await Post.update({ commentsCount: 1 }, { where: { id: posts[1].id } });
    
    // Créer quelques conversations
    const conversation1 = await Conversation.create();
    const conversation2 = await Conversation.create();
    
    console.log('✅ Conversations créées');
    
    // Ajouter des participants aux conversations
    await Participant.bulkCreate([
      { userId: users[0].id, conversationId: conversation1.id },
      { userId: users[1].id, conversationId: conversation1.id },
      { userId: users[0].id, conversationId: conversation2.id },
      { userId: users[2].id, conversationId: conversation2.id }
    ]);
    
    console.log('✅ Participants ajoutés');
    
    // Ajouter quelques messages
    await Message.bulkCreate([
      { content: 'Salut Marie, comment vas-tu ?', senderId: users[0].id, conversationId: conversation1.id },
      { content: 'Salut Thomas ! Ça va bien, et toi ?', senderId: users[1].id, conversationId: conversation1.id },
      { content: 'Hey Lucas, j\'ai vu tes dernières photos. Elles sont superbes !', senderId: users[0].id, conversationId: conversation2.id }
    ]);
    
    console.log('✅ Messages ajoutés');
    
    // Mettre à jour les derniers messages des conversations
    await Conversation.update({ lastMessageAt: new Date() }, { where: { id: conversation1.id } });
    await Conversation.update({ lastMessageAt: new Date() }, { where: { id: conversation2.id } });
    
    // Mettre à jour les compteurs de messages non lus
    await Participant.update({ unreadCount: 1 }, { where: { userId: users[2].id, conversationId: conversation2.id } });
    await Participant.update({ unreadCount: 1 }, { where: { userId: users[0].id, conversationId: conversation1.id } });
    
    console.log('🎉 Données de test ajoutées avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout des données de test:', error);
  }
};

// Exécuter la fonction si ce fichier est appelé directement
if (require.main === module) {
  seedTestData()
    .then(() => {
      console.log('✅ Opération terminée');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erreur:', error);
      process.exit(1);
    });
}

module.exports = seedTestData;