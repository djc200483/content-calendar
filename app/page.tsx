'use client'

import { useState, useEffect } from 'react'
import { Copy, RefreshCw, Settings, Save, Trash2, Plus, X, Calendar } from 'lucide-react'

interface Post {
  id: string
  content: string
  topic: string
  createdAt: string
}

interface UserPreferences {
  interests: string[]
  tone: string
  postCount: number
}

interface ScheduledPost {
  id: string
  content: string
  topic: string
  day: string
  time: string
  isScheduled: boolean
  createdAt: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://content-calendar-production-8f77.up.railway.app'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TIME_SLOTS = [
  '7:00-9:00',
  '9:00-11:00', 
  '11:00-13:00',
  '13:00-15:00',
  '15:00-17:00',
  '17:00-19:00',
  '19:00-21:00',
  '21:00-23:00'
]

export default function Home() {
  const [interests, setInterests] = useState<string>('')
  const [generatedPosts, setGeneratedPosts] = useState<Post[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [savedPosts, setSavedPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    interests: [],
    tone: 'professional',
    postCount: 5
  })
  const [newInterest, setNewInterest] = useState('')
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([])
  const [selectedSlot, setSelectedSlot] = useState<{
    day: string
    time: string
    postToSchedule?: Post
  } | null>(null)

  // Load saved posts and preferences on component mount
  useEffect(() => {
    loadSavedPosts()
    loadPreferences()
  }, [])

  const loadSavedPosts = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/saved-posts`)
      if (response.ok) {
        const data = await response.json()
        setSavedPosts(data.posts || [])
      }
    } catch (error) {
      console.error('Error loading saved posts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadPreferences = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/preferences`)
      if (response.ok) {
        const data = await response.json()
        if (data.preferences) {
          setUserPreferences({
            interests: data.preferences.interests || [],
            tone: data.preferences.tone || 'professional',
            postCount: data.preferences.postCount || 5
          })
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
    }
  }

  const savePreferences = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userPreferences),
      })

      if (response.ok) {
        setShowPreferences(false)
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
    }
  }

  const addInterest = () => {
    if (newInterest.trim() && userPreferences.interests.length < 5) {
      setUserPreferences(prev => ({
        ...prev,
        interests: [...prev.interests, newInterest.trim()]
      }))
      setNewInterest('')
    }
  }

  const removeInterest = (index: number) => {
    setUserPreferences(prev => ({
      ...prev,
      interests: prev.interests.filter((_, i) => i !== index)
    }))
  }

  const generatePosts = async () => {
    console.log('Generate button clicked')
    console.log('Interests:', interests)
    if (!interests.trim()) {
      console.log('No interests provided')
      return
    }
    
    setIsGenerating(true)
    console.log('Making API request to:', `${API_BASE_URL}/api/generate-posts`)
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interests }),
      })

      console.log('Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Received data:', data)
        setGeneratedPosts(data.posts || [])
      } else {
        console.error('Failed to generate posts')
        const errorText = await response.text()
        console.error('Error response:', errorText)
      }
    } catch (error) {
      console.error('Error generating posts:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      // Show feedback to user
      const feedback = document.createElement('div')
      feedback.textContent = 'Copied!'
      feedback.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50'
      document.body.appendChild(feedback)
      
      // Remove feedback after 2 seconds
      setTimeout(() => {
        document.body.removeChild(feedback)
      }, 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const savePost = async (post: Post) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/save-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ post }),
      })

      if (response.ok) {
        setSavedPosts(prev => [...prev, post])
        setGeneratedPosts(prev => prev.filter(p => p.id !== post.id))
      }
    } catch (error) {
      console.error('Error saving post:', error)
    }
  }

  const deleteSavedPost = async (postId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/saved-posts/${postId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setSavedPosts(prev => prev.filter(p => p.id !== postId))
      }
    } catch (error) {
      console.error('Error deleting post:', error)
    }
  }

  const schedulePost = (post: Post, day: string, time: string) => {
    const scheduledPost: ScheduledPost = {
      ...post,
      day,
      time,
      isScheduled: true,
      createdAt: new Date().toISOString()
    }
    setScheduledPosts(prev => [...prev, scheduledPost])
    setSelectedSlot(null)
  }

  const getScheduledPost = (day: string, time: string) => {
    return scheduledPosts.find(post => post.day === day && post.time === time)
  }

  const removeScheduledPost = (day: string, time: string) => {
    setScheduledPosts(prev => prev.filter(post => !(post.day === day && post.time === time)))
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Content Calendar
        </h1>
        <p className="text-gray-600">
          Generate clean, professional posts for your X account
        </p>
      </header>

      {/* Navigation Tabs */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setShowCalendar(false)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            !showCalendar 
              ? 'bg-primary-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Generate Content
        </button>
        <button
          onClick={() => setShowCalendar(true)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            showCalendar 
              ? 'bg-primary-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Content Calendar
        </button>
      </div>

      {!showCalendar ? (
        <>
          {/* Preferences Section */}
          <div className="card mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Your Interests & Topics
              </h2>
              <button
                onClick={() => setShowPreferences(!showPreferences)}
                className="btn-secondary text-sm"
              >
                {showPreferences ? 'Hide' : 'Manage'} Preferences
              </button>
            </div>

            {showPreferences ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Top 5 Interests ({userPreferences.interests.length}/5)
                  </label>
                  <div className="space-y-2">
                    {userPreferences.interests.map((interest, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="flex-1 bg-gray-100 px-3 py-2 rounded-lg">
                          {interest}
                        </span>
                        <button
                          onClick={() => removeInterest(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {userPreferences.interests.length < 5 && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newInterest}
                          onChange={(e) => setNewInterest(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addInterest()}
                          placeholder="Add an interest..."
                          className="input-field flex-1"
                        />
                        <button
                          onClick={addInterest}
                          disabled={!newInterest.trim()}
                          className="btn-primary text-sm"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={savePreferences}
                    className="btn-primary"
                  >
                    Save Preferences
                  </button>
                  <button
                    onClick={() => setShowPreferences(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {userPreferences?.interests && userPreferences.interests.length > 0 ? (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Click an interest to generate posts about that topic:</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {userPreferences.interests.map((interest, index) => (
                        <button
                          key={index}
                          onClick={() => setInterests(interest)}
                          className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm hover:bg-primary-200 transition-colors cursor-pointer"
                        >
                          {interest}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      Or type your own topics in the Quick Generate section below
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-600">No interests saved yet. Click "Manage Preferences" to add your top 5 interests.</p>
                )}
              </div>
            )}
          </div>

          {/* Quick Generate Section */}
          <div className="card mb-8">
            <h2 className="text-xl font-semibold mb-4">Quick Generate</h2>
            <div className="space-y-4">
              <textarea
                className="input-field h-24"
                placeholder="Enter specific topics for this session (e.g., AI, business, technology, productivity)"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
              />
              <button
                onClick={generatePosts}
                disabled={isGenerating || !interests.trim()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Generate Posts
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Generated Posts */}
          {generatedPosts.length > 0 && (
            <div className="card mb-8">
              <h2 className="text-xl font-semibold mb-4">Generated Posts</h2>
              <div className="space-y-4">
                {generatedPosts.map((post) => (
                  <div key={post.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm text-gray-500">{post.topic}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyToClipboard(post.content)}
                          className="btn-secondary text-sm flex items-center gap-1"
                        >
                          <Copy className="w-4 h-4" />
                          Copy
                        </button>
                        <button
                          onClick={() => savePost(post)}
                          className="btn-primary text-sm flex items-center gap-1"
                        >
                          <Save className="w-4 h-4" />
                          Save
                        </button>
                        <button
                          onClick={() => {
                            console.log('Schedule button clicked', post)
                            setSelectedSlot({ day: '', time: '', postToSchedule: post })
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white text-sm flex items-center gap-1 px-3 py-1 rounded-lg transition-colors"
                        >
                          <Calendar className="w-4 h-4" />
                          Schedule
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
                    <div className="text-xs text-gray-400 mt-2">
                      {post.content.length}/280 characters
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saved Posts */}
          {savedPosts.length > 0 && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Saved Posts</h2>
              <div className="space-y-4">
                {savedPosts.map((post) => (
                  <div key={post.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm text-gray-500">{post.topic}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyToClipboard(post.content)}
                          className="btn-secondary text-sm flex items-center gap-1"
                        >
                          <Copy className="w-4 h-4" />
                          Copy
                        </button>
                        <button
                          onClick={() => deleteSavedPost(post.id)}
                          className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
                    <div className="text-xs text-gray-400 mt-2">
                      {post.content.length}/280 characters
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-gray-600">Loading saved posts...</p>
            </div>
          )}
        </>
      ) : (
        /* Calendar View */
        <div className="card">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Content Calendar
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-gray-300 p-2 bg-gray-50 font-medium text-sm">Time</th>
                  {DAYS_OF_WEEK.map(day => (
                    <th key={day} className="border border-gray-300 p-2 bg-gray-50 font-medium text-sm">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map(time => (
                  <tr key={time}>
                    <td className="border border-gray-300 p-2 bg-gray-50 text-xs font-medium">
                      {time}
                    </td>
                    {DAYS_OF_WEEK.map(day => {
                      const scheduledPost = getScheduledPost(day, time)
                      const isSelected = selectedSlot?.day === day && selectedSlot?.time === time
                      
                      return (
                        <td 
                          key={`${day}-${time}`} 
                          className={`border border-gray-300 p-2 min-h-[80px] cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary-100 border-primary-300' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => {
                            if (scheduledPost) {
                              // If there's a scheduled post, show just that post
                              setSelectedSlot({ 
                                day, 
                                time, 
                                postToSchedule: {
                                  id: scheduledPost.id,
                                  content: scheduledPost.content,
                                  topic: scheduledPost.topic,
                                  createdAt: scheduledPost.createdAt || new Date().toISOString()
                                }
                              })
                            } else {
                              // If no scheduled post, show post selection
                              setSelectedSlot({ day, time })
                            }
                          }}
                        >
                          {scheduledPost ? (
                            <div className="space-y-2">
                              <div className="text-xs text-gray-500">{scheduledPost.topic}</div>
                              <div className="text-sm text-gray-800 truncate">
                                {scheduledPost.content.length > 60 
                                  ? `${scheduledPost.content.substring(0, 60)}...` 
                                  : scheduledPost.content
                                }
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    copyToClipboard(scheduledPost.content)
                                  }}
                                  className="text-blue-600 hover:text-blue-700 text-xs"
                                >
                                  Copy
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeScheduledPost(day, time)
                                  }}
                                  className="text-red-600 hover:text-red-700 text-xs"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-gray-400 text-xs text-center">
                              Click to schedule
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Post Selection Modal - Now available in both tabs */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {selectedSlot.postToSchedule 
                  ? `Schedule Post`
                  : `Schedule Post for ${selectedSlot.day} at ${selectedSlot.time}`
                }
              </h3>
              <button
                onClick={() => setSelectedSlot(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {selectedSlot.postToSchedule ? (
              /* Calendar Selection for Direct Post Scheduling */
              <div>
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Post to Schedule:</h4>
                  <div className="text-sm text-gray-600 mb-2">{selectedSlot.postToSchedule.topic}</div>
                  <div className="text-gray-800">{selectedSlot.postToSchedule.content}</div>
                </div>
                
                <h4 className="font-medium mb-3">Select Date & Time:</h4>
                
                {/* Day Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Day of Week:</label>
                  <div className="grid grid-cols-7 gap-2">
                    {DAYS_OF_WEEK.map(day => (
                      <button
                        key={day}
                        onClick={() => setSelectedSlot(prev => prev ? { ...prev, day } : null)}
                        className={`p-2 text-sm rounded-lg border transition-colors ${
                          selectedSlot?.day === day
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Time Selection */}
                {selectedSlot?.day && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time:</label>
                    <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto">
                      {TIME_SLOTS.map(time => {
                        const isScheduled = getScheduledPost(selectedSlot.day, time) !== undefined
                        return (
                          <button
                            key={time}
                            onClick={() => {
                              if (!isScheduled && selectedSlot.postToSchedule) {
                                schedulePost(selectedSlot.postToSchedule, selectedSlot.day, time)
                                setSelectedSlot(null)
                              }
                            }}
                            disabled={isScheduled}
                            className={`p-2 text-sm rounded-lg border transition-colors ${
                              isScheduled
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-primary-50 hover:border-primary-300'
                            }`}
                          >
                            {time}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Post Selection for Calendar Slot */
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Generated Posts</h4>
                  <div className="space-y-2">
                    {generatedPosts.map((post) => (
                      <div key={post.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-gray-500">{post.topic}</span>
                          <button
                            onClick={() => schedulePost(post, selectedSlot.day, selectedSlot.time)}
                            className="btn-primary text-xs"
                          >
                            Schedule
                          </button>
                        </div>
                        <p className="text-sm text-gray-800">{post.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Saved Posts</h4>
                  <div className="space-y-2">
                    {savedPosts.map((post) => (
                      <div key={post.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-gray-500">{post.topic}</span>
                          <button
                            onClick={() => schedulePost(post, selectedSlot.day, selectedSlot.time)}
                            className="btn-primary text-xs"
                          >
                            Schedule
                          </button>
                        </div>
                        <p className="text-sm text-gray-800">{post.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 