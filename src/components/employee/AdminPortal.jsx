// File: src/components/employee/AdminPortal.jsx

import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus, FaSave, FaTimes } from 'react-icons/fa';
import api from '../../services/api';
import './EmployeePortal.css';

function AdminPortal() {
  const [activeTab, setActiveTab] = useState('artworks');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [artists, setArtists] = useState([]);
  const [exhibitions, setExhibitions] = useState([]);
  const [selectedImageFile, setSelectedImageFile] = useState(null);

  const tabs = [
    { id: 'artworks', label: 'Artworks', endpoint: '/api/artworks' },
    { id: 'exhibitions', label: 'Exhibitions', endpoint: '/api/exhibitions' },
    { id: 'events', label: 'Museum Events', endpoint: '/api/events' },
    { id: 'giftshop', label: 'Gift Shop Items', endpoint: '/api/giftshop' },
    { id: 'cafeteria', label: 'Cafeteria Items', endpoint: '/api/cafeteria' },
    { id: 'tickets', label: 'Ticket Types', endpoint: '/api/tickets/types' },
  ];

  useEffect(() => {
    fetchItems();
    // Fetch artists and exhibitions for artwork and events form dropdowns
    if (activeTab === 'artworks' || activeTab === 'events') {
      fetchArtistsAndExhibitions();
    }
  }, [activeTab]);

  const fetchArtistsAndExhibitions = async () => {
    try {
      const [artistsRes, exhibitionsRes] = await Promise.all([
        api.get('/api/artists'),
        api.get('/api/exhibitions')
      ]);
      setArtists(artistsRes.data);
      setExhibitions(exhibitionsRes.data);
    } catch (error) {
      console.error('Error fetching artists/exhibitions:', error);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const endpoint = tabs.find(tab => tab.id === activeTab).endpoint;

      // For exhibitions and events, include inactive/cancelled ones in admin view
      let url = endpoint;
      if (activeTab === 'exhibitions') {
        url = `${endpoint}?include_inactive=true`;
      } else if (activeTab === 'events') {
        url = `${endpoint}?include_cancelled=true`;
      }

      const response = await api.get(url);
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
      alert('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);

    // Format dates to YYYY-MM-DD for date inputs
    const formattedItem = { ...item };

    // Format date fields based on active tab
    if (activeTab === 'artworks') {

      if (formattedItem.acquisition_date) {
        formattedItem.acquisition_date = new Date(formattedItem.acquisition_date).toISOString().split('T')[0];
      }
    }

    if (activeTab === 'events') {
      if (formattedItem.event_date) {
        formattedItem.event_date = new Date(formattedItem.event_date).toISOString().split('T')[0];
      }
    }

    if (activeTab === 'exhibitions') {
      if (formattedItem.start_date) {
        formattedItem.start_date = new Date(formattedItem.start_date).toISOString().split('T')[0];
      }
      if (formattedItem.end_date) {
        formattedItem.end_date = new Date(formattedItem.end_date).toISOString().split('T')[0];
      }
    }

    setFormData(formattedItem);
  };

  // Helper function to format foreign key constraint errors
  const formatConstraintError = (errorMessage, operation = 'delete') => {
    if (!errorMessage) return 'An unknown error occurred';

    // Check for foreign key constraint violations
    if (errorMessage.includes('foreign key constraint') || errorMessage.includes('FOREIGN KEY')) {
      const itemType = activeTab === 'tickets' ? 'ticket type' :
                      activeTab === 'artworks' ? 'artwork' :
                      activeTab === 'exhibitions' ? 'exhibition' :
                      activeTab === 'events' ? 'event' :
                      activeTab === 'giftshop' ? 'gift shop item' :
                      activeTab === 'cafeteria' ? 'cafeteria item' : 'item';

      if (operation === 'delete') {
        // Specific messages based on the table
        if (activeTab === 'tickets') {
          return `Cannot delete this ticket type because it has been used in ticket purchases.\n\nTickets that have been sold cannot be deleted to maintain transaction history.`;
        } else if (activeTab === 'exhibitions') {
          return `Cannot delete this exhibition because it is referenced by artworks or events.\n\nPlease remove the references first.`;
        } else if (activeTab === 'artists') {
          return `Cannot delete this artist because they have artworks in the collection.\n\nPlease reassign or remove the artworks first.`;
        } else if (activeTab === 'events') {
          return `Cannot delete this event because it has ticket purchases or registrations.\n\nEvents with attendees cannot be deleted.`;
        }
        return `Cannot delete this ${itemType} because it is being used elsewhere in the system.\n\nPlease remove any references first.`;
      } else {
        return `Cannot update this ${itemType} due to database constraints.\n\nPlease check related data.`;
      }
    }

    // Check for duplicate entry errors
    if (errorMessage.includes('Duplicate entry') || errorMessage.includes('unique')) {
      return 'This entry already exists.\n\nPlease use a different name or identifier.';
    }

    // Return original error if not a known constraint type
    return errorMessage;
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      const tab = tabs.find(tab => tab.id === activeTab);
      let endpoint = tab.endpoint;

      // For tickets, the endpoint needs /types appended for the ID route
      if (activeTab === 'tickets') {
        endpoint = `${endpoint}/${itemId}`;
      } else {
        endpoint = `${endpoint}/${itemId}`;
      }

      await api.delete(endpoint);
      await fetchItems();
      alert('Item deleted successfully');
    } catch (error) {
      console.error('Error deleting item:', error);
      const errorMsg = error.response?.data?.error || error.message;
      const userFriendlyMsg = formatConstraintError(errorMsg, 'delete');
      alert(userFriendlyMsg);
    }
  };

  const handleSave = async () => {
    try {
      const endpoint = tabs.find(tab => tab.id === activeTab).endpoint;

      // Upload image first if a file was selected
      let imageUrl = null;
      if (selectedImageFile) {
        try {
          imageUrl = await uploadImageToServer();
        } catch (error) {
          alert('Error uploading image: ' + (error.response?.data?.error || error.message));
          return; // Don't save if image upload fails
        }
      }

      // Prepare data to save
      const dataToSave = { ...formData };

      // Convert empty strings to null for nullable fields (foreign keys, dates)
      if (activeTab === 'artworks') {
        // Automatically set curator to logged-in employee
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.employeeId && !editingItem) {
          // Only set curator for new artworks, not when editing
          dataToSave.curated_by_employee_id = user.employeeId;
        }

        if (dataToSave.exhibition_id === '') dataToSave.exhibition_id = null;
        if (dataToSave.curated_by_employee_id === '') dataToSave.curated_by_employee_id = null;
        if (dataToSave.acquisition_date === '') dataToSave.acquisition_date = null;
        if (dataToSave.creation_date === '') dataToSave.creation_date = null;
      }

      if (activeTab === 'exhibitions') {
        // Convert empty end_date to null
        if (dataToSave.end_date === '') dataToSave.end_date = null;
      }

      if (activeTab === 'events') {
        // Convert empty exhibition_id to null
        if (dataToSave.exhibition_id === '') dataToSave.exhibition_id = null;
      }

      // If image was uploaded, update the URL field
      if (imageUrl) {
        const imageUrlField = activeTab === 'giftshop' ? 'image_url' : 'picture_url';
        dataToSave[imageUrlField] = imageUrl;
      } else {
        // Remove the placeholder text if no upload happened
        if (dataToSave.image_url && dataToSave.image_url.startsWith('[File selected:')) {
          dataToSave.image_url = '';
        }
        if (dataToSave.picture_url && dataToSave.picture_url.startsWith('[File selected:')) {
          dataToSave.picture_url = '';
        }
      }

      if (editingItem) {
        // Update existing item - determine the correct ID field based on activeTab
        let itemId;
        switch (activeTab) {
          case 'giftshop':
          case 'cafeteria':
            itemId = formData.item_id;
            break;
          case 'events':
            itemId = formData.event_id;
            break;
          case 'exhibitions':
            itemId = formData.exhibition_id;
            break;
          case 'artworks':
            itemId = formData.artwork_id;
            break;
          case 'tickets':
            itemId = formData.ticket_type_id;
            break;
          default:
            itemId = formData.item_id;
        }

        await api.put(`${endpoint}/${itemId}`, dataToSave);
        alert('Item updated successfully');
      } else {
        // Add new item
        await api.post(endpoint, dataToSave);
        alert('Item added successfully');
      }

      setEditingItem(null);
      setShowAddForm(false);
      setFormData({});
      setSelectedImageFile(null);
      await fetchItems();
    } catch (error) {
      console.error('Error saving item:', error);
      const errorMsg = error.response?.data?.error || error.message;
      const userFriendlyMsg = formatConstraintError(errorMsg, editingItem ? 'update' : 'create');
      alert(userFriendlyMsg);
    }
  };

  const handleCancel = () => {
    setEditingItem(null);
    setShowAddForm(false);
    setFormData({});
    setSelectedImageFile(null);
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleImageFileSelect = (event) => {
    const file = event.target.files[0];

    // If no file selected (cleared), reset
    if (!file) {
      setSelectedImageFile(null);
      return;
    }

    // Store the file for later upload when Save is clicked
    setSelectedImageFile(file);

    // Show preview or indication that file is selected
    const imageUrlField = activeTab === 'giftshop' ? 'image_url' :
                         activeTab === 'artworks' ? 'picture_url' :
                         'picture_url';

    handleInputChange(imageUrlField, `[File selected: ${file.name}]`);
  };

  const uploadImageToServer = async () => {
    if (!selectedImageFile) return null;

    setUploadingImage(true);
    try {
      const formDataUpload = new FormData();

      // Determine the field name based on the active tab
      let fieldName = 'image';
      let uploadEndpoint = '';

      switch (activeTab) {
        case 'giftshop':
          fieldName = 'item_image';
          uploadEndpoint = '/api/giftshop/upload-image';
          break;
        case 'cafeteria':
          fieldName = 'cafeteria_image';
          uploadEndpoint = '/api/cafeteria/upload-image';
          break;
        case 'events':
          fieldName = 'event_image';
          uploadEndpoint = '/api/events/upload-image';
          break;
        case 'exhibitions':
          fieldName = 'exhibition_image';
          uploadEndpoint = '/api/exhibitions/upload-image';
          break;
        case 'artworks':
          fieldName = 'artwork_image';
          uploadEndpoint = '/api/artworks/upload-image';
          break;
        default:
          throw new Error('Image upload not supported for this section');
      }

      formDataUpload.append(fieldName, selectedImageFile);

      const response = await api.post(uploadEndpoint, formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data.imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  const renderForm = () => {
    // Dynamic form based on active tab
    switch (activeTab) {
      case 'giftshop':
        return (
          <div className="admin-form">
            <h3>{editingItem ? 'Edit Gift Shop Item' : 'Add New Gift Shop Item'}</h3>
            <div>
              <label>Item Name: *</label>
              <input
                type="text"
                placeholder="e.g., Museum Poster, Art Book"
                value={formData.item_name || ''}
                onChange={(e) => handleInputChange('item_name', e.target.value)}
              />
            </div>
            <div>
              <label>Category: *</label>
              <select
                value={formData.category || ''}
                onChange={(e) => handleInputChange('category', e.target.value)}
              >
                <option value="">Select Category</option>
                <option value="Posters">Posters</option>
                <option value="Books">Books</option>
                <option value="Postcards">Postcards</option>
                <option value="Jewelry">Jewelry</option>
                <option value="Souvenirs">Souvenirs</option>
                <option value="Toys">Toys</option>
                <option value="Stationery">Stationery</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label>Price: *</label>
              <input
                type="number"
                placeholder="e.g., 19.99"
                step="0.01"
                value={formData.price || ''}
                onChange={(e) => handleInputChange('price', e.target.value)}
              />
            </div>
            <div>
              <label>Stock Quantity: *</label>
              <input
                type="number"
                placeholder="e.g., 50"
                value={formData.stock_quantity || ''}
                onChange={(e) => handleInputChange('stock_quantity', e.target.value)}
              />
            </div>
            <div>
              <label>Description:</label>
              <textarea
                placeholder="e.g., Beautiful museum poster featuring..."
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows="3"
              />
            </div>
            <div className="image-input-section">
              <label>Image URL (paste external URL or leave blank to upload):</label>
              <input
                type="text"
                placeholder="https://example.com/image.jpg or leave blank"
                value={formData.image_url || ''}
                onChange={(e) => handleInputChange('image_url', e.target.value)}
              />
            </div>
            <div className="image-upload-section">
              <label>OR Upload Image File:</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileSelect}
                disabled={uploadingImage}
              />
              {selectedImageFile && <span className="success-text">Selected: {selectedImageFile.name}</span>}
              {!selectedImageFile && formData.image_url && formData.image_url.startsWith('/uploads/') && (
                <span className="success-text">✓ Current: {formData.image_url}</span>
              )}
            </div>
            <div className="form-buttons">
              <button onClick={handleSave} className="save-btn">
                <FaSave /> Save
              </button>
              <button onClick={handleCancel} className="cancel-btn">
                <FaTimes /> Cancel
              </button>
            </div>
          </div>
        );

      case 'cafeteria':
        return (
          <div className="admin-form">
            <h3>{editingItem ? 'Edit Cafeteria Item' : 'Add New Cafeteria Item'}</h3>
            <div>
              <label>Item Name: *</label>
              <input
                type="text"
                placeholder="e.g., Caesar Salad, Espresso"
                value={formData.item_name || ''}
                onChange={(e) => handleInputChange('item_name', e.target.value)}
              />
            </div>
            <div>
              <label>Category: *</label>
              <select
                value={formData.category || ''}
                onChange={(e) => handleInputChange('category', e.target.value)}
              >
                <option value="">Select Category</option>
                <option value="Hot Beverages">Hot Beverages</option>
                <option value="Cold Beverages">Cold Beverages</option>
                <option value="Sandwiches">Sandwiches</option>
                <option value="Salads">Salads</option>
                <option value="Desserts">Desserts</option>
                <option value="Snacks">Snacks</option>
                <option value="Main Dishes">Main Dishes</option>
              </select>
            </div>
            <div>
              <label>Price: *</label>
              <input
                type="number"
                placeholder="e.g., 8.99"
                step="0.01"
                value={formData.price || ''}
                onChange={(e) => handleInputChange('price', e.target.value)}
              />
            </div>
            <div>
              <label>Description:</label>
              <textarea
                placeholder="e.g., Fresh Caesar salad with romaine lettuce..."
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows="3"
              />
            </div>
            <div>
              <label>Calories:</label>
              <input
                type="number"
                placeholder="e.g., 350"
                value={formData.calories || ''}
                onChange={(e) => handleInputChange('calories', e.target.value)}
              />
            </div>
            <div className="image-input-section">
              <label>Cafeteria Item Picture URL (paste URL or upload below):</label>
              <input
                type="text"
                placeholder="https://example.com/food.jpg or leave blank"
                value={formData.picture_url || ''}
                onChange={(e) => handleInputChange('picture_url', e.target.value)}
              />
            </div>
            <div className="image-upload-section">
              <label>OR Upload Image File:</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileSelect}
                disabled={uploadingImage}
              />
              {selectedImageFile && <span className="success-text">Selected: {selectedImageFile.name}</span>}
              {!selectedImageFile && formData.picture_url && formData.picture_url.startsWith('/uploads/') && (
                <span className="success-text">✓ Current: {formData.picture_url}</span>
              )}
            </div>
            <label>
              <input
                type="checkbox"
                checked={!!formData.is_vegetarian}
                onChange={(e) => handleInputChange('is_vegetarian', e.target.checked)}
              />
              Vegetarian
            </label>
            <label>
              <input
                type="checkbox"
                checked={!!formData.is_vegan}
                onChange={(e) => handleInputChange('is_vegan', e.target.checked)}
              />
              Vegan
            </label>
            <label>
              <input
                type="checkbox"
                checked={!!formData.is_available}
                onChange={(e) => handleInputChange('is_available', e.target.checked)}
              />
              Available
            </label>
            <div className="form-buttons">
              <button onClick={handleSave} className="save-btn">
                <FaSave /> Save
              </button>
              <button onClick={handleCancel} className="cancel-btn">
                <FaTimes /> Cancel
              </button>
            </div>
          </div>
        );

      case 'events':
        return (
          <div className="admin-form">
            <h3>{editingItem ? 'Edit Event' : 'Add New Event'}</h3>
            <div>
              <label>Event Name: *</label>
              <input
                type="text"
                placeholder="e.g., Summer Art Workshop"
                value={formData.event_name || ''}
                onChange={(e) => handleInputChange('event_name', e.target.value)}
              />
            </div>
            <div>
              <label>Event Type: *</label>
              <input
                type="text"
                placeholder="e.g., Workshop, Lecture, Tour"
                value={formData.event_type || ''}
                onChange={(e) => handleInputChange('event_type', e.target.value)}
              />
            </div>
            <div>
              <label>Event Date: *</label>
              <input
                type="date"
                value={formData.event_date || ''}
                onChange={(e) => handleInputChange('event_date', e.target.value)}
              />
            </div>
            <div>
              <label>Event Time: *</label>
              <input
                type="time"
                value={formData.event_time || ''}
                onChange={(e) => handleInputChange('event_time', e.target.value)}
              />
            </div>
            <div>
              <label>Duration (minutes): *</label>
              <input
                type="number"
                placeholder="e.g., 60"
                min="1"
                value={formData.duration_minutes || ''}
                onChange={(e) => handleInputChange('duration_minutes', e.target.value)}
              />
            </div>
            <div>
              <label>Location: *</label>
              <input
                type="text"
                placeholder="e.g., Main Gallery, Hall A"
                value={formData.location || ''}
                onChange={(e) => handleInputChange('location', e.target.value)}
              />
            </div>
            <div>
              <label>Max Capacity:</label>
              <input
                type="number"
                placeholder="e.g., 50"
                value={formData.max_capacity || ''}
                onChange={(e) => handleInputChange('max_capacity', e.target.value)}
              />
            </div>
            <div>
              <label>Description: *</label>
              <textarea
                placeholder="e.g., Join us for an interactive art workshop..."
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows="3"
              />
            </div>
            <div>
              <label>Related Exhibition (Optional):</label>
              <select
                value={formData.exhibition_id || ''}
                onChange={(e) => handleInputChange('exhibition_id', e.target.value)}
              >
                <option value="">None</option>
                {exhibitions.map(exhibition => (
                  <option key={exhibition.exhibition_id} value={exhibition.exhibition_id}>
                    {exhibition.exhibition_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="image-input-section">
              <label>Event Picture URL (paste URL or upload below):</label>
              <input
                type="text"
                placeholder="https://example.com/event.jpg or leave blank"
                value={formData.picture_url || ''}
                onChange={(e) => handleInputChange('picture_url', e.target.value)}
              />
            </div>
            <div className="image-upload-section">
              <label>OR Upload Image File:</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileSelect}
                disabled={uploadingImage}
              />
              {selectedImageFile && <span className="success-text">Selected: {selectedImageFile.name}</span>}
              {!selectedImageFile && formData.picture_url && formData.picture_url.startsWith('/uploads/') && (
                <span className="success-text">✓ Current: {formData.picture_url}</span>
              )}
            </div>
            <label>
              <input
                type="checkbox"
                checked={!!formData.is_members_only}
                onChange={(e) => handleInputChange('is_members_only', e.target.checked)}
              />
              Members Only
            </label>
            <div className="form-buttons">
              <button onClick={handleSave} className="save-btn">
                <FaSave /> Save
              </button>
              <button onClick={handleCancel} className="cancel-btn">
                <FaTimes /> Cancel
              </button>
            </div>
          </div>
        );

      case 'exhibitions':
        return (
          <div className="admin-form">
            <h3>{editingItem ? 'Edit Exhibition' : 'Add New Exhibition'}</h3>
            <div>
              <label>Exhibition Name: *</label>
              <input
                type="text"
                placeholder="e.g., Renaissance Masters"
                value={formData.exhibition_name || ''}
                onChange={(e) => handleInputChange('exhibition_name', e.target.value)}
              />
            </div>
            <div>
              <label>Exhibition Type: *</label>
              <input
                type="text"
                placeholder="e.g., Permanent, Temporary, Traveling"
                value={formData.exhibition_type || ''}
                onChange={(e) => handleInputChange('exhibition_type', e.target.value)}
              />
            </div>
            <div>
              <label>Location: *</label>
              <input
                type="text"
                placeholder="e.g., East Wing, Gallery 3"
                value={formData.location || ''}
                onChange={(e) => handleInputChange('location', e.target.value)}
              />
            </div>
            <div>
              <label>Start Date: *</label>
              <input
                type="date"
                value={formData.start_date || ''}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
              />
            </div>
            <div>
              <label>End Date: (None if Permanent)</label>
              <input
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
              />
            </div>
            <div>
              <label>Description:</label>
              <textarea
                placeholder="e.g., An extraordinary collection of Renaissance artworks..."
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows="3"
              />
            </div>
            <div className="image-input-section">
              <label>Exhibition Picture URL (paste URL or upload below):</label>
              <input
                type="text"
                placeholder="https://example.com/exhibition.jpg or leave blank"
                value={formData.picture_url || ''}
                onChange={(e) => handleInputChange('picture_url', e.target.value)}
              />
            </div>
            <div className="image-upload-section">
              <label>OR Upload Image File:</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileSelect}
                disabled={uploadingImage}
              />
              {selectedImageFile && <span className="success-text">Selected: {selectedImageFile.name}</span>}
              {!selectedImageFile && formData.picture_url && formData.picture_url.startsWith('/uploads/') && (
                <span className="success-text">✓ Current: {formData.picture_url}</span>
              )}
            </div>
            <label>
              <input
                type="checkbox"
                checked={!!formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
              />
              Active
            </label>
            <div className="form-buttons">
              <button onClick={handleSave} className="save-btn">
                <FaSave /> Save
              </button>
              <button onClick={handleCancel} className="cancel-btn">
                <FaTimes /> Cancel
              </button>
            </div>
          </div>
        );

      case 'artworks':
        return (
          <div className="admin-form">
            <h3>{editingItem ? 'Edit Artwork' : 'Add New Artwork'}</h3>
            <div>
              <label>Title: *</label>
              <input
                type="text"
                placeholder="e.g., The Starry Night"
                value={formData.title || ''}
                onChange={(e) => handleInputChange('title', e.target.value)}
              />
            </div>
            <div>
              <label>Artist: *</label>
              <select
                value={formData.artist_id || ''}
                onChange={(e) => handleInputChange('artist_id', e.target.value)}
              >
                <option value="">Select Artist</option>
                {artists.map(artist => (
                  <option key={artist.artist_id} value={artist.artist_id}>
                    {artist.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Exhibition (Optional):</label>
              <select
                value={formData.exhibition_id || ''}
                onChange={(e) => handleInputChange('exhibition_id', e.target.value)}
              >
                <option value="">Select Exhibition (Optional)</option>
                {exhibitions.map(exhibition => (
                  <option key={exhibition.exhibition_id} value={exhibition.exhibition_id}>
                    {exhibition.exhibition_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Artwork Type: *</label>
              <input
                type="text"
                placeholder="e.g., Painting, Sculpture, Photography"
                value={formData.artwork_type || ''}
                onChange={(e) => handleInputChange('artwork_type', e.target.value)}
              />
            </div>
            <div>
              <label>Material: *</label>
              <input
                type="text"
                placeholder="e.g., Oil on canvas, Bronze, Digital"
                value={formData.material || ''}
                onChange={(e) => handleInputChange('material', e.target.value)}
              />
            </div>
            <div>
              <label>Creation Year:</label>
              <input
                type="number"
                placeholder="e.g., 1889"
                min="1000"
                max="2100"
                value={formData.creation_date || ''}
                onChange={(e) => handleInputChange('creation_date', e.target.value)}
              />
            </div>
            <div>
              <label>Acquisition Date:</label>
              <input
                type="date"
                value={formData.acquisition_date || ''}
                onChange={(e) => handleInputChange('acquisition_date', e.target.value)}
              />
            </div>
            <div>
              <label>Description:</label>
              <textarea
                placeholder="e.g., A masterpiece depicting a swirling night sky..."
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows="3"
              />
            </div>
            <div className="image-input-section">
              <label>Artwork Picture URL (paste URL or upload below):</label>
              <input
                type="text"
                placeholder="https://example.com/artwork.jpg or leave blank"
                value={formData.picture_url || ''}
                onChange={(e) => handleInputChange('picture_url', e.target.value)}
              />
            </div>
            <div className="image-upload-section">
              <label>OR Upload Image File:</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileSelect}
                disabled={uploadingImage}
              />
              {selectedImageFile && <span className="success-text">Selected: {selectedImageFile.name}</span>}
              {!selectedImageFile && formData.picture_url && formData.picture_url.startsWith('/uploads/') && (
                <span className="success-text">✓ Current: {formData.picture_url}</span>
              )}
            </div>
            <label>
              <input
                type="checkbox"
                checked={!!formData.is_on_display}
                onChange={(e) => handleInputChange('is_on_display', e.target.checked)}
              />
              On Display
            </label>
            <div className="form-buttons">
              <button onClick={handleSave} className="save-btn">
                <FaSave /> Save
              </button>
              <button onClick={handleCancel} className="cancel-btn">
                <FaTimes /> Cancel
              </button>
            </div>
          </div>
        );

      case 'tickets':
        return (
          <div className="admin-form">
            <h3>{editingItem ? 'Edit Ticket Type' : 'Add New Ticket Type'}</h3>
            <div>
              <label>Ticket Name: *</label>
              <input
                type="text"
                placeholder="e.g., Adult General Admission"
                value={formData.ticket_name || ''}
                onChange={(e) => handleInputChange('ticket_name', e.target.value)}
              />
            </div>
            <div>
              <label>Base Price: *</label>
              <input
                type="number"
                placeholder="e.g., 25.00"
                step="0.01"
                value={formData.base_price || ''}
                onChange={(e) => handleInputChange('base_price', e.target.value)}
              />
            </div>
            <div>
              <label>Description:</label>
              <textarea
                placeholder="e.g., Full access to all permanent exhibitions..."
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows="3"
              />
            </div>
            <label>
              <input
                type="checkbox"
                checked={!!formData.is_available}
                onChange={(e) => handleInputChange('is_available', e.target.checked)}
              />
              Available
            </label>
            <div className="form-buttons">
              <button onClick={handleSave} className="save-btn">
                <FaSave /> Save
              </button>
              <button onClick={handleCancel} className="cancel-btn">
                <FaTimes /> Cancel
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderItemsTable = () => {
    if (loading) return <div className="loading">Loading...</div>;
    
    if (items.length === 0) {
      return <div className="no-items">No items found</div>;
    }

    // Different table structure for different item types
    switch (activeTab) {
      case 'artworks':
        return (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Artist</th>
                <th>Type</th>
                <th>Material</th>
                <th>Creation Year</th>
                <th>On Display</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.artwork_id}>
                  <td>{item.artwork_id}</td>
                  <td>{item.title}</td>
                  <td>{item.artist_name || 'Unknown'}</td>
                  <td>{item.artwork_type}</td>
                  <td>{item.material}</td>
                  <td>{item.creation_date || 'N/A'}</td>
                  <td>{item.is_on_display ? 'Yes' : 'No'}</td>
                  <td>
                    <button onClick={() => handleEdit(item)} className="edit-btn">
                      <FaEdit />
                    </button>
                    <button onClick={() => handleDelete(item.artwork_id)} className="delete-btn">
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'giftshop':
        return (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Available</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.item_id}>
                  <td>{item.item_id}</td>
                  <td>{item.item_name}</td>
                  <td>{item.category}</td>
                  <td>${parseFloat(item.price).toFixed(2)}</td>
                  <td>{item.stock_quantity}</td>
                  <td>{item.is_available ? 'Yes' : 'No'}</td>
                  <td>
                    <button onClick={() => handleEdit(item)} className="edit-btn">
                      <FaEdit />
                    </button>
                    <button onClick={() => handleDelete(item.item_id)} className="delete-btn">
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'cafeteria':
        return (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Vegetarian</th>
                <th>Vegan</th>
                <th>Available</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.item_id}>
                  <td>{item.item_id}</td>
                  <td>{item.item_name}</td>
                  <td>{item.category}</td>
                  <td>${parseFloat(item.price).toFixed(2)}</td>
                  <td>{item.is_vegetarian ? 'Yes' : 'No'}</td>
                  <td>{item.is_vegan ? 'Yes' : 'No'}</td>
                  <td>{item.is_available ? 'Yes' : 'No'}</td>
                  <td>
                    <button onClick={() => handleEdit(item)} className="edit-btn">
                      <FaEdit />
                    </button>
                    <button onClick={() => handleDelete(item.item_id)} className="delete-btn">
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'events':
        return (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Event Name</th>
                <th>Type</th>
                <th>Date</th>
                <th>Time</th>
                <th>Location</th>
                <th>Capacity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.event_id}>
                  <td>{item.event_id}</td>
                  <td>{item.event_name}</td>
                  <td>{item.event_type}</td>
                  <td>{new Date(item.event_date).toLocaleDateString()}</td>
                  <td>{item.event_time}</td>
                  <td>{item.location}</td>
                  <td>{item.max_capacity || 'Unlimited'}</td>
                  <td>
                    <button onClick={() => handleEdit(item)} className="edit-btn">
                      <FaEdit />
                    </button>
                    <button onClick={() => handleDelete(item.event_id)} className="delete-btn">
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'exhibitions':
        return (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Exhibition Name</th>
                <th>Type</th>
                <th>Location</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.exhibition_id}>
                  <td>{item.exhibition_id}</td>
                  <td>{item.exhibition_name}</td>
                  <td>{item.exhibition_type}</td>
                  <td>{item.location}</td>
                  <td>{new Date(item.start_date).toLocaleDateString()}</td>
                  <td>{new Date(item.end_date).toLocaleDateString()}</td>
                  <td>{item.is_active ? 'Yes' : 'No'}</td>
                  <td>
                    <button onClick={() => handleEdit(item)} className="edit-btn">
                      <FaEdit />
                    </button>
                    <button onClick={() => handleDelete(item.exhibition_id)} className="delete-btn">
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'tickets':
        return (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Ticket Name</th>
                <th>Base Price</th>
                <th>Description</th>
                <th>Available</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.ticket_type_id}>
                  <td>{item.ticket_type_id}</td>
                  <td>{item.ticket_name}</td>
                  <td>${parseFloat(item.base_price).toFixed(2)}</td>
                  <td>{item.description}</td>
                  <td>{item.is_available ? 'Yes' : 'No'}</td>
                  <td>
                    <button onClick={() => handleEdit(item)} className="edit-btn">
                      <FaEdit />
                    </button>
                    <button onClick={() => handleDelete(item.ticket_type_id)} className="delete-btn">
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      default:
        return <div>No table configured for this tab</div>;
    }
  };

  return (
    <div className="admin-portal-container">
      <div className="portal-header">
        <h1>Admin Portal</h1>
        <p>Manage Museum Database</p>
      </div>

      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab.id);
              setShowAddForm(false);
              setEditingItem(null);
              setSelectedImageFile(null);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="admin-content">
        <div className="admin-actions">
          <button
            onClick={() => {
              setShowAddForm(true);
              setSelectedImageFile(null);
            }}
            className="add-item-btn"
          >
            <FaPlus /> Add New Item
          </button>
        </div>

        {(showAddForm || editingItem) && renderForm()}
        
        {!showAddForm && !editingItem && renderItemsTable()}
      </div>
    </div>
  );
}

export default AdminPortal;