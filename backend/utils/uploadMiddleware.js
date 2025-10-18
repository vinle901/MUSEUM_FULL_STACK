import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configure storage with custom filename: originalname-timestamp.ext
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/artworks'))
  },
  filename(req, file, cb) {
    // Get file extension
    const ext = path.extname(file.originalname)
    // Get filename without extension
    const nameWithoutExt = path.basename(file.originalname, ext)
    // Create filename: name-timestamp.ext
    const timestamp = Date.now()
    cb(null, `${nameWithoutExt}-${timestamp}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
})

// Single image upload with field name 'artwork_image'
export const uploadArtworkImage = upload.single('artwork_image')

export default { uploadArtworkImage }
