import app from './app.js'
import env from './config/env.js'
import logger from './utils/logger.js'

const { PORT } = env

app.listen(PORT, () => {
  logger.info(`Museum API server running on port ${PORT}`)
});
