// eslint-disable-next-line import/no-extraneous-dependencies
import mysql from 'mysql2'
import config from './env.js'

// Create connection pool
const pool = mysql.createPool({
  host: config.DB_HOST,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Azure MySQL requires SSL
  ssl: {
    rejectUnauthorized: false, // For Azure MySQL flexible server
  },
  connectTimeout: 20000, // 20 seconds timeout
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
})

// Get promise-based pool for async/await
const promisePool = pool.promise()

// Test connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to database:', err.message)
    return
  }
  console.log('Database connected successfully')
  connection.release()
})

export default promisePool
