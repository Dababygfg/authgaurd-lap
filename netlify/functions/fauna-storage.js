const faunadb = require('faunadb');

// Initialize Fauna client
const q = faunadb.query;
const client = new faunadb.Client({
  secret: process.env.FAUNA_SECRET || 'fnafakeyfordevelopment',
  domain: 'db.fauna.com',
  scheme: 'https'
});

// Collection names
const COLLECTIONS = {
  users: 'users',
  applications: 'applications',
  keys: 'keys'
};

// Helper functions for Fauna
async function ensureCollections() {
  try {
    // Create collections if they don't exist
    for (const collectionName of Object.values(COLLECTIONS)) {
      try {
        await client.query(q.create_collection({ name: collectionName }));
        console.log(`Created collection: ${collectionName}`);
      } catch (error) {
        // Collection already exists
        if (error.requestResult.statusCode !== 400) {
          throw error;
        }
      }
    }

    // Create indexes if they don't exist
    try {
      await client.query(
        q.create_index({
          name: 'users_by_username',
          source: q.collection(COLLECTIONS.users),
          terms: [{ field: ['data', 'username'] }]
        })
      );
    } catch (error) {
      if (error.requestResult.statusCode !== 400) throw error;
    }

    try {
      await client.query(
        q.create_index({
          name: 'keys_by_app_id',
          source: q.collection(COLLECTIONS.keys),
          terms: [{ field: ['data', 'app_id'] }]
        })
      );
    } catch (error) {
      if (error.requestResult.statusCode !== 400) throw error;
    }

  } catch (error) {
    console.error('Error ensuring collections:', error);
  }
}

// User functions
async function getUsers() {
  await ensureCollections();
  try {
    const result = await client.query(
      q.map(
        ['data', 'ref', 'ts'],
        q.lambda(['ref', 'data', 'ts'], q.merge(q.var('data'), { id: q.select(['id'], q.var('ref')) })),
        q.paginate(q.match(q.collection(COLLECTIONS.users)), { size: 1000 })
      )
    );
    return result.data || [];
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
}

async function saveUsers(users) {
  await ensureCollections();
  try {
    // Clear existing users
    const existingUsers = await getUsers();
    for (const user of existingUsers) {
      await client.query(q.delete(q.ref(q.collection(COLLECTIONS.users), user.id)));
    }
    
    // Save new users
    for (const user of users) {
      const { id, ...userData } = user;
      await client.query(
        q.create(q.collection(COLLECTIONS.users), { data: userData })
      );
    }
  } catch (error) {
    console.error('Error saving users:', error);
    throw error;
  }
}

async function createUser(user) {
  await ensureCollections();
  try {
    const { id, ...userData } = user;
    return await client.query(
      q.create(q.collection(COLLECTIONS.users), { data: userData })
    );
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

// Application functions
async function getApplications() {
  await ensureCollections();
  try {
    const result = await client.query(
      q.map(
        ['data', 'ref', 'ts'],
        q.lambda(['ref', 'data', 'ts'], q.merge(q.var('data'), { id: q.select(['id'], q.var('ref')) })),
        q.paginate(q.match(q.collection(COLLECTIONS.applications)), { size: 1000 })
      )
    );
    return result.data || [];
  } catch (error) {
    console.error('Error getting applications:', error);
    return [];
  }
}

async function saveApplications(apps) {
  await ensureCollections();
  try {
    const existingApps = await getApplications();
    for (const app of existingApps) {
      await client.query(q.delete(q.ref(q.collection(COLLECTIONS.applications), app.id)));
    }
    
    for (const app of apps) {
      const { id, ...appData } = app;
      await client.query(
        q.create(q.collection(COLLECTIONS.applications), { data: appData })
      );
    }
  } catch (error) {
    console.error('Error saving applications:', error);
    throw error;
  }
}

async function createApplication(app) {
  await ensureCollections();
  try {
    const { id, ...appData } = app;
    return await client.query(
      q.create(q.collection(COLLECTIONS.applications), { data: appData })
    );
  } catch (error) {
    console.error('Error creating application:', error);
    throw error;
  }
}

// Keys functions
async function getKeys() {
  await ensureCollections();
  try {
    const result = await client.query(
      q.map(
        ['data', 'ref', 'ts'],
        q.lambda(['ref', 'data', 'ts'], q.merge(q.var('data'), { id: q.select(['id'], q.var('ref')) })),
        q.paginate(q.match(q.collection(COLLECTIONS.keys)), { size: 1000 })
      )
    );
    return result.data || [];
  } catch (error) {
    console.error('Error getting keys:', error);
    return [];
  }
}

async function saveKeys(keys) {
  await ensureCollections();
  try {
    const existingKeys = await getKeys();
    for (const key of existingKeys) {
      await client.query(q.delete(q.ref(q.collection(COLLECTIONS.keys), key.id)));
    }
    
    for (const key of keys) {
      const { id, ...keyData } = key;
      await client.query(
        q.create(q.collection(COLLECTIONS.keys), { data: keyData })
      );
    }
  } catch (error) {
    console.error('Error saving keys:', error);
    throw error;
  }
}

async function createKey(key) {
  await ensureCollections();
  try {
    const { id, ...keyData } = key;
    return await client.query(
      q.create(q.collection(COLLECTIONS.keys), { data: keyData })
    );
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
  ensureCollections
};
