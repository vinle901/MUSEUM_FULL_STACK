import { verifyAccessToken } from './authService.js'

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}

// eslint-disable-next-line no-unused-vars
const errorHandler = (error, request, response, next) => {
  console.error(error.stack)
  response.status(error.status || 500).json({
    error: error.message || 'Internal server error',
  })
}

/**
 * Extract token from Authorization header
 */
const tokenExtractor = (request, response, next) => {
  const authorization = request.get('authorization')
  if (authorization && authorization.startsWith('Bearer ')) {
    request.token = authorization.replace('Bearer ', '')
  }
  next()
}

/**
 * Verify and extract user from token
 * Requires tokenExtractor to run first
 */
const userExtractor = (request, response, next) => {
  if (request.token) {
    try {
      const decodedToken = verifyAccessToken(request.token)
      if (decodedToken.id) {
        request.user = decodedToken
      }
    } catch (error) {
      // Token invalid, but don't block request
      // Let requireAuth handle it if auth is required
    }
  }
  next()
}

/**
 * Require authentication for protected routes
 * Use this after tokenExtractor and userExtractor
 */
const requireAuth = (request, response, next) => {
  if (!request.user) {
    return response.status(401).json({
      error: 'Authentication required',
    })
  }
  next()
}

/**
 * Require specific role for protected routes
 */
const requireRole = (...roles) => (request, response, next) => {
  if (!request.user) {
    return response.status(401).json({
      error: 'Authentication required',
    })
  }
  if (!roles.includes(request.user.role)) {
    return response.status(403).json({
      error: 'Insufficient permissions',
    })
  }
  next()
}

export default {
  unknownEndpoint,
  errorHandler,
  tokenExtractor,
  userExtractor,
  requireAuth,
  requireRole,
}
