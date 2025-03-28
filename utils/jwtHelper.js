const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Génère un token JWT pour un utilisateur
 * @param {Object} user - L'utilisateur pour lequel générer le token
 * @returns {String} - Le token JWT
 */
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id,
      email: user.email,
      username: user.username
    }, 
    process.env.JWT_SECRET, 
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

/**
 * Vérifie et décode un token JWT
 * @param {String} token - Le token JWT à vérifier
 * @returns {Object|null} - L'objet décodé ou null si le token est invalide
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = { generateToken, verifyToken };