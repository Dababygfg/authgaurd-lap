// File-based storage (persists between restarts)
const fs = require('fs');
const path = require('path');

const dataDir = '/tmp'; // Netlify functions can write to /tmp
const usersFile = path.join(dataDir, 'users.json');
const applicationsFile = path.join(dataDir, 'applications.json');
const keysFile = path.join(dataDir, 'keys.json');

// Initialize files if they don't exist
const initializeFiles = () => {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify([{
      id: 'admin-default',
      username: 'Dababyq',
      password: '$2a$10$uk.Yes5zrDe6twEem5EajedyiZetEZbz2DKOCumtmVyfxB3XXn0RS', // Hashed "Dababy19"
      is_admin: true,
      created_at: new Date().toISOString(),
      name: 'Admin',
      email: 'admin@authguard.com'
    }], null, 2));
  }
  
  if (!fs.existsSync(applicationsFile)) {
    fs.writeFileSync(applicationsFile, JSON.stringify([], null, 2));
  }
  
  if (!fs.existsSync(keysFile)) {
    fs.writeFileSync(keysFile, JSON.stringify([], null, 2));
  }
};

// User functions
async function getUsers() {
  initializeFiles();
  return JSON.parse(fs.readFileSync(usersFile, 'utf8'));
}

async function saveUsers(newUsers) {
  fs.writeFileSync(usersFile, JSON.stringify(newUsers, null, 2));
}

async function createUser(user) {
  const users = await getUsers();
  users.push(user);
  await saveUsers(users);
}

// Application functions
async function getApplications() {
  initializeFiles();
  return JSON.parse(fs.readFileSync(applicationsFile, 'utf8'));
}

async function saveApplications(newApps) {
  fs.writeFileSync(applicationsFile, JSON.stringify(newApps, null, 2));
}

async function createApplication(app) {
  const applications = await getApplications();
  applications.push(app);
  await saveApplications(applications);
}

// Key functions
async function getKeys() {
  initializeFiles();
  return JSON.parse(fs.readFileSync(keysFile, 'utf8'));
}

async function saveKeys(newKeys) {
  fs.writeFileSync(keysFile, JSON.stringify(newKeys, null, 2));
}

async function createKey(key) {
  const keys = await getKeys();
  keys.push(key);
  await saveKeys(keys);
}

// Initialize default data
const initializeDefaultData = () => {
  initializeFiles();
  console.log('File-based storage initialized');
};

module.exports = {
  getUsers,
  saveUsers,
  createUser,
  getApplications,
  saveApplications,
  createApplication,
  getKeys,
  saveKeys,
  createKey,
  initializeDefaultData
};
