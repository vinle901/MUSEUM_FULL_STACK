# Artwork Image Upload Guide for Curators

This guide explains how curators can upload artwork images through the API.

## Overview

The system supports two ways to add artworks with images:

1. **Upload image first, then create artwork** (Recommended)
2. **Use external URL** (for artworks already hosted online)

---

## Method 1: Upload Image First (Recommended)

### Step 1: Upload the Image

**Endpoint:** `POST /api/artworks/upload-image`

**Authentication:** Required (Admin/Employee role)

**Request Type:** `multipart/form-data`

**Field Name:** `artwork_image`

**Max File Size:** 10MB

**File Naming:** Files are saved as `originalname-timestamp.extension`
- Example: `mona-lisa-1760758201388.jpg`

**Example using Postman:**
1. Select `POST` method
2. Enter URL: `http://localhost:3000/api/artworks/upload-image`
3. Go to `Headers` tab:
   - Add `Authorization: Bearer <your_access_token>`
4. Go to `Body` tab:
   - Select `form-data`
   - Add key: `artwork_image` (change type to `File`)
   - Choose your image file

**Example using cURL:**
```bash
curl -X POST http://localhost:3000/api/artworks/upload-image \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "artwork_image=@/path/to/image.jpg"
```

**Response (Success):**
```json
{
  "message": "Image uploaded successfully",
  "imageUrl": "/uploads/artworks/starry-night-1760758201388.jpg",
  "filename": "starry-night-1760758201388.jpg"
}
```

**Filename Format:** `originalname-timestamp.extension`
- `starry-night` = original filename (without extension)
- `1760758201388` = timestamp in milliseconds (when uploaded)
- `.jpg` = original file extension

### Step 2: Create the Artwork with Uploaded Image URL

**Endpoint:** `POST /api/artworks`

**Authentication:** Required (Admin/Employee role)

**Request Type:** `application/json`

**Example Request Body:**
```json
{
  "title": "Starry Night",
  "artist_id": 1,
  "creation_date": 1889,
  "artwork_type": "Painting",
  "material": "Oil on canvas",
  "description": "A beautiful night sky painting...",
  "picture_url": "/uploads/artworks/starry-night-1760758201388.jpg",
  "exhibition_id": 1,
  "is_on_display": true
}
```

**Important:** Use the `imageUrl` value from Step 1's response as the `picture_url` value.

---

## Method 2: Use External URL

If the artwork image is already hosted elsewhere (e.g., Wikipedia, museum website):

**Endpoint:** `POST /api/artworks`

**Example Request Body:**
```json
{
  "title": "Mona Lisa",
  "artist_id": 3,
  "creation_date": 1503,
  "artwork_type": "Painting",
  "material": "Oil on poplar",
  "description": "Famous portrait by Leonardo da Vinci...",
  "picture_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa.jpg/460px-Mona_Lisa.jpg",
  "exhibition_id": 1,
  "is_on_display": true
}
```

---

## Frontend Integration Example (React/JavaScript)

### Upload Image and Create Artwork

```javascript
// Step 1: Upload the image
async function uploadArtworkImage(imageFile, accessToken) {
  const formData = new FormData()
  formData.append('artwork_image', imageFile)

  const response = await fetch('http://localhost:3000/api/artworks/upload-image', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: formData
  })

  if (!response.ok) {
    throw new Error('Image upload failed')
  }

  const data = await response.json()
  return data.imageUrl  // Returns: "/uploads/artworks/filename.jpg"
}

// Step 2: Create the artwork
async function createArtwork(artworkData, accessToken) {
  const response = await fetch('http://localhost:3000/api/artworks', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(artworkData)
  })

  if (!response.ok) {
    throw new Error('Artwork creation failed')
  }

  return await response.json()
}

// Complete workflow
async function addNewArtwork(imageFile, artworkDetails, accessToken) {
  try {
    // Upload image first
    const imageUrl = await uploadArtworkImage(imageFile, accessToken)

    // Create artwork with uploaded image URL
    const artworkData = {
      ...artworkDetails,
      picture_url: imageUrl
    }

    const result = await createArtwork(artworkData, accessToken)
    console.log('Artwork created successfully:', result)
  } catch (error) {
    console.error('Error:', error)
  }
}

// Usage example
const fileInput = document.getElementById('artwork-image')
const imageFile = fileInput.files[0]

addNewArtwork(
  imageFile,
  {
    title: "New Artwork",
    artist_id: 1,
    creation_date: 2024,
    artwork_type: "Painting",
    material: "Oil on canvas",
    description: "A new masterpiece",
    exhibition_id: 1,
    is_on_display: true
  },
  "YOUR_ACCESS_TOKEN"
)
```

### React Component Example

```jsx
import React, { useState } from 'react'

function ArtworkUploadForm() {
  const [imageFile, setImageFile] = useState(null)
  const [artworkData, setArtworkData] = useState({
    title: '',
    artist_id: '',
    creation_date: '',
    artwork_type: '',
    material: '',
    description: '',
    exhibition_id: '',
    is_on_display: true
  })

  const handleImageChange = (e) => {
    setImageFile(e.target.files[0])
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setArtworkData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const accessToken = localStorage.getItem('accessToken')

    // Step 1: Upload image
    const formData = new FormData()
    formData.append('artwork_image', imageFile)

    const uploadRes = await fetch('http://localhost:3000/api/artworks/upload-image', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` },
      body: formData
    })

    const { imageUrl } = await uploadRes.json()

    // Step 2: Create artwork
    const createRes = await fetch('http://localhost:3000/api/artworks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...artworkData,
        picture_url: imageUrl
      })
    })

    const result = await createRes.json()
    alert('Artwork created successfully!')
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        required
      />

      <input
        type="text"
        name="title"
        placeholder="Title"
        value={artworkData.title}
        onChange={handleInputChange}
        required
      />

      {/* Add other input fields for artist_id, creation_date, etc. */}

      <button type="submit">Create Artwork</button>
    </form>
  )
}
```

---

## Accessing Uploaded Images

Once uploaded, images are accessible at:

```
http://localhost:3000/uploads/artworks/filename.jpg
```

For example:
```
http://localhost:3000/uploads/artworks/starry-night-1760758201388.jpg
```

---

## Security & Permissions

- **Who can upload:** Only users with `Admin` or `Employee` role
- **File size limit:** 10MB maximum
- **File naming:** Automatic - `originalname-timestamp.extension`
  - Preserves original filename
  - Adds timestamp to ensure uniqueness
  - Keeps file extension for proper display

---

## Error Handling

### Common Errors:

**401 Unauthorized**
```json
{
  "error": "Authentication required"
}
```
Solution: Include valid `Authorization: Bearer <token>` header

**403 Forbidden**
```json
{
  "error": "Insufficient permissions"
}
```
Solution: User must have Admin or Employee role

**400 Bad Request - Invalid File Type**
```json
{
  "error": "Only image files (JPEG, PNG, GIF, WEBP) are allowed"
}
```
Solution: Upload a supported image format

**400 Bad Request - File Too Large**
```json
{
  "error": "File too large"
}
```
Solution: Ensure image is under 10MB

**400 Bad Request - No File**
```json
{
  "error": "No image file provided"
}
```
Solution: Ensure `artwork_image` field contains a file

---

## Testing with Postman

1. **Login to get access token:**
   - POST `/api/auth/login`
   - Body: `{ "email": "admin@example.com", "password": "password123" }`
   - Copy the `accessToken` from response

2. **Upload image:**
   - POST `/api/artworks/upload-image`
   - Headers: `Authorization: Bearer <accessToken>`
   - Body: form-data, key: `artwork_image`, type: File
   - Copy the `imageUrl` from response

3. **Create artwork:**
   - POST `/api/artworks`
   - Headers: `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
   - Body: JSON with artwork details including the `picture_url` from step 2

---

## File Storage Location

Uploaded images are stored in:
```
backend/uploads/artworks/
```

**Note:** This directory is excluded from version control (.gitignore) to keep repository size small.

---

## Production Considerations

For production deployments, consider:

1. **Cloud Storage:** Use AWS S3, Google Cloud Storage, or Cloudinary instead of local storage
2. **CDN:** Serve images through a CDN for better performance
3. **Image Optimization:** Automatically resize/compress images on upload
4. **Backup:** Regular backups of the uploads directory

---

## Need Help?

Contact the development team or check the codebase:
- Upload middleware: `backend/utils/uploadMiddleware.js`
- Artwork routes: `backend/routes/artworks.js`
- App configuration: `backend/app.js`
