const { MongoClient } = require('mongodb');

exports.handler = async (event, context) => {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'MONGODB_URI not found in environment variables' })
    };
  }

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000
  });

  try {
    console.log('Testing MongoDB connection...');
    await client.connect();
    
    const db = client.db();
    await db.admin().ping();
    
    // Test basic operations
    const testCollection = db.collection('test');
    await testCollection.insertOne({ test: 'connection', timestamp: new Date() });
    const result = await testCollection.findOne({ test: 'connection' });
    await testCollection.deleteOne({ test: 'connection' });
    
    await client.close();
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'MongoDB connection successful',
        testResult: result
      })
    };
  } catch (error) {
    console.error('MongoDB test failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        error: error.message,
        uri: uri.replace(/\/\/.*@/, '//***:***@') // Hide credentials in response
      })
    };
  }
};
