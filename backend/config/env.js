import 'dotenv/config'

const PORT = process.env.PORT || 3000
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173'
const DB_HOST = process.env.DB_HOST || 'localhost'
const DB_USER = process.env.DB_USER || 'root'
const DB_PASSWORD = process.env.DB_PASSWORD || ''
const DB_NAME = process.env.DB_NAME || 'museumupdated'
const JWT_SECRET = process.env.JWT_SECRET || 'Team13museum'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'Team13finearts'

export default {
  PORT,
  CORS_ORIGIN,
  DB_HOST,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  JWT_SECRET,
  JWT_REFRESH_SECRET,
}
