const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const storage = require('./memory-storage');

// JWT Secret (use environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development-only';

// Helper functions
const createToken = (user) => {
  try {
    return jwt.sign({ id: user.id, username: user.username, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '7d' });
  } catch (error) {
    console.error('Token creation error:', error);
    throw new Error('Token generation failed');
  }
};
const verifyToken = (token) => jwt.verify(token, JWT_SECRET);
const hashPassword = async (password) => await bcrypt.hash(password, 10);
const comparePassword = async (password, hash) => await bcrypt.compare(password, hash);

// Initialize default admin user
const initializeAdmin = async () => {
  try {
    storage.initializeDefaultData();
    console.log('Admin initialization complete');
  } catch (error) {
    console.error('Error initializing admin:', error);
  }
};

// Cache the admin initialization
let adminInitialized = false;

// Main handler
exports.handler = async (event, context) => {
  // Only initialize admin once per function instance
  if (!adminInitialized) {
    await initializeAdmin();
    adminInitialized = true;
  }
  
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { action, payload } = JSON.parse(event.body);
    let result;

    switch (action) {
      // Authentication
      case 'login':
        result = await handleLogin(payload);
        break;
      case 'register':
        result = await handleRegister(payload);
        break;

      // Applications
      case 'getApps':
        result = await handleGetApps(payload);
        break;
      case 'createApp':
        result = await handleCreateApp(payload);
        break;
      case 'updateApp':
        result = await handleUpdateApp(payload);
        break;
      case 'deleteApp':
        result = await handleDeleteApp(payload);

      // License Keys
      case 'getKeys':
        result = await handleGetKeys(payload);
        break;
      case 'createKey':
        result = await handleCreateKey(payload);
        break;
      case 'updateKey':
        result = await handleUpdateKey(payload);
        break;
      case 'deleteKey':
        result = await handleDeleteKey(payload);

      // Users (Admin only)
      case 'getSellers':
        result = await handleGetSellers(payload);
        break;
      case 'createSeller':
        result = await handleCreateSeller(payload);
        break;
      case 'deleteSeller':
        result = await handleDeleteSeller(payload);

      default:
        result = { ok: false, error: 'Unknown action' };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: 'Internal server error' })
    };
  }
};

// Authentication handlers
async function handleLogin(payload) {
  const { username, password } = payload;
  const users = await storage.getUsers();
  const user = users.find(u => u.username === username);
  
  if (!user || !await comparePassword(password, user.password)) {
    return { ok: false, error: 'Invalid credentials' };
  }

  const token = createToken(user);
  return {
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      is_admin: user.is_admin
    },
    token
  };
}

async function handleRegister(payload) {
  const { name, email, username, password } = payload;
  const users = await storage.getUsers();
  
  if (users.find(u => u.username === username)) {
    return { ok: false, error: 'Username already exists' };
  }

  const newUser = {
    id: uuidv4(),
    name,
    email,
    username,
    password: await hashPassword(password),
    is_admin: false,
    created_at: new Date().toISOString()
  };

  await storage.createUser(newUser);
  const token = createToken(newUser);

  return {
    ok: true,
    user: {
      id: newUser.id,
      username: newUser.username,
      is_admin: newUser.is_admin
    },
    token
  };
}

// Application handlers
async function handleGetApps(payload) {
  const { isAdmin, sellerId } = payload;
  const applications = await storage.getApplications();
  const keys = await storage.getKeys();
  
  let filteredApps = applications;
  if (!isAdmin) {
    filteredApps = applications.filter(app => app.seller_id === sellerId);
  }

  return {
    ok: true,
    data: filteredApps.map(app => ({
      ...app,
      key_count: keys.filter(k => k.app_id === app.id).length
    }))
  };
}

async function handleCreateApp(payload) {
  const { name, description, version, status, is_admin_only, seller_id } = payload;
  const applications = await storage.getApplications();
  
  const newApp = {
    id: uuidv4(),
    name,
    description,
    version,
    status: status || 'active',
    is_admin_only: is_admin_only || false,
    seller_id,
    created_at: new Date().toISOString()
  };

  applications.push(newApp);
  await storage.saveApplications(applications);
  return { ok: true, data: newApp };
}

async function handleUpdateApp(payload) {
  const { id, name, description, version, status, is_admin_only } = payload;
  const applications = await storage.getApplications();
  
  const appIndex = applications.findIndex(a => a.id === id);
  if (appIndex === -1) {
    return { ok: false, error: 'Application not found' };
  }

  applications[appIndex] = {
    ...applications[appIndex],
    name,
    description,
    version,
    status,
    is_admin_only
  };

  await storage.saveApplications(applications);
  return { ok: true };
}

async function handleDeleteApp(payload) {
  const { id } = payload;
  const applications = await storage.getApplications();
  const keys = await storage.getKeys();
  
  const appIndex = applications.findIndex(a => a.id === id);
  if (appIndex === -1) {
    return { ok: false, error: 'Application not found' };
  }

  applications.splice(appIndex, 1);
  // Also delete all keys for this app
  const filteredKeys = keys.filter(k => k.app_id !== id);
  await storage.saveApplications(applications);
  await storage.saveKeys(filteredKeys);
  
  return { ok: true };
}

// License Key handlers
async function handleGetKeys(payload) {
  const { appId, isAdmin, sellerId, showAll } = payload;
  const keys = await storage.getKeys();
  const users = await storage.getUsers();
  
  let filteredKeys = keys.filter(k => k.app_id === appId);
  
  if (!showAll && !isAdmin) {
    filteredKeys = filteredKeys.filter(k => k.seller_id === sellerId);
  }

  return {
    ok: true,
    data: filteredKeys.map(key => ({
      ...key,
      seller_name: users.find(u => u.id === key.seller_id)?.username
    }))
  };
}

async function handleCreateKey(payload) {
  const { key, is_active, duration, seller_id, app_id } = payload;
  const keys = await storage.getKeys();
  const applications = await storage.getApplications();
  
  // Check if user owns this app or is admin
  const app = applications.find(a => a.id === app_id);
  if (!app) {
    return { ok: false, error: 'Application not found' };
  }
  
  // Get user info to check if admin
  const users = await storage.getUsers();
  const user = users.find(u => u.id === seller_id);
  const isAdmin = user && user.is_admin;
  
  // Only allow creating keys if user owns the app or is admin
  if (!isAdmin && app.seller_id !== seller_id) {
    return { ok: false, error: 'You do not have permission to create keys for this application' };
  }
  
  const newKey = {
    id: uuidv4(),
    key,
    is_active,
    duration,
    seller_id,
    app_id,
    hwid: null,
    hwid_banned: false,
    bound_user: null,
    note: null,
    created_at: new Date().toISOString()
  };

  keys.push(newKey);
  await storage.saveKeys(keys);
  return { ok: true, data: newKey };
}

async function handleUpdateKey(payload) {
  const { id, duration, note, is_active, hwid, hwid_banned } = payload;
  const keys = await storage.getKeys();
  
  const keyIndex = keys.findIndex(k => k.id === id);
  if (keyIndex === -1) {
    return { ok: false, error: 'Key not found' };
  }

  if (duration !== undefined) keys[keyIndex].duration = duration;
  if (note !== undefined) keys[keyIndex].note = note;
  if (is_active !== undefined) keys[keyIndex].is_active = is_active;
  if (hwid !== undefined) keys[keyIndex].hwid = hwid;
  if (hwid_banned !== undefined) keys[keyIndex].hwid_banned = hwid_banned;

  await storage.saveKeys(keys);
  return { ok: true };
}

async function handleDeleteKey(payload) {
  const { id } = payload;
  const keys = await storage.getKeys();
  
  const keyIndex = keys.findIndex(k => k.id === id);
  if (keyIndex === -1) {
    return { ok: false, error: 'Key not found' };
  }

  keys.splice(keyIndex, 1);
  await storage.saveKeys(keys);
  return { ok: true };
}

// User management handlers (Admin only)
async function handleGetSellers() {
  const users = await storage.getUsers();
  return {
    ok: true,
    data: users.map(u => ({
      id: u.id,
      username: u.username,
      is_admin: u.is_admin,
      created_at: u.created_at
    }))
  };
}

async function handleCreateSeller(payload) {
  const { username, password, is_admin } = payload;
  const users = await storage.getUsers();
  
  if (users.find(u => u.username === username)) {
    return { ok: false, error: 'Username already exists' };
  }

  const newUser = {
    id: uuidv4(),
    username,
    password: await hashPassword(password),
    is_admin: is_admin || false,
    created_at: new Date().toISOString()
  };

  users.push(newUser);
  await storage.saveUsers(users);
  return { ok: true };
}

async function handleDeleteSeller(payload) {
  const { id } = payload;
  const users = await storage.getUsers();
  
  const userIndex = users.findIndex(u => u.id === id);
  if (userIndex === -1) {
    return { ok: false, error: 'User not found' };
  }

  users.splice(userIndex, 1);
  await storage.saveUsers(users);
  return { ok: true };
}
