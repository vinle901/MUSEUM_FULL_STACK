// File: src/components/employee/AdminPortal.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { FaEdit, FaTrash, FaPlus, FaSave, FaTimes } from 'react-icons/fa';
import api from '../../services/api';
import './EmployeePortal.css';
import NotificationBell from './NotificationBell';

function AdminPortal() {
  const location = useLocation();

  // ---------- core state ----------
  const [activeTab, setActiveTab] = useState('employees');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [artists, setArtists] = useState([]);
  const [exhibitions, setExhibitions] = useState([]);
  const [pendingEditItemId, setPendingEditItemId] = useState(null);

  const [selectedImageFile, setSelectedImageFile] = useState(null);

  // membership sign-ups report specific
  const todayISO = new Date().toISOString().slice(0, 10);
  const twoWeeksAgoISO = new Date(Date.now() - 13 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(twoWeeksAgoISO);
  const [endDate, setEndDate] = useState(todayISO);
  const [memberSummary, setMemberSummary] = useState({ signupCount: 0, totalAmount: 0 });

  const tabs = [
    { id: 'employees', label: 'Employees', endpoint: '/api/employees' },
    { id: 'artists', label: 'Artists', endpoint: '/api/artists' },
    { id: 'artworks', label: 'Artworks', endpoint: '/api/artworks' },
    { id: 'giftshop', label: 'Gift Shop Items', endpoint: '/api/giftshop' },
    { id: 'tickets', label: 'Ticket Types', endpoint: '/api/tickets/types' },
    { id: 'cafeteria', label: 'Cafeteria Items', endpoint: '/api/cafeteria' },
    { id: 'exhibitions', label: 'Exhibitions', endpoint: '/api/exhibitions' },
    { id: 'events', label: 'Museum Events', endpoint: '/api/events' },
    { id: 'membersignups', label: 'Membership Sign-ups', endpoint: '/api/reports/membership-signups', readonly: true },
  ];

  // Handle navigation from notification bell
  useEffect(() => {
    if (location.state?.openTab && location.state?.editItemId) {
      const { openTab, editItemId, notificationId } = location.state;

      // Set the active tab
      setActiveTab(openTab);

      // Store the item ID to edit after items load
      setPendingEditItemId(editItemId);

      // Store notification ID to resolve later
      if (notificationId) {
        sessionStorage.setItem('pendingNotificationResolve', notificationId);
      }

      // Clear the location state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Auto-open edit form when items are loaded from notification
  useEffect(() => {
    if (pendingEditItemId && items.length > 0) {
      const itemToEdit = items.find(item => item.item_id === pendingEditItemId);
      if (itemToEdit) {
        handleEdit(itemToEdit);
        setPendingEditItemId(null); // Clear after using
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, pendingEditItemId]);

  useEffect(() => {
    fetchItems();
    // Fetch artists and exhibitions for artwork and events form dropdowns
    if (activeTab === 'artworks' || activeTab === 'events') {
      fetchArtistsAndExhibitions();
    }
    // reset any editor bits when tab changes
    setShowAddForm(false);
    setEditingItem(null);
    setSelectedImageFile(null);
  }, [activeTab]);

  // Re-run report when date range changes (only on membership tab)
  useEffect(() => {
    if (activeTab === 'membersignups') fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  // ---------- helpers ----------
  const fmtMoney = (n) =>
    Number(n || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' });

  const fetchArtistsAndExhibitions = async () => {
    try {
      const [artistsRes, exhibitionsRes] = await Promise.all([
        api.get('/api/artists'),
        api.get('/api/exhibitions?include_inactive=true'),
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

      if (activeTab === 'membersignups') {
        const { data } = await api.get(url, { params: { startDate, endDate } });
        setItems(data.rows || []);
        setMemberSummary({
          signupCount: Number(data?.summary?.signupCount || 0),
          totalAmount: Number(data?.summary?.totalAmount || 0),
        });
      } else {
        const { data } = await api.get(url);
        setItems(data);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      alert('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  // membership sign-ups aggregation by day (client-side grouping)
  const membershipAgg = useMemo(() => {
    if (activeTab !== 'membersignups') return { groups: [], overall: 0 };

    const map = new Map();
    let overall = 0;

    for (const r of items || []) {
      const when = r.purchased_at || r.created_at;
      const key = new Date(when).toISOString().slice(0, 10); // YYYY-MM-DD
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
      overall += Number(r.line_total ?? r.amount_paid ?? 0);
    }

    const groups = Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
    return { groups, overall };
  }, [activeTab, items]);

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

    if (activeTab === 'employees') {
      if (formattedItem.hire_date) {
        formattedItem.hire_date = new Date(formattedItem.hire_date).toISOString().split('T')[0];
      }
      if (formattedItem.birthdate) {
        formattedItem.birthdate = new Date(formattedItem.birthdate).toISOString().split('T')[0];
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
      // Provide specific messages for different tabs
      if (activeTab === 'employees') {
        if (errorMessage.includes('email') || errorMessage.toLowerCase().includes('users.email')) {
          return 'This email address is already in use.\n\nPlease use a different email address.';
        }
        if (errorMessage.includes('ssn') || errorMessage.toLowerCase().includes('employee.ssn')) {
          return 'This SSN is already registered.\n\nPlease check the SSN or contact the administrator if this is an error.';
        }
        return 'This employee information already exists (duplicate email or SSN).\n\nPlease use different credentials.';
      }
      return 'This entry already exists.\n\nPlease use a different name or identifier.';
    }

    // Return original error if not a known constraint type
    return errorMessage;
  };

  const handleDelete = async (itemId) => {
    const tab = tabs.find((t) => t.id === activeTab);
    if (tab.readonly) return;
    
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      let endpoint = tab.endpoint;
      // ID route format is consistent across our endpoints here
      endpoint = `${endpoint}/${itemId}`;

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

  const validateEmployeeForm = () => {
    const errors = [];

    // Required fields for new employees
    if (!editingItem) {
      if (!formData.first_name?.trim()) errors.push('First name is required');
      if (!formData.last_name?.trim()) errors.push('Last name is required');
      if (!formData.email?.trim()) errors.push('Email is required');
      if (!formData.password?.trim()) errors.push('Password is required');
      if (!formData.birthdate) errors.push('Birthdate is required');
      if (!formData.sex) errors.push('Sex is required');
    }

    // Required fields for all employees
    if (!formData.role?.trim()) errors.push('Role is required');
    if (!formData.ssn?.trim()) errors.push('SSN is required');
    if (!formData.hire_date) errors.push('Hire date is required');
    if (!formData.salary) errors.push('Salary is required');
    if (!formData.responsibility?.trim()) errors.push('Responsibility is required');

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push('Invalid email format');
    }

    // SSN validation (format: XXX-XX-XXXX)
    if (formData.ssn && !/^\d{3}-\d{2}-\d{4}$/.test(formData.ssn)) {
      errors.push('SSN must be in format XXX-XX-XXXX');
    }

    // Password validation (for new employees)
    if (!editingItem && formData.password && formData.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    // Salary validation
    if (formData.salary && parseFloat(formData.salary) <= 0) {
      errors.push('Salary must be greater than 0');
    }

    // Date validations
    if (formData.hire_date) {
      const hireDate = new Date(formData.hire_date);
      const today = new Date();
      if (hireDate > today) {
        errors.push('Hire date cannot be in the future');
      }
    }

    if (formData.birthdate) {
      const birthdate = new Date(formData.birthdate);
      const today = new Date();
      const age = (today - birthdate) / (1000 * 60 * 60 * 24 * 365.25);
      if (age < 16) {
        errors.push('Employee must be at least 16 years old');
      }
      if (age > 120) {
        errors.push('Invalid birthdate');
      }
    }

    return errors;
  };

  const handleSave = async () => {
    try {
      const endpoint = tabs.find(tab => tab.id === activeTab).endpoint;

      // Validate employee form if on employees tab
      if (activeTab === 'employees') {
        const validationErrors = validateEmployeeForm();
        if (validationErrors.length > 0) {
          alert('Validation Errors:\n\n' + validationErrors.join('\n'));
          return;
        }
      }

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

      // Format dates to YYYY-MM-DD for employee birthdate and hire_date
      if (activeTab === 'employees') {
        if (dataToSave.birthdate) {
          dataToSave.birthdate = new Date(dataToSave.birthdate).toISOString().split('T')[0];
        }
        if (dataToSave.hire_date) {
          dataToSave.hire_date = new Date(dataToSave.hire_date).toISOString().split('T')[0];
        }
      }

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
          case 'artists':
            itemId = formData.artist_id;
            break;
          case 'employees':
            itemId = formData.employee_id;
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
        // Use special endpoint for creating employees with account
        const createEndpoint = activeTab === 'employees' ? '/api/employees/create-with-account' : endpoint;
        await api.post(createEndpoint, dataToSave);
        alert('Item added successfully');
      }

      setEditingItem(null);
      setShowAddForm(false);
      setFormData({});
      setSelectedImageFile(null);
      await fetchItems();

      // If this edit came from a notification, resolve it
      const pendingNotificationId = sessionStorage.getItem('pendingNotificationResolve');
      if (pendingNotificationId) {
        try {
          await api.put(`/api/notifications/${pendingNotificationId}/resolve`);
          sessionStorage.removeItem('pendingNotificationResolve');
        } catch (error) {
          console.error('Error resolving notification:', error);
        }
      }
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
    // Clear pending notification if user cancels
    sessionStorage.removeItem('pendingNotificationResolve');
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

  // ---------- forms ----------
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

      case 'artists':
        return (
          <div className="admin-form">
            <h3>{editingItem ? 'Edit Artist' : 'Add New Artist'}</h3>
            <div>
              <label>Artist Name: *</label>
              <input
                type="text"
                placeholder="e.g., Vincent van Gogh"
                value={formData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </div>
            <div>
              <label>Birth Year:</label>
              <input
                type="number"
                placeholder="e.g., 1853"
                min="1000"
                max="2100"
                value={formData.birth_year || ''}
                onChange={(e) => handleInputChange('birth_year', e.target.value)}
              />
            </div>
            <div>
              <label>Death Year:</label>
              <input
                type="number"
                placeholder="e.g., 1890 (leave blank if still living)"
                min="1000"
                max="2100"
                value={formData.death_year || ''}
                onChange={(e) => handleInputChange('death_year', e.target.value)}
              />
            </div>
            <div>
              <label>Nationality:</label>
              <input
                type="text"
                placeholder="e.g., Dutch"
                value={formData.nationality || ''}
                onChange={(e) => handleInputChange('nationality', e.target.value)}
              />
            </div>
            <div>
              <label>Biography:</label>
              <textarea
                placeholder="e.g., A post-impressionist painter known for bold colors..."
                value={formData.artist_biography || ''}
                onChange={(e) => handleInputChange('artist_biography', e.target.value)}
                rows="4"
              />
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

      case 'employees':
        return (
          <div className="admin-form">
            <h3>{editingItem ? 'Edit Employee' : 'Add New Employee'}</h3>
            
            {/* User Account Information */}
            <h4 style={{ marginTop: '20px', marginBottom: '10px', color: '#555' }}>Account Information</h4>
            <div>
              <label>First Name: *</label>
              <input
                type="text"
                placeholder="e.g., John"
                value={formData.first_name || ''}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
              />
            </div>
            <div>
              <label>Last Name: *</label>
              <input
                type="text"
                placeholder="e.g., Smith"
                value={formData.last_name || ''}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
              />
            </div>
            <div>
              <label>Email: *</label>
              <input
                type="email"
                placeholder="e.g., john.smith@museum.com"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>
            {!editingItem && (
              <>
                <div>
                  <label>Initial Password: *</label>
                  <input
                    type="password"
                    placeholder="Enter temporary password"
                    value={formData.password || ''}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                  />
                  <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                    Employee must change this password on first login
                  </small>
                </div>
              </>
            )}
            <div>
              <label>Birthdate: *</label>
              <input
                type="date"
                value={formData.birthdate || ''}
                onChange={(e) => handleInputChange('birthdate', e.target.value)}
              />
            </div>
            <div>
              <label>Sex: *</label>
              <select
                value={formData.sex || ''}
                onChange={(e) => handleInputChange('sex', e.target.value)}
              >
                <option value="">Select</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="Non-Binary">Non-Binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
            <div>
              <label>Phone Number:</label>
              <input
                type="tel"
                placeholder="e.g., 555-123-4567"
                value={formData.phone_number || ''}
                onChange={(e) => handleInputChange('phone_number', e.target.value)}
              />
            </div>
            <div>
              <label>Address:</label>
              <input
                type="text"
                placeholder="e.g., 123 Main St, Houston, TX 77002"
                value={formData.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
              />
            </div>

            {/* Employee-Specific Information */}
            <h4 style={{ marginTop: '20px', marginBottom: '10px', color: '#555' }}>Employment Details</h4>
            <div>
              <label>Role: *</label>
              <select
                value={formData.role || ''}
                onChange={(e) => handleInputChange('role', e.target.value)}
              >
                <option value="">Select Role</option>
                <option value="Admin">Admin</option>
                <option value="Director">Director</option>
                <option value="Manager">Manager</option>
                <option value="Curator">Curator</option>
                <option value="Analyst">Analyst</option>
                <option value="Data Analyst">Data Analyst</option>
                <option value="Gift Shop Staff">Gift Shop Staff</option>
                <option value="Cafeteria Staff">Cafeteria Staff</option>
                <option value="Barista">Barista</option>
                <option value="Cashier">Cashier</option>
                <option value="Ticket Staff">Ticket Staff</option>
                <option value="Security">Security</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
            <div>
              <label>SSN: *</label>
              <input
                type="text"
                placeholder="e.g., 123-45-6789"
                maxLength="11"
                value={formData.ssn || ''}
                onChange={(e) => handleInputChange('ssn', e.target.value)}
                disabled={editingItem ? false : false}
              />
              <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                Format: XXX-XX-XXXX
              </small>
            </div>
            <div>
              <label>Hire Date: *</label>
              <input
                type="date"
                value={formData.hire_date || ''}
                onChange={(e) => handleInputChange('hire_date', e.target.value)}
              />
            </div>
            <div>
              <label>Salary: *</label>
              <input
                type="number"
                placeholder="e.g., 50000.00"
                step="0.01"
                min="0"
                value={formData.salary || ''}
                onChange={(e) => handleInputChange('salary', e.target.value)}
              />
            </div>
            <div>
              <label>Responsibility: *</label>
              <textarea
                placeholder="e.g., Manage exhibitions, oversee artwork curation, coordinate with artists..."
                value={formData.responsibility || ''}
                onChange={(e) => handleInputChange('responsibility', e.target.value)}
                rows="3"
              />
            </div>
            <div>
              <label>Manager:</label>
              <select
                value={formData.manager_id || ''}
                onChange={(e) => handleInputChange('manager_id', e.target.value)}
              >
                <option value="">None (Top-level employee)</option>
                {items.filter(emp => emp.employee_id !== formData.employee_id).map(emp => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.first_name} {emp.last_name} - {emp.role}
                  </option>
                ))}
              </select>
            </div>
            {editingItem && (
              <div>
                <label>Status:</label>
                <select
                  value={formData.is_active ? '1' : '0'}
                  onChange={(e) => handleInputChange('is_active', e.target.value === '1')}
                >
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </div>
            )}
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

  // ---------- tables ----------
  const renderItemsTable = () => {
    if (loading) return <div className="loading">Loading...</div>;

    // Sort items by their ID field
    const getSortedItems = () => {
      const sortedItems = [...items];
      switch (activeTab) {
        case 'artworks':
          return sortedItems.sort((a, b) => a.artwork_id - b.artwork_id);
        case 'artists':
          return sortedItems.sort((a, b) => a.artist_id - b.artist_id);
        case 'employees':
          return sortedItems.sort((a, b) => a.employee_id - b.employee_id);
        case 'giftshop':
        case 'cafeteria':
          return sortedItems.sort((a, b) => a.item_id - b.item_id);
        case 'events':
          return sortedItems.sort((a, b) => a.event_id - b.event_id);
        case 'exhibitions':
          return sortedItems.sort((a, b) => a.exhibition_id - b.exhibition_id);
        case 'tickets':
          return sortedItems.sort((a, b) => a.ticket_type_id - b.ticket_type_id);
        default:
          return sortedItems;
      }
    };

    const sortedItems = getSortedItems();

    // Membership Sign-ups report (read-only)
    if (activeTab === 'membersignups') {
      const groups = membershipAgg.groups;
      const overallClient = membershipAgg.overall;
      const overallServer = memberSummary.totalAmount;
      const overall = (overallServer || overallClient);

      return (
        <>
          <div className="d-flex align-items-end gap-3 flex-wrap justify-content-between" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ maxWidth: '180px', width: '100%' }}>
                <label className="form-label mb-1">Start date</label>
                <input type="date" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div style={{ maxWidth: '180px', width: '100%' }}>
                <label className="form-label mb-1">End date</label>
                <input type="date" className="form-control" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <button className="btn btn-primary" style={{ height: '38px', marginTop: '22px' }} onClick={fetchItems}>Apply</button>
              <div style={{ marginLeft: 'auto', fontWeight: '700', textAlign: 'right', marginRight: '30px', fontSize: '1.1rem', lineHeight: '1.2' }}>
                Overall Total: {fmtMoney(overall)} &nbsp;•&nbsp; Sign-ups: {memberSummary.signupCount}
              </div>
            </div>
          </div>

          {groups.length === 0 ? (
            <div className="no-items">No sign-ups in this range</div>
          ) : (
            groups.map(([date, rows]) => {
              const dayTotal = rows.reduce((s, r) => s + Number(r.line_total ?? r.amount_paid ?? 0), 0);
              return (
                <div key={date} style={{ marginBottom: '1.25rem' }}>
                  <div className="d-flex align-items-center" style={{ marginBottom: '1rem' }}>
                    <h3 className="mb-0" style={{ fontSize: '1.05rem' }}>{date}</h3>
                    <div className="ms-auto small text-muted">
                      {rows.length} sign-up{rows.length !== 1 ? 's' : ''} • Total {fmtMoney(dayTotal)}
                    </div>
                  </div>
                  <div className="table-responsive">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Plan</th>
                          <th>Newsletter</th>
                          <th>Amount</th>
                          <th>Purchased At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={r.purchase_id ?? `${date}-${i}`}>
                            <td>{r.purchase_id ?? '—'}</td>
                            <td>{r.first_name} {r.last_name}</td>
                            <td>{r.email}</td>
                            <td>{r.phone_number ?? '—'}</td>
                            <td>{r.membership_type}</td>
                            <td>{r.subscribe_to_newsletter ? 'Yes' : 'No'}</td>
                            <td>{fmtMoney(r.line_total ?? r.amount_paid)}</td>
                            <td>{new Date(r.purchased_at || r.created_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </>
      );
    }

    if (sortedItems.length === 0) {
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
              {sortedItems.map(item => (
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

      case 'artists':
        return (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Birth Year</th>
                <th>Death Year</th>
                <th>Nationality</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map(item => (
                <tr key={item.artist_id}>
                  <td>{item.artist_id}</td>
                  <td>{item.name}</td>
                  <td>{item.birth_year || 'N/A'}</td>
                  <td>{item.death_year || 'Living'}</td>
                  <td>{item.nationality || 'N/A'}</td>
                  <td>
                    <button onClick={() => handleEdit(item)} className="edit-btn">
                      <FaEdit />
                    </button>
                    <button onClick={() => handleDelete(item.artist_id)} className="delete-btn">
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'employees':
        return (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Salary</th>
                <th>Hire Date</th>
                <th>Manager</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map(item => (
                <tr key={item.employee_id}>
                  <td>{item.employee_id}</td>
                  <td>{item.first_name} {item.last_name}</td>
                  <td>{item.email}</td>
                  <td>{item.role}</td>
                  <td>${item.salary ? parseFloat(item.salary).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : 'N/A'}</td>
                  <td>{item.hire_date ? new Date(item.hire_date).toLocaleDateString() : 'N/A'}</td>
                  <td>
                    {item.manager_name || 
                     (item.manager_first_name && item.manager_last_name 
                       ? `${item.manager_first_name} ${item.manager_last_name}` 
                       : 'None')}
                  </td>
                  <td>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      backgroundColor: item.is_active ? '#d4edda' : '#f8d7da',
                      color: item.is_active ? '#155724' : '#721c24',
                      fontSize: '12px'
                    }}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => handleEdit(item)} className="edit-btn">
                      <FaEdit />
                    </button>
                    <button onClick={() => handleDelete(item.employee_id)} className="delete-btn">
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
              {sortedItems.map(item => (
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
              {sortedItems.map(item => (
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
              {sortedItems.map(item => (
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
              {sortedItems.map(item => (
                <tr key={item.exhibition_id}>
                  <td>{item.exhibition_id}</td>
                  <td>{item.exhibition_name}</td>
                  <td>{item.exhibition_type}</td>
                  <td>{item.location}</td>
                  <td>{new Date(item.start_date).toLocaleDateString()}</td>
                  <td>{item.end_date ? new Date(item.end_date).toLocaleDateString() : 'No End Date'}</td>
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
              {sortedItems.map(item => (
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

  const currentTab = tabs.find((t) => t.id === activeTab);

  // ---------- render ----------

  return (
    <div className="admin-portal-container">
      <div className="portal-header">
        <div>
          <h1>Admin Portal</h1>
          <p>Manage Museum Database</p>
        </div>
        <NotificationBell />
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
        {activeTab !== 'membersignups' && (
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
        )}

        {(showAddForm || editingItem) && renderForm()}
        
        {!showAddForm && !editingItem && renderItemsTable()}
      </div>
    </div>
  );
}

export default AdminPortal;