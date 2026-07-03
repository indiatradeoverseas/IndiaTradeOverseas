const crypto = require('crypto');
const env = require('../config/env');

const ALGORITHM = 'aes-256-cbc';
if (!env.ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY is missing from environment variables (.env file). Please configure it.');
}
const ENCRYPTION_KEY = Buffer.from(env.ENCRYPTION_KEY); 
const IV_LENGTH = 16;

function encryptText(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptText(encryptedText) {
  if (!encryptedText) return '';
  try {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error.message);
    return 'DECRYPTION_ERROR';
  }
}

function hashText(text) {
  if (!text) return '';
  return crypto.createHash('sha256').update(String(text).trim()).digest('hex');
}

function normalizeCompanyName(name) {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function hashCompanyName(name) {
  return hashText(normalizeCompanyName(name));
}

function maskPhone(phone) {
  if (!phone) return '';
  const clean = String(phone).replace(/\s/g, '');
  if (clean.length < 4) return 'X'.repeat(clean.length);
  const middleLength = clean.length - 4;
  return clean.slice(0, 2) + 'X'.repeat(middleLength) + clean.slice(-2);
}

function maskEmail(email) {
  if (!email) return '';
  const parts = email.split('@');
  if (parts.length !== 2) return '****';
  const local = parts[0];
  const domain = parts[1];
  if (local.length <= 2) {
    return '*'.repeat(local.length) + '@' + domain;
  }
  return local.slice(0, 2) + '*'.repeat(Math.max(4, local.length - 2)) + '@' + domain;
}

module.exports = {
  encryptText,
  decryptText,
  hashText,
  normalizeCompanyName,
  hashCompanyName,
  maskPhone,
  maskEmail
};