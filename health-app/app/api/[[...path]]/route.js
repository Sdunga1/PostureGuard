import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'

const MONGO_URL = process.env.MONGO_URL
const DB_NAME = process.env.DB_NAME || 'vitalsync'

let client = null

async function getDB() {
  if (!client) {
    client = new MongoClient(MONGO_URL)
    await client.connect()
  }
  return client.db(DB_NAME)
}

// ── POST /api/session — Save a session ────────────────────────────────────────
export async function POST(request) {
  const path = request.nextUrl.pathname

  if (path === '/api/session') {
    try {
      const body = await request.json()
      const db = await getDB()
      const sessions = db.collection('sessions')

      const session = {
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        userId: body.userId || 'sarath',
        exercises: body.exercises || [],
        activeTimeMinutes: body.activeTimeMinutes || 0,
        exerciseCount: body.exerciseCount || 0,
        postureScore: body.postureScore || 78,
        headTilt: body.headTilt || 12,
        slouchAngle: body.slouchAngle || 4.5,
      }

      await sessions.insertOne(session)
      return NextResponse.json({ success: true, session }, { status: 201 })
    } catch (err) {
      console.error('Session save error:', err)
      return NextResponse.json({ error: 'Failed to save session' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

// ── GET /api/session — Fetch recent sessions ──────────────────────────────────
export async function GET(request) {
  const path = request.nextUrl.pathname

  if (path === '/api/session') {
    try {
      const db = await getDB()
      const sessions = db.collection('sessions')
      const recent = await sessions
        .find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray()

      return NextResponse.json({ sessions: recent })
    } catch (err) {
      console.error('Session fetch error:', err)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }
  }

  return NextResponse.json({ message: 'VITAL_SYNC API', version: '1.0.0' })
}
