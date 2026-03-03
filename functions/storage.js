const fs = require('fs').promises;
const path = require('path');

// Use /tmp directory for Netlify Functions (writable)
const DATA_DIR = process.env.NETLIFY ? '/tmp/data' : path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const APPS_FILE = path.join(DATA_DIR, 'applications.json');
const KEYS_FILE = path.join(DATA_DIR, 'keys.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Read data from file with better error handling
async function readData(filename) {
  try {
    await ensureDataDir();
    const data = await fs.readFile(filename, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.log(`Creating new data file: ${filename}`);
    return [];
  }
}

// Write data to file with atomic write
async function writeData(filename, data) {
  await ensureDataDir();
  const tempFile = filename + '.tmp';
  await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tempFile, filename);
}

// Storage functions
async function getUsers() {
  return await readData(USERS_FILE);
}

async function saveUsers(users) {
  await writeData(USERS_FILE, users);
}

async function getApplications() {
  return await readData(APPS_FILE);
}

async function saveApplications(apps) {
  await writeData(APPS_FILE, apps);
}

async function getKeys() {
  return await readData(KEYS_FILE);
}

async function saveKeys(keys) {
  await writeData(KEYS_FILE, keys);
}

module.exports = {
  getUsers,
  saveUsers,
  getApplications,
  saveApplications,
  getKeys,
  saveKeys
};
