const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const OpenAI = require('openai');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for MVP (replace with database in production)
let savedPosts = [];
let userPreferences = {};

// Helper function to generate posts using ChatGPT
async function generatePostsWithChatGPT(interests) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const isGoodMorning = interests.toLowerCase().includes('good morning') || interests.toLowerCase().includes('greeting') || interests.toLowerCase().includes('morning');
    const isPepTalk = interests.toLowerCase().includes('quick pep talk') || interests.toLowerCase().includes('pep talk') || interests.toLowerCase().includes('motivation');
    let prompt; let systemMessage;
    
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
    });

    const response = completion.choices[0].message.content;
    
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
      }));

    return posts;
  } catch (error) {
    console.error('Error generating posts with OpenAI:', error);
    
    // Fallback to mock data if OpenAI fails
    console.log('Falling back to mock data...');
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
    ];

    return mockPosts;
  }
}

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Content Calendar API is running' });
});

// Generate posts
app.post('/api/generate-posts', async (req, res) => {
  try {
    const { interests } = req.body;
    
    if (!interests || !interests.trim()) {
      return res.status(400).json({ error: 'Interests are required' });
    }

    const posts = await generatePostsWithChatGPT(interests);
    
    res.json({ posts });
  } catch (error) {
    console.error('Error in generate-posts:', error);
    res.status(500).json({ error: 'Failed to generate posts' });
  }
});

// Save post
app.post('/api/save-post', (req, res) => {
  try {
    const { post } = req.body;
    
    if (!post || !post.content) {
      return res.status(400).json({ error: 'Post content is required' });
    }

    const savedPost = {
      ...post,
      id: post.id || uuidv4(),
      savedAt: new Date().toISOString()
    };

    savedPosts.push(savedPost);
    
    res.json({ message: 'Post saved successfully', post: savedPost });
  } catch (error) {
    console.error('Error saving post:', error);
    res.status(500).json({ error: 'Failed to save post' });
  }
});

// Get saved posts
app.get('/api/saved-posts', (req, res) => {
  try {
    res.json({ posts: savedPosts });
  } catch (error) {
    console.error('Error getting saved posts:', error);
    res.status(500).json({ error: 'Failed to get saved posts' });
  }
});

// Delete saved post
app.delete('/api/saved-posts/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const initialLength = savedPosts.length;
    savedPosts = savedPosts.filter(post => post.id !== id);
    
    if (savedPosts.length === initialLength) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Save user preferences
app.post('/api/preferences', (req, res) => {
  try {
    const { interests, tone, postCount } = req.body;
    
    userPreferences = {
      interests: interests || '',
      tone: tone || 'professional',
      postCount: postCount || 5
    };
    
    res.json({ message: 'Preferences saved successfully', preferences: userPreferences });
  } catch (error) {
    console.error('Error saving preferences:', error);
    res.status(500).json({ error: 'Failed to save preferences' });
  }
});

// Get user preferences
app.get('/api/preferences', (req, res) => {
  try {
    res.json({ preferences: userPreferences });
  } catch (error) {
    console.error('Error getting preferences:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Content Calendar API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
}); 