const { MongoClient } = require('mongodb');

// MongoDB connection
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/authguard';
const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 5000, // 5 second timeout
  connectTimeoutMS: 5000
});

let db = null;

// Connect to MongoDB
async function connectDB() {
  if (db) return db;
  
  try {
    await client.connect();
    db = client.db();
    console.log('Connected to MongoDB');
    
    // Create indexes
    await db.collection('users').createIndex({ username: 1 }, { unique: true }).catch(() => {});
    await db.collection('applications').createIndex({ seller_id: 1 }).catch(() => {});
    await db.collection('keys').createIndex({ app_id: 1 }).catch(() => {});
    
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Fallback to in-memory storage for development
    console.log('Falling back to in-memory storage');
    return getMemoryDB();
  }
}

// In-memory fallback
let memoryDB = {
  users: [],
  applications: [],
  keys: []
};

function getMemoryDB() {
  return {
    collection: (name) => ({
      find: () => ({
        toArray: async () => memoryDB[name] || []
      }),
      insertOne: async (doc) => ({ insertedId: doc.id }),
      insertMany: async (docs) => ({ insertedIds: docs.map(d => d.id) }),
      deleteMany: async () => ({ deletedCount: (memoryDB[name] || []).length }),
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
    return [];
  }
}

async function saveUsers(users) {
  const db = await connectDB();
  try {
    await db.collection('users').deleteMany({});
    if (users.length > 0) {
      await db.collection('users').insertMany(users);
      // Update memory fallback
      memoryDB.users = users;
    }
  } catch (error) {
    console.error('Error saving users:', error);
    // Update memory fallback
    memoryDB.users = users;
  }
}

async function createUser(user) {
  const db = await connectDB();
  try {
    const result = await db.collection('users').insertOne(user);
    // Update memory fallback
    memoryDB.users = memoryDB.users || [];
    memoryDB.users.push(user);
    return result;
  } catch (error) {
    console.error('Error creating user:', error);
    // Update memory fallback
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
    return [];
  }
}

async function saveApplications(apps) {
  const db = await connectDB();
  try {
    await db.collection('applications').deleteMany({});
    if (apps.length > 0) {
      await db.collection('applications').insertMany(apps);
    }
  } catch (error) {
    console.error('Error saving applications:', error);
    throw error;
  }
}

async function createApplication(app) {
  const db = await connectDB();
  try {
    return await db.collection('applications').insertOne(app);
  } catch (error) {
    console.error('Error creating application:', error);
    throw error;
  }
}

// Keys functions
async function getKeys() {
  const db = await connectDB();
  try {
    return await db.collection('keys').find({}).toArray();
  } catch (error) {
    console.error('Error getting keys:', error);
    return [];
  }
}

async function saveKeys(keys) {
  const db = await connectDB();
  try {
    await db.collection('keys').deleteMany({});
    if (keys.length > 0) {
      await db.collection('keys').insertMany(keys);
    }
  } catch (error) {
    console.error('Error saving keys:', error);
    throw error;
  }
}

async function createKey(key) {
  const db = await connectDB();
  try {
    return await db.collection('keys').insertOne(key);
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
  connectDB
};
