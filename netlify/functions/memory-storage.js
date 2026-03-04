// Ultra-fast in-memory storage (no file system)

let users = [{
  id: 'admin-default',
  username: 'Dababyq',
  password: '$2a$10$uk.Yes5zrDe6twEem5EajedyiZetEZbz2DKOCumtmVyfxB3XXn0RS', // Hashed "Dababy19"
  is_admin: true,
  created_at: new Date().toISOString(),
  name: 'Admin',
  email: 'admin@authguard.com'
}];
let applications = [];
let keys = [];

// Initialize default data
const initializeDefaultData = () => {
  console.log('In-memory storage initialized');
};

// User functions
async function getUsers() {
  return users;
}

async function saveUsers(newUsers) {
  users = newUsers;
}

async function createUser(user) {
  users.push(user);
}

// Application functions
async function getApplications() {
  return applications;
}

async function saveApplications(newApps) {
  applications = newApps;
}

async function createApplication(app) {
  applications.push(app);
}

// Key functions
async function getKeys() {
  return keys;
}

async function saveKeys(newKeys) {
  keys = newKeys;
}

async function createKey(key) {
  keys.push(key);
}

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
