const { NextRequest, NextResponse } = require('next/server')

const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_MODEL = 'llama3-8b-8192'

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    const { prompt, context: contextData, section } = JSON.parse(event.body)

    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Prompt is required' }),
      }
    }

    if (!GROQ_API_KEY) {
      console.error('GROQ_API_KEY is not set in environment variables')
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Groq API key not configured' }),
      }
    }

    console.log('Making request to Groq API with model:', GROQ_MODEL)
    console.log('API Key length:', GROQ_API_KEY?.length)
    console.log('API Key starts with:', GROQ_API_KEY?.substring(0, 10))

    const requestBody = {
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are Kynetik AI, an intelligent assistant for project management and team coordination. 
            
You excel at:
- Analyzing project data and providing actionable insights
- Identifying risks, blockers, and opportunities
- Summarizing complex information in clear, actionable formats
- Providing recommendations for project management decisions

Always format your responses with:
- Clear headings and subheadings
- Bullet points for lists
- Bold text for emphasis
- Numbered lists for step-by-step instructions
- Professional, concise language

Focus on practical, actionable insights that help teams make better decisions.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.7,
      stream: false
    }

    console.log('Request body prepared, making fetch request...')

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    console.log('Fetch request completed, status:', response.status)

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Groq API error:', response.status, response.statusText, errorData)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to get AI response', 
          details: `Groq API returned ${response.status}: ${response.statusText}` 
        }),
      }
    }

    const data = await response.json()
    console.log('Groq API response received successfully')
    
    const summary = data.choices?.[0]?.message?.content || 'No response generated'

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ summary }),
    }

  } catch (error) {
    console.error('AI API error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
    }
  }
}
