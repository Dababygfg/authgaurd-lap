// MongoDB-based storage (persistent cloud database)
const { MongoClient } = require('mongodb');

// MongoDB connection - replace with your Atlas connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://username:password@cluster.mongodb.net/authguard?retryWrites=true&w=majority';
const client = new MongoClient(MONGODB_URI);

let db;
let connected = false;

// Connect to MongoDB
async function connectDB() {
  if (connected) return;
  
  try {
    await client.connect();
    db = client.db();
    connected = true;
    console.log('Connected to MongoDB');
    
    // Initialize default data if needed
    await initializeDefaultData();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Fallback to memory storage if MongoDB fails
    console.log('Falling back to memory storage');
  }
}

// Initialize default data
const initializeDefaultData = async () => {
  if (!db) return;
  
  try {
    const usersCount = await db.collection('users').countDocuments();
    if (usersCount === 0) {
      await db.collection('users').insertOne({
        id: 'admin-default',
        username: 'Dababyq',
        password: '$2a$10$uk.Yes5zrDe6twEem5EajedyiZetEZbz2DKOCumtmVyfxB3XXn0RS', // Hashed "Dababy19"
        is_admin: true,
        created_at: new Date().toISOString(),
        name: 'Admin',
        email: 'admin@authguard.com'
      });
      console.log('Default admin user created');
    }
  } catch (error) {
    console.error('Error initializing default data:', error);
  }
};

// User functions
async function getUsers() {
  await connectDB();
  if (!db) return [];
  return await db.collection('users').find({}).toArray();
}

async function saveUsers(newUsers) {
  await connectDB();
  if (!db) return;
  
  await db.collection('users').deleteMany({});
  await db.collection('users').insertMany(newUsers);
}

async function createUser(user) {
  await connectDB();
  if (!db) return;
  await db.collection('users').insertOne(user);
}

// Application functions
async function getApplications() {
  await connectDB();
  if (!db) return [];
  return await db.collection('applications').find({}).toArray();
}

async function saveApplications(newApps) {
  await connectDB();
  if (!db) return;
  
  await db.collection('applications').deleteMany({});
  await db.collection('applications').insertMany(newApps);
}

async function createApplication(app) {
  await connectDB();
  if (!db) return;
  await db.collection('applications').insertOne(app);
}

// Key functions
async function getKeys() {
  await connectDB();
  if (!db) return [];
  return await db.collection('keys').find({}).toArray();
}

async function saveKeys(newKeys) {
  await connectDB();
  if (!db) return;
  
  await db.collection('keys').deleteMany({});
  await db.collection('keys').insertMany(newKeys);
}

async function createKey(key) {
  await connectDB();
  if (!db) return;
  await db.collection('keys').insertOne(key);
}

// Initialize default data
const initializeDefaultDataWrapper = () => {
  initializeDefaultData();
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
  initializeDefaultData: initializeDefaultDataWrapper
};
