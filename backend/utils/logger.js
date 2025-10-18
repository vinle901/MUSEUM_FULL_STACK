const info = (...params) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(new Date().toISOString(), '[INFO]', ...params)
  }
}

const error = (...params) => {
  console.error(new Date().toISOString(), '[ERROR]', ...params)
}

export default { info, error }
