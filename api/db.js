const { Pool } = require('pg');

// Create connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Helper function to run queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Initialize database tables
const initDatabase = async () => {
  try {
    console.log('Initializing database tables...');
    
    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create posts table
    await query(`
      CREATE TABLE IF NOT EXISTS posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        content TEXT NOT NULL,
        topic VARCHAR(255),
        character_count INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create scheduled_posts table
    await query(`
      CREATE TABLE IF NOT EXISTS scheduled_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID REFERENCES posts(id),
        user_id UUID REFERENCES users(id),
        scheduled_date DATE NOT NULL,
        scheduled_time VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'scheduled',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(scheduled_date, scheduled_time, user_id)
      )
    `);
    
    // Create user_preferences table
    await query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) UNIQUE,
        interests TEXT[],
        tone VARCHAR(50) DEFAULT 'professional',
        post_count INTEGER DEFAULT 5,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create indexes for better performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_scheduled_posts_date_time ON scheduled_posts(scheduled_date, scheduled_time)
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user ON scheduled_posts(user_id)
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id)
    `);
    
    console.log('Database tables initialized successfully');
    
    // Create default user if none exists
    const userResult = await query('SELECT id FROM users LIMIT 1');
    if (userResult.rows.length === 0) {
      const defaultUser = await query(
        'INSERT INTO users (email) VALUES ($1) RETURNING id',
        ['default@contentcalendar.com']
      );
      console.log('Created default user with ID:', defaultUser.rows[0].id);
      
      // Initialize default preferences
      await query(
        'INSERT INTO user_preferences (user_id, interests, tone, post_count) VALUES ($1, $2, $3, $4)',
        [defaultUser.rows[0].id, [], 'professional', 5]
      );
      console.log('Initialized default user preferences');
    }
    
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Clean up old posts (older than 6 months)
const cleanupOldPosts = async () => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const result = await query(
      'DELETE FROM posts WHERE created_at < $1 RETURNING id',
      [sixMonthsAgo.toISOString()]
    );
    
    if (result.rows.length > 0) {
      console.log(`Cleaned up ${result.rows.length} posts older than 6 months`);
    }
    
    // Also clean up scheduled posts older than 6 months
    const scheduledResult = await query(
      'DELETE FROM scheduled_posts WHERE scheduled_date < $1 RETURNING id',
      [sixMonthsAgo.toISOString().split('T')[0]]
    );
    
    if (scheduledResult.rows.length > 0) {
      console.log(`Cleaned up ${scheduledResult.rows.length} scheduled posts older than 6 months`);
    }
    
  } catch (error) {
    console.error('Error cleaning up old posts:', error);
  }
};

// Schedule cleanup to run daily
setInterval(cleanupOldPosts, 24 * 60 * 60 * 1000); // Run every 24 hours

module.exports = {
  query,
  initDatabase,
  cleanupOldPosts,
  pool
}; 