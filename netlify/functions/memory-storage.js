// Simple in-memory storage with persistence simulation

// Load from file if exists
let users = [];
let applications = [];
let keys = [];

// Try to load existing data
const loadData = () => {
  try {
    const fs = require('fs');
    const path = require('path');
    const dataDir = '/tmp/data';
    
    if (require('fs').existsSync(dataDir)) {
      const usersData = fs.readFileSync(path.join(dataDir, 'users.json'), 'utf8');
      const appsData = fs.readFileSync(path.join(dataDir, 'applications.json'), 'utf8');
      const keysData = fs.readFileSync(path.join(dataDir, 'keys.json'), 'utf8');
      
      users = usersData ? JSON.parse(usersData) : [];
      applications = appsData ? JSON.parse(appsData) : [];
      keys = keysData ? JSON.parse(keysData) : [];
      
      console.log('Loaded existing data from files');
    }
  } catch (error) {
    console.log('Could not load existing data, using defaults');
  }
};

// Save data to files
const saveData = () => {
  try {
    const fs = require('fs');
    const path = require('path');
    const dataDir = '/tmp/data';
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify(users, null, 2));
    fs.writeFileSync(path.join(dataDir, 'applications.json'), JSON.stringify(applications, null, 2));
    fs.writeFileSync(path.join(dataDir, 'keys.json'), JSON.stringify(keys, null, 2));
    
    console.log('Saved data to files');
  } catch (error) {
    console.error('Could not save data:', error);
  }
};

// Initialize default admin user
const initializeDefaultData = () => {
  loadData();
  
  if (users.length === 0) {
    users = [{
      id: 'admin-default',
      username: 'Dababyq',
      password: '$2a$10$uk.Yes5zrDe6twEem5EajedyiZetEZbz2DKOCumtmVyfxB3XXn0RS', // Hashed "Dababy19"
      is_admin: true,
      created_at: new Date().toISOString(),
      name: 'Admin',
      email: 'admin@authguard.com'
    }];
    saveData();
    console.log('Created default admin user');
  }
};

// User functions
async function getUsers() {
  loadData();
  return users;
}

async function saveUsers(newUsers) {
  users = newUsers;
  saveData();
}

async function createUser(user) {
  users.push(user);
  saveData();
}

// Application functions
async function getApplications() {
  loadData();
  return applications;
}

async function saveApplications(newApps) {
  applications = newApps;
  saveData();
}

async function createApplication(app) {
  applications.push(app);
  saveData();
}

// Key functions
async function getKeys() {
  loadData();
  return keys;
}

async function saveKeys(newKeys) {
  keys = newKeys;
  saveData();
}

async function createKey(key) {
  keys.push(key);
  saveData();
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
