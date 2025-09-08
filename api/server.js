const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { initDatabase, query } = require('./db')
const OpenAI = require('openai')
const { v4: uuidv4 } = require('uuid')

const app = express()
const PORT = process.env.PORT || 8080

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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
      DB_PASSWORD: process.env.DB_PASSWORD ? 'Set' : 'Not set',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Set' : 'Not set'
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
      console.log(`🤖 OpenAI: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'}`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Helper function to generate posts using ChatGPT
async function generatePostsWithChatGPT(interests) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured')
    }

    const isGoodMorning = interests.toLowerCase().includes('good morning') || 
                         interests.toLowerCase().includes('greeting') || 
                         interests.toLowerCase().includes('morning')
    
    const isPepTalk = interests.toLowerCase().includes('quick pep talk') || 
                      interests.toLowerCase().includes('pep talk') || 
                      interests.toLowerCase().includes('motivation')
    
    const isMentalHealth = interests.toLowerCase().includes('mental health') || 
                           interests.toLowerCase().includes('mental wellness') || 
                           interests.toLowerCase().includes('wellness') ||
                           interests.toLowerCase().includes('self care') ||
                           interests.toLowerCase().includes('self-care') ||
                           interests.toLowerCase().includes('anxiety') ||
                           interests.toLowerCase().includes('stress') ||
                           interests.toLowerCase().includes('depression') ||
                           interests.toLowerCase().includes('mindfulness')
    
    let prompt, systemMessage
    
    if (isGoodMorning) {
      systemMessage = "You are writing natural, authentic morning posts. Think of what a real person would genuinely say in the morning - not forced social media content. Keep it simple, honest, and relatable. Avoid being overly enthusiastic or gimmicky."
      prompt = `Create 5 natural, genuine morning posts about: ${interests}

Requirements:
- Natural, genuine tone - like a real person's morning thoughts
- Simple and relatable
- NOT gimmicky or forced
- NOT overly enthusiastic or fake
- Just honest morning vibes
- Can be slightly humorous but not try-hard
- Think of what you'd actually say to a friend in the morning
- Keep each post under 280 characters
- NO hashtags
- NO questions or assumptions
- Just state morning thoughts clearly and naturally`
    } else if (isPepTalk) {
      systemMessage = "You are a motivational speaker who creates short, powerful pep talks. Focus on delivering quick, impactful motivational messages that inspire action and confidence. Keep it authentic and relatable, not overly dramatic."
      prompt = `Create 5 quick motivational pep talks about: ${interests}

Requirements:
- Short, powerful motivational messages
- Inspire action and confidence
- Authentic and relatable tone
- NOT overly dramatic or cheesy
- Focus on empowerment and encouragement
- Keep each pep talk under 280 characters
- NO hashtags
- NO questions or assumptions
- Just deliver clear, motivating messages`
    } else if (isMentalHealth) {
      systemMessage = "You are a compassionate, relatable friend who understands mental health struggles deeply. You are honest, reflective, and empathetic. You have experienced anxiety, depression, or other mental health challenges, and you speak from personal experience without being clinical or detached. You aim to make others feel seen, understood, and less alone."
      prompt = `Create 5 personal mental health posts about: ${interests}

Role/Persona Instructions:
You are a compassionate, relatable friend who understands mental health struggles deeply. You are honest, reflective, and empathetic. You have experienced anxiety, depression, or other mental health challenges, and you speak from personal experience without being clinical or detached. You aim to make others feel seen, understood, and less alone.

Tone & Style:
- Warm, personable, and conversational
- Vulnerable and sincere, not overly polished
- Encouraging without being preachy
- Honest about struggles but hopeful and constructive

Goal:
Write short social media posts about personal mental health struggles. Share genuine feelings, challenges, or moments of difficulty, and include at least one reflection or coping insight that could help someone reading feel understood or supported. The posts should be relatable, making readers feel: "Yes, I get this" or "I'm not alone in feeling this way." Avoid clinical jargon; focus on lived experience.

Additional Persona Cues:
- Speak as if sharing with a friend who might also struggle silently
- Include small, relatable details that make the experience real (like feeling overwhelmed by small tasks, racing thoughts, moments of self-doubt)
- Emphasize empathy and shared human experience, not just advice

Requirements:
- Keep each post under 280 characters
- NO hashtags
- NO questions or assumptions
- NO medical advice or diagnosis
- Write as if ready to be shared publicly
- Include a final sentence that leaves the reader with a feeling of connection or hope
- Format: One post per line, no numbering`
    } else {
      systemMessage = "You are a professional content creator who writes factual, insightful posts for X (Twitter). Focus on pure facts, observations, and insights. Do not ask questions or make assumptions. Just state facts clearly and professionally."
      prompt = `Create 5 professional, factual posts about: ${interests}

Requirements:
- Professional, factual tone
- Pure facts and insights only
- NO questions or assumptions
- NO added context or commentary
- Just state facts, observations, or insights
- Keep each post under 280 characters
- NO hashtags
- Focus on valuable, informative content`
    }

    console.log('Generating posts with OpenAI...')
    console.log('System message:', systemMessage)
    console.log('Prompt:', prompt)

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemMessage
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    })

    const response = completion.choices[0].message.content
    console.log('OpenAI response received:', response)
    
    // Parse the response into individual posts
    const posts = response
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.trim())
      .filter(content => content.length > 0 && content.length <= 280)
      .slice(0, 5) // Ensure we only get 5 posts
      .map((content, index) => ({
        id: uuidv4(),
        content: content,
        topic: interests.split(',')[0]?.trim() || 'General',
        createdAt: new Date().toISOString()
      }))

    console.log('Parsed posts:', posts)
    return posts
  } catch (error) {
    console.error('Error generating posts with OpenAI:', error)
    
    // Fallback to mock data if OpenAI fails
    console.log('Falling back to mock data...')
    const mockPosts = [
      {
        id: uuidv4(),
        content: `Just finished reading about ${interests.split(',')[0]?.trim()}. The insights are game-changing. What's your take on this?`,
        topic: interests.split(',')[0]?.trim() || 'General',
        createdAt: new Date().toISOString()
      },
      {
        id: uuidv4(),
        content: `Been thinking about ${interests.split(',')[0]?.trim()} lately. The more I learn, the more I realize how much there is to discover.`,
        topic: interests.split(',')[0]?.trim() || 'General',
        createdAt: new Date().toISOString()
      },
      {
        id: uuidv4(),
        content: `Quick thought: ${interests.split(',')[0]?.trim()} isn't just about the technical side. It's about the people and the problems we're solving.`,
        topic: interests.split(',')[0]?.trim() || 'General',
        createdAt: new Date().toISOString()
      },
      {
        id: uuidv4(),
        content: `Here's what I've learned about ${interests.split(',')[0]?.trim()}: sometimes the simplest solutions are the most effective.`,
        topic: interests.split(',')[0]?.trim() || 'General',
        createdAt: new Date().toISOString()
      },
      {
        id: uuidv4(),
        content: `Working on something exciting in ${interests.split(',')[0]?.trim()}. The possibilities are endless when you focus on solving real problems.`,
        topic: interests.split(',')[0]?.trim() || 'General',
        createdAt: new Date().toISOString()
      }
    ]

    return mockPosts
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  if (isDatabaseReady) {
    res.status(200).json({ 
      status: 'healthy', 
      database: 'connected',
      openai: process.env.OPENAI_API_KEY ? 'configured' : 'not configured',
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
    database: isDatabaseReady ? 'connected' : 'connecting',
    openai: process.env.OPENAI_API_KEY ? 'configured' : 'not configured'
  })
})

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'API is working!', 
    timestamp: new Date().toISOString(),
    database: isDatabaseReady ? 'connected' : 'connecting',
    openai: process.env.OPENAI_API_KEY ? 'configured' : 'not configured'
  })
})

// Generate posts endpoint
app.post('/api/generate-posts', async (req, res) => {
  try {
    const { interests } = req.body
    
    if (!interests || !interests.trim()) {
      return res.status(400).json({ error: 'Interests are required' })
    }

    console.log('Generating posts for interests:', interests)
    
    // Use ChatGPT to generate posts
    const posts = await generatePostsWithChatGPT(interests)
    
    res.json({ posts })
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
    console.log('Attempting to delete post with ID:', id)
    
    // Get default user ID
    const userResult = await query('SELECT id FROM users LIMIT 1')
    if (userResult.rows.length === 0) {
      console.log('No user found in database')
      return res.status(500).json({ error: 'No user found' })
    }
    const userId = userResult.rows[0].id
    console.log('Using user ID:', userId)

    // First, check if the post exists
    const checkResult = await query(
      'SELECT id, content, topic FROM posts WHERE id = $1 AND user_id = $2',
      [id, userId]
    )
    
    if (checkResult.rows.length === 0) {
      console.log('Post not found with ID:', id, 'for user:', userId)
      return res.status(404).json({ error: 'Post not found' })
    }
    
    console.log('Found post to delete:', checkResult.rows[0])

    // Check if this post is scheduled anywhere
    const scheduledCheck = await query(
      'SELECT id, scheduled_date, scheduled_time FROM scheduled_posts WHERE post_id = $1 AND user_id = $2',
      [id, userId]
    )
    
    if (scheduledCheck.rows.length > 0) {
      console.log('Post is scheduled in', scheduledCheck.rows.length, 'time slots. Removing scheduled entries first...')
      
      // Delete all scheduled entries for this post
      await query(
        'DELETE FROM scheduled_posts WHERE post_id = $1 AND user_id = $2',
        [id, userId]
      )
      
      console.log('Removed scheduled entries for post')
    }

    // Now delete the post from database
    const result = await query(
      'DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    )

    console.log('Delete query result:', result.rows)

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