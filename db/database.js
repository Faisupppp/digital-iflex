const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'digitaliflex.db');
let db = null;

function saveDB() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// Auto-save every 30 seconds
setInterval(saveDB, 30000);

// Save on exit
process.on('exit', saveDB);
process.on('SIGINT', () => { saveDB(); process.exit(); });

async function initDB() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      country_code TEXT DEFAULT '+91',
      service TEXT,
      message TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      excerpt TEXT,
      content TEXT NOT NULL,
      author TEXT DEFAULT 'Admin',
      category TEXT DEFAULT 'Digital Marketing',
      is_published INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      referrer TEXT,
      country TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS whatsapp_clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page TEXT,
      ip TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT (datetime('now'))
    )
  `);

  // Seed admin user
  const adminCount = db.exec('SELECT COUNT(*) as count FROM admin_users');
  if (adminCount[0].values[0][0] === 0) {
    const hashedPass = bcrypt.hashSync(process.env.ADMIN_PASS || 'admin123', 10);
    db.run('INSERT INTO admin_users (username, password) VALUES (?, ?)', [
      process.env.ADMIN_USER || 'admin', hashedPass
    ]);
    console.log('Default admin user created');
  }

  // Seed blog posts
  const blogCount = db.exec('SELECT COUNT(*) as count FROM blog_posts');
  if (blogCount[0].values[0][0] === 0) {
    const posts = [
      ['The Future of AI in Digital Marketing: Trends to Watch in 2025', 'ai-digital-marketing-2025', 'Explore how AI is reshaping digital marketing strategies.', 'AI is revolutionizing digital marketing with predictive analytics, personalized content, chatbots, and programmatic advertising.', 'AI & Technology'],
      ['Why Every Business Needs a Strong Social Media Strategy', 'social-media-strategy-business', 'Discover why social media marketing is essential for modern businesses.', 'A strong social media presence builds brand awareness, drives engagement, generates leads, and provides competitive advantage.', 'Social Media'],
      ['SEO Best Practices: How to Rank Higher on Google in 2025', 'seo-best-practices-2025', 'Learn the latest SEO strategies to improve your website ranking.', 'Focus on Core Web Vitals, quality content, mobile-first indexing, voice search optimization, and E-E-A-T principles.', 'SEO']
    ];
    posts.forEach(p => {
      db.run('INSERT INTO blog_posts (title, slug, excerpt, content, category) VALUES (?, ?, ?, ?, ?)', p);
    });
    console.log('Sample blog posts created');
  }

  saveDB();
  console.log('Database initialized successfully');
  return db;
}

// Helper to convert sql.js results to array of objects
function queryAll(sql, params) {
  try {
    const stmt = db.prepare(sql);
    if (params) stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (err) {
    console.error('Query error:', sql, err.message);
    return [];
  }
}

function queryOne(sql, params) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

function runSql(sql, params) {
  try {
    if (params) {
      db.run(sql, params);
    } else {
      db.run(sql);
    }
    saveDB();
    return { lastInsertRowid: db.exec('SELECT last_insert_rowid()')[0].values[0][0] };
  } catch (err) {
    console.error('Run error:', sql, err.message);
    throw err;
  }
}

function getCount(sql, params) {
  try {
    const result = params ? db.exec(sql, params) : db.exec(sql);
    return result[0] ? result[0].values[0][0] : 0;
  } catch (err) {
    return 0;
  }
}

module.exports = { initDB, queryAll, queryOne, runSql, getCount, getDB: () => db };
