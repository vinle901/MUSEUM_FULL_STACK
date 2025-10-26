import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Generic function to create upload middleware for any folder
export const createUpload = (folderName, fieldName) => {
  const storage = multer.diskStorage({
    destination(req, file, cb) {
      cb(null, path.join(__dirname, `../uploads/${folderName}`))
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname)
      const nameWithoutExt = path.basename(file.originalname, ext)
      const timestamp = Date.now()
      cb(null, `${nameWithoutExt}-${timestamp}${ext}`)
    },
  })

  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  })

  return upload.single(fieldName)
}

// Create one for your upload need
export const uploadArtworkImage = createUpload('artworks', 'artwork_image')
export const uploadGiftShopImage = createUpload('giftshop', 'item_image')
export const uploadCafeteriaImage = createUpload('cafeteria', 'cafeteria_image')
export const uploadExhibitionImage = createUpload('exhibitions', 'exhibition_image')
export const uploadEventImage = createUpload('events', 'event_image')

export default {
  uploadArtworkImage,
  uploadGiftShopImage,
  uploadCafeteriaImage,
  uploadExhibitionImage,
  uploadEventImage,
}
