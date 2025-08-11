# Content Calendar MVP

An AI-powered content generation tool for creating clean, professional X (Twitter) posts based on your interests and niches.

## Features

- **Clean Post Generation**: Generate professional posts without hashtags
- **Interest-Based Content**: Create content based on your specific topics and niches
- **Copy-Paste Workflow**: Easy one-click copy to clipboard
- **Content Library**: Save and manage your generated posts
- **Character Counter**: Ensure posts fit X's 280-character limit
- **Mobile-Friendly**: Responsive design for all devices

## Tech Stack

### Frontend (Vercel)
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Beautiful icons

### Backend (Railway)
- **Node.js**: Server runtime
- **Express**: Web framework
- **OpenAI API**: ChatGPT integration for content generation
- **Replicate**: AI model integration (future enhancement)

## Project Structure

```
content-calendar-mvp/
├── app/                    # Next.js frontend
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page component
├── api/                   # Backend API
│   ├── server.js          # Express server
│   ├── package.json       # Backend dependencies
│   └── env.example        # Environment variables template
├── package.json           # Frontend dependencies
├── tailwind.config.js     # Tailwind configuration
├── tsconfig.json          # TypeScript configuration
└── README.md             # This file
```

## Quick Start

### 1. Frontend Setup (Vercel)

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### 2. Backend Setup (Railway)

```bash
# Navigate to API directory
cd api

# Install dependencies
npm install

# Copy environment template
cp env.example .env

# Edit .env with your API keys
# OPENAI_API_KEY=your_key_here
# REPLICATE_API_TOKEN=your_token_here

# Run development server
npm run dev

# Start production server
npm start
```

## Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Backend (.env)
```env
PORT=3001
OPENAI_API_KEY=your_openai_api_key_here
REPLICATE_API_TOKEN=your_replicate_api_token_here
DATABASE_URL=your_database_url_here
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend-domain.vercel.app
```

## API Endpoints

### Content Generation
- `POST /api/generate-posts` - Generate posts based on interests
- `POST /api/save-post` - Save a post to library
- `GET /api/saved-posts` - Get all saved posts
- `DELETE /api/saved-posts/:id` - Delete a saved post

### User Preferences
- `POST /api/preferences` - Save user preferences
- `GET /api/preferences` - Get user preferences

### Health Check
- `GET /health` - API health status

## Deployment

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Backend (Railway)
1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push to main branch

## Development Workflow

1. **Local Development**: Run both frontend and backend locally
2. **API Integration**: Connect frontend to backend API
3. **AI Integration**: Add real ChatGPT and Replicate API calls
4. **Database**: Add persistent storage for posts and preferences
5. **Authentication**: Add user accounts and sessions

## MVP Features

### Current (Mock Data)
- ✅ Interest-based post generation
- ✅ Copy to clipboard functionality
- ✅ Save/delete posts
- ✅ Character counter
- ✅ Responsive design

### Next Steps
- 🔄 Real ChatGPT API integration
- 🔄 Replicate AI model integration
- 🔄 Database persistence
- 🔄 User authentication
- 🔄 Advanced content types
- 🔄 Post scheduling
- 🔄 Analytics and insights

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details 