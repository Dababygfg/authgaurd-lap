const { MongoClient } = require('mongodb');

// MongoDB connection
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/authguard';
const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 2000, // 2 second timeout
  connectTimeoutMS: 2000,
  maxPoolSize: 1, // Limit connections
  minPoolSize: 0
});

let db = null;
let isConnected = false;

// Connect to MongoDB
async function connectDB() {
  if (isConnected && db) return db;
  
  try {
    console.log('Attempting MongoDB connection...');
    await client.connect();
    db = client.db();
    isConnected = true;
    console.log('Connected to MongoDB');
    
    // Test the connection
    await db.admin().ping();
    console.log('MongoDB ping successful');
    
    // Create indexes (only once)
    const usersCollection = db.collection('users');
    const appsCollection = db.collection('applications');
    const keysCollection = db.collection('keys');
    
    // Try to create indexes, ignore if they exist
    await Promise.allSettled([
      usersCollection.createIndex({ username: 1 }, { unique: true }),
      appsCollection.createIndex({ seller_id: 1 }),
      keysCollection.createIndex({ app_id: 1 }),
      keysCollection.createIndex({ key_string: 1 }, { unique: true })
    ]);
    
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    // Fallback to in-memory storage for development
    console.log('Falling back to in-memory storage');
    return getMemoryDB();
  }
}

// In-memory fallback
let memoryDB = {
  users: [{
    id: 'admin-default',
    username: 'Dababyq',
    password: '$2a$10$uk.Yes5zrDe6twEem5EajedyiZetEZbz2DKOCumtmVyfxB3XXn0RS', // Hashed "Dababy19"
    is_admin: true,
    created_at: new Date().toISOString(),
    name: 'Admin',
    email: 'admin@authguard.com'
  }],
  applications: [],
  keys: []
};

function getMemoryDB() {
  return {
    collection: (name) => ({
      find: () => ({
        toArray: async () => memoryDB[name] || []
      }),
      insertOne: async (doc) => {
        if (!memoryDB[name]) memoryDB[name] = [];
        memoryDB[name].push(doc);
        return { insertedId: doc.id };
      },
      insertMany: async (docs) => {
        if (!memoryDB[name]) memoryDB[name] = [];
        memoryDB[name].push(...docs);
        return { insertedIds: docs.map(d => d.id) };
      },
      deleteMany: async () => {
        const count = (memoryDB[name] || []).length;
        memoryDB[name] = [];
        return { deletedCount: count };
      },
      createIndex: async () => {}
    })
  };
}

// User functions
async function getUsers() {
  const db = await connectDB();
  try {
    return await db.collection('users').find({}).toArray();
  } catch (error) {
    console.error('Error getting users:', error);
    return memoryDB.users || [];
  }
}

async function saveUsers(newUsers) {
  const db = await connectDB();
  try {
    await db.collection('users').deleteMany({});
    if (newUsers.length > 0) {
      await db.collection('users').insertMany(newUsers);
    }
  } catch (error) {
    console.error('Error saving users:', error);
    memoryDB.users = newUsers;
  }
}

async function createUser(user) {
  const db = await connectDB();
  try {
    const result = await db.collection('users').insertOne(user);
    return result;
  } catch (error) {
    console.error('Error creating user:', error);
    memoryDB.users = memoryDB.users || [];
    memoryDB.users.push(user);
    throw error;
  }
}

// Application functions
async function getApplications() {
  const db = await connectDB();
  try {
    return await db.collection('applications').find({}).toArray();
  } catch (error) {
    console.error('Error getting applications:', error);
    return memoryDB.applications || [];
  }
}

async function saveApplications(newApps) {
  const db = await connectDB();
  try {
    await db.collection('applications').deleteMany({});
    if (newApps.length > 0) {
      await db.collection('applications').insertMany(newApps);
    }
  } catch (error) {
    console.error('Error saving applications:', error);
    memoryDB.applications = newApps;
  }
}

async function createApplication(app) {
  const db = await connectDB();
  try {
    const result = await db.collection('applications').insertOne(app);
    return result;
  } catch (error) {
    console.error('Error creating application:', error);
    memoryDB.applications = memoryDB.applications || [];
    memoryDB.applications.push(app);
    throw error;
  }
}

// Key functions
async function getKeys() {
  const db = await connectDB();
  try {
    return await db.collection('keys').find({}).toArray();
  } catch (error) {
    console.error('Error getting keys:', error);
    return memoryDB.keys || [];
  }
}

async function saveKeys(newKeys) {
  const db = await connectDB();
  try {
    await db.collection('keys').deleteMany({});
    if (newKeys.length > 0) {
      await db.collection('keys').insertMany(newKeys);
    }
  } catch (error) {
    console.error('Error saving keys:', error);
    memoryDB.keys = newKeys;
  }
}

async function createKey(key) {
  const db = await connectDB();
  try {
    const result = await db.collection('keys').insertOne(key);
    return result;
  } catch (error) {
    console.error('Error creating key:', error);
    memoryDB.keys = memoryDB.keys || [];
    memoryDB.keys.push(key);
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
  connectDB
};
