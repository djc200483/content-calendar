const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { initDatabase, query } = require('./db')

const app = express()
const PORT = process.env.PORT || 8080

// Middleware
app.use(cors())
app.use(express.json())

// Initialize database when server starts
let isDatabaseReady = false

const startServer = async () => {
  try {
    console.log('Starting Content Calendar API server...')
    console.log('Environment variables loaded:', {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DB_HOST: process.env.DB_HOST ? 'Set' : 'Not set',
      DB_PORT: process.env.DB_PORT ? 'Set' : 'Not set',
      DB_NAME: process.env.DB_NAME ? 'Set' : 'Not set',
      DB_USER: process.env.DB_USER ? 'Set' : 'Not set',
      DB_PASSWORD: process.env.DB_PASSWORD ? 'Set' : 'Not set'
    })

    // Initialize database
    console.log('Initializing database...')
    await initDatabase()
    isDatabaseReady = true
    console.log('Database initialized successfully')

    // Start server
    app.listen(PORT, () => {
      console.log(`✅ Content Calendar API server running on port ${PORT}`)
      console.log(`🌐 Server URL: http://localhost:${PORT}`)
      console.log(`📊 Database: Connected and ready`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  if (isDatabaseReady) {
    res.status(200).json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: new Date().toISOString()
    })
  } else {
    res.status(503).json({ 
      status: 'unhealthy', 
      database: 'connecting',
      timestamp: new Date().toISOString()
    })
  }
})

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Content Calendar API', 
    status: 'running',
    database: isDatabaseReady ? 'connected' : 'connecting'
  })
})

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'API is working!', 
    timestamp: new Date().toISOString(),
    database: isDatabaseReady ? 'connected' : 'connecting'
  })
})

// Generate posts endpoint
app.post('/api/generate-posts', async (req, res) => {
  try {
    const { interests } = req.body
    
    if (!interests || !interests.trim()) {
      return res.status(400).json({ error: 'Interests are required' })
    }

    // For now, return mock posts (you can integrate with OpenAI later)
    const mockPosts = [
      {
        id: `post_${Date.now()}_1`,
        content: `Here's an interesting thought about ${interests}: The future of ${interests} is evolving rapidly, and staying ahead requires continuous learning and adaptation. What's your take on the latest developments?`,
        topic: interests,
        createdAt: new Date().toISOString()
      },
      {
        id: `post_${Date.now()}_2`,
        content: `Just finished reading an amazing article about ${interests}. The insights were eye-opening and made me rethink my approach. Sometimes the best ideas come from unexpected sources.`,
        topic: interests,
        createdAt: new Date().toISOString()
      },
      {
        id: `post_${Date.now()}_3`,
        content: `Working on a new project related to ${interests} today. The challenges are real, but so are the opportunities. Every obstacle is a chance to innovate and grow.`,
        topic: interests,
        createdAt: new Date().toISOString()
      }
    ]

    res.json({ posts: mockPosts })
  } catch (error) {
    console.error('Error generating posts:', error)
    res.status(500).json({ error: 'Failed to generate posts' })
  }
})

// Save post endpoint
app.post('/api/save-post', async (req, res) => {
  try {
    if (!isDatabaseReady) {
      return res.status(503).json({ error: 'Database not ready' })
    }

    const { post } = req.body
    
    if (!post || !post.content) {
      return res.status(400).json({ error: 'Post content is required' })
    }

    // Get default user ID
    const userResult = await query('SELECT id FROM users LIMIT 1')
    if (userResult.rows.length === 0) {
      return res.status(500).json({ error: 'No user found' })
    }
    const userId = userResult.rows[0].id

    // Save post to database
    const result = await query(
      'INSERT INTO posts (user_id, content, topic, character_count) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, post.content, post.topic, post.content.length]
    )

    const savedPost = {
      id: result.rows[0].id,
      content: result.rows[0].content,
      topic: result.rows[0].topic,
      createdAt: result.rows[0].created_at
    }

    res.json({ post: savedPost, message: 'Post saved successfully' })
  } catch (error) {
    console.error('Error saving post:', error)
    res.status(500).json({ error: 'Failed to save post' })
  }
})

// Get saved posts endpoint
app.get('/api/saved-posts', async (req, res) => {
  try {
    if (!isDatabaseReady) {
      return res.status(503).json({ error: 'Database not ready' })
    }

    // Get default user ID
    const userResult = await query('SELECT id FROM users LIMIT 1')
    if (userResult.rows.length === 0) {
      return res.json({ posts: [] })
    }
    const userId = userResult.rows[0].id

    // Get posts from database
    const result = await query(
      'SELECT id, content, topic, created_at FROM posts WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    )

    const posts = result.rows.map(row => ({
      id: row.id,
      content: row.content,
      topic: row.topic,
      createdAt: row.created_at
    }))

    res.json({ posts })
  } catch (error) {
    console.error('Error getting saved posts:', error)
    res.status(500).json({ error: 'Failed to get saved posts' })
  }
})

// Delete saved post endpoint
app.delete('/api/saved-posts/:id', async (req, res) => {
  try {
    if (!isDatabaseReady) {
      return res.status(503).json({ error: 'Database not ready' })
    }

    const { id } = req.params
    
    // Get default user ID
    const userResult = await query('SELECT id FROM users LIMIT 1')
    if (userResult.rows.length === 0) {
      return res.status(500).json({ error: 'No user found' })
    }
    const userId = userResult.rows[0].id

    // Delete post from database
    const result = await query(
      'DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' })
    }

    res.json({ message: 'Post deleted successfully' })
  } catch (error) {
    console.error('Error deleting post:', error)
    res.status(500).json({ error: 'Failed to delete post' })
  }
})

// Get user preferences endpoint
app.get('/api/preferences', async (req, res) => {
  try {
    if (!isDatabaseReady) {
      return res.status(503).json({ error: 'Database not ready' })
    }

    // Get default user ID
    const userResult = await query('SELECT id FROM users LIMIT 1')
    if (userResult.rows.length === 0) {
      return res.status(500).json({ error: 'No user found' })
    }
    const userId = userResult.rows[0].id

    // Get preferences from database
    const result = await query(
      'SELECT interests, tone, post_count FROM user_preferences WHERE user_id = $1',
      [userId]
    )

    if (result.rows.length === 0) {
      return res.json({ preferences: { interests: [], tone: 'professional', postCount: 5 } })
    }

    const preferences = {
      interests: result.rows[0].interests || [],
      tone: result.rows[0].tone || 'professional',
      postCount: result.rows[0].post_count || 5
    }

    res.json({ preferences })
  } catch (error) {
    console.error('Error getting preferences:', error)
    res.status(500).json({ error: 'Failed to get preferences' })
  }
})

// Save user preferences endpoint
app.post('/api/preferences', async (req, res) => {
  try {
    if (!isDatabaseReady) {
      return res.status(503).json({ error: 'Database not ready' })
    }

    const { interests, tone, postCount } = req.body
    
    // Get default user ID
    const userResult = await query('SELECT id FROM users LIMIT 1')
    if (userResult.rows.length === 0) {
      return res.status(500).json({ error: 'No user found' })
    }
    const userId = userResult.rows[0].id

    // Update preferences in database
    await query(
      'UPDATE user_preferences SET interests = $1, tone = $2, post_count = $3, updated_at = NOW() WHERE user_id = $4',
      [interests, tone, postCount, userId]
    )

    res.json({ message: 'Preferences saved successfully' })
  } catch (error) {
    console.error('Error saving preferences:', error)
    res.status(500).json({ error: 'Failed to save preferences' })
  }
})

// Schedule post endpoint
app.post('/api/schedule-post', async (req, res) => {
  try {
    if (!isDatabaseReady) {
      return res.status(503).json({ error: 'Database not ready' })
    }

    const { post, date, time } = req.body
    
    if (!post || !date || !time) {
      return res.status(400).json({ error: 'Post, date, and time are required' })
    }

    // Get default user ID
    const userResult = await query('SELECT id FROM users LIMIT 1')
    if (userResult.rows.length === 0) {
      return res.status(500).json({ error: 'No user found' })
    }
    const userId = userResult.rows[0].id

    // First, save the post if it doesn't have an ID
    let postId = post.id
    if (!postId.startsWith('post_')) {
      // This is a new post, save it first
      const postResult = await query(
        'INSERT INTO posts (user_id, content, topic, character_count) VALUES ($1, $2, $3, $4) RETURNING id',
        [userId, post.content, post.topic, post.content.length]
      )
      postId = postResult.rows[0].id
    }

    // Remove any existing scheduled post at this date/time
    await query(
      'DELETE FROM scheduled_posts WHERE scheduled_date = $1 AND scheduled_time = $2 AND user_id = $3',
      [date, time, userId]
    )

    // Schedule the new post
    const result = await query(
      'INSERT INTO scheduled_posts (post_id, user_id, scheduled_date, scheduled_time) VALUES ($1, $2, $3, $4) RETURNING *',
      [postId, userId, date, time]
    )

    const scheduledPost = {
      id: result.rows[0].id,
      content: post.content,
      topic: post.topic,
      day: date,
      time: time,
      isScheduled: true,
      createdAt: result.rows[0].created_at
    }

    res.json({ scheduledPost, message: 'Post scheduled successfully' })
  } catch (error) {
    console.error('Error scheduling post:', error)
    res.status(500).json({ error: 'Failed to schedule post' })
  }
})

// Get scheduled posts endpoint
app.get('/api/scheduled-posts', async (req, res) => {
  try {
    if (!isDatabaseReady) {
      return res.status(503).json({ error: 'Database not ready' })
    }

    // Get default user ID
    const userResult = await query('SELECT id FROM users LIMIT 1')
    if (userResult.rows.length === 0) {
      return res.json({ scheduledPosts: [] })
    }
    const userId = userResult.rows[0].id

    // Get scheduled posts from database with post content
    const result = await query(`
      SELECT sp.id, sp.scheduled_date, sp.scheduled_time, sp.created_at,
             p.content, p.topic
      FROM scheduled_posts sp
      JOIN posts p ON sp.post_id = p.id
      WHERE sp.user_id = $1
      ORDER BY sp.scheduled_date, sp.scheduled_time
    `, [userId])

    const scheduledPosts = result.rows.map(row => ({
      id: row.id,
      content: row.content,
      topic: row.topic,
      day: row.scheduled_date,
      time: row.scheduled_time,
      isScheduled: true,
      createdAt: row.created_at
    }))

    res.json({ scheduledPosts })
  } catch (error) {
    console.error('Error getting scheduled posts:', error)
    res.status(500).json({ error: 'Failed to get scheduled posts' })
  }
})

// Delete scheduled post endpoint
app.delete('/api/scheduled-posts/:id', async (req, res) => {
  try {
    if (!isDatabaseReady) {
      return res.status(503).json({ error: 'Database not ready' })
    }

    const { id } = req.params
    
    // Get default user ID
    const userResult = await query('SELECT id FROM users LIMIT 1')
    if (userResult.rows.length === 0) {
      return res.status(500).json({ error: 'No user found' })
    }
    const userId = userResult.rows[0].id

    // Delete scheduled post from database
    const result = await query(
      'DELETE FROM scheduled_posts WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scheduled post not found' })
    }

    res.json({ message: 'Scheduled post deleted successfully' })
  } catch (error) {
    console.error('Error deleting scheduled post:', error)
    res.status(500).json({ error: 'Failed to delete scheduled post' })
  }
})

// Start the server
startServer()

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  process.exit(0)
}) 