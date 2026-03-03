const { NetlifyObjects } = require('@netlify/objects');

// Initialize Netlify Objects client
const objects = new NetlifyObjects();

// Netlify Data model definitions
const MODELS = {
  users: {
    id: 'string',
    username: 'string',
    password: 'string',
    is_admin: 'boolean',
    created_at: 'string',
    name: 'string',
    email: 'string'
  },
  applications: {
    id: 'string',
    name: 'string',
    description: 'string',
    version: 'string',
    status: 'string',
    is_admin_only: 'boolean',
    created_at: 'string',
    created_by: 'string'
  },
  keys: {
    id: 'string',
    key_string: 'string',
    app_id: 'string',
    duration: 'string',
    note: 'string',
    is_active: 'boolean',
    created_at: 'string',
    created_by: 'string',
    hwid: 'string',
    expires_at: 'string'
  }
};

// Helper functions for Netlify Data
async function ensureModels() {
  try {
    // Create models if they don't exist
    for (const [modelName, schema] of Object.entries(MODELS)) {
      try {
        await objects.getModel(modelName);
      } catch {
        // Model doesn't exist, create it
        await objects.createModel(modelName, schema);
        console.log(`Created model: ${modelName}`);
      }
    }
  } catch (error) {
    console.error('Error ensuring models:', error);
  }
}

// User functions
async function getUsers() {
  await ensureModels();
  try {
    const result = await objects.query('users');
    return result.results || [];
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
}

async function saveUsers(users) {
  await ensureModels();
  try {
    // Clear existing users and save new ones
    const existingUsers = await getUsers();
    for (const user of existingUsers) {
      await objects.delete('users', user.id);
    }
    
    for (const user of users) {
      await objects.set('users', user.id, user);
    }
  } catch (error) {
    console.error('Error saving users:', error);
    throw error;
  }
}

async function createUser(user) {
  await ensureModels();
  try {
    return await objects.set('users', user.id, user);
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

// Application functions
async function getApplications() {
  await ensureModels();
  try {
    const result = await objects.query('applications');
    return result.results || [];
  } catch (error) {
    console.error('Error getting applications:', error);
    return [];
  }
}

async function saveApplications(apps) {
  await ensureModels();
  try {
    const existingApps = await getApplications();
    for (const app of existingApps) {
      await objects.delete('applications', app.id);
    }
    
    for (const app of apps) {
      await objects.set('applications', app.id, app);
    }
  } catch (error) {
    console.error('Error saving applications:', error);
    throw error;
  }
}

async function createApplication(app) {
  await ensureModels();
  try {
    return await objects.set('applications', app.id, app);
  } catch (error) {
    console.error('Error creating application:', error);
    throw error;
  }
}

// Keys functions
async function getKeys() {
  await ensureModels();
  try {
    const result = await objects.query('keys');
    return result.results || [];
  } catch (error) {
    console.error('Error getting keys:', error);
    return [];
  }
}

async function saveKeys(keys) {
  await ensureModels();
  try {
    const existingKeys = await getKeys();
    for (const key of existingKeys) {
      await objects.delete('keys', key.id);
    }
    
    for (const key of keys) {
      await objects.set('keys', key.id, key);
    }
  } catch (error) {
    console.error('Error saving keys:', error);
    throw error;
  }
}

async function createKey(key) {
  await ensureModels();
  try {
    return await objects.set('keys', key.id, key);
  } catch (error) {
    console.error('Error creating key:', error);
    throw error;
  }
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
  ensureModels
};
