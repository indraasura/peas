import { NextRequest, NextResponse } from 'next/server'

const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_MODEL = 'llama3-8b-8192'

export async function POST(request: NextRequest) {
  try {
    const { prompt, context, section } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: 'Groq API key not configured' }, { status: 500 })
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Groq API error:', errorData)
      return NextResponse.json({ error: 'Failed to get AI response' }, { status: 500 })
    }

    const data = await response.json()
    const summary = data.choices?.[0]?.message?.content || 'No response generated'

    return NextResponse.json({ summary })

  } catch (error) {
    console.error('AI API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
