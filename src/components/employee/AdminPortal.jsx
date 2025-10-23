// File: src/components/employee/AdminPortal.jsx

import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus, FaSave, FaTimes } from 'react-icons/fa';
import api from '../../services/api';
import './EmployeePortal.css';

function AdminPortal() {
  const [activeTab, setActiveTab] = useState('giftshop');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({});

  const tabs = [
    { id: 'giftshop', label: 'Gift Shop Items', endpoint: '/api/giftshop' },
    { id: 'cafeteria', label: 'Cafeteria Items', endpoint: '/api/cafeteria' },
    { id: 'events', label: 'Museum Events', endpoint: '/api/events' },
    { id: 'exhibitions', label: 'Exhibitions', endpoint: '/api/exhibitions' },
    { id: 'tickets', label: 'Ticket Types', endpoint: '/api/tickets/types' },
  ];

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const endpoint = tabs.find(tab => tab.id === activeTab).endpoint;
      const response = await api.get(endpoint);
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
    setFormData(item);
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      const endpoint = tabs.find(tab => tab.id === activeTab).endpoint;
      await api.delete(`${endpoint}/${itemId}`);
      await fetchItems();
      alert('Item deleted successfully');
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Error deleting item');
    }
  };

  const handleSave = async () => {
    try {
      const endpoint = tabs.find(tab => tab.id === activeTab).endpoint;
      
      if (editingItem) {
        // Update existing item
        const itemId = formData.item_id || formData.event_id || formData.exhibition_id || formData.ticket_type_id;
        await api.put(`${endpoint}/${itemId}`, formData);
        alert('Item updated successfully');
      } else {
        // Add new item
        await api.post(endpoint, formData);
        alert('Item added successfully');
      }
      
      setEditingItem(null);
      setShowAddForm(false);
      setFormData({});
      await fetchItems();
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Error saving item: ' + error.response?.data?.error || error.message);
    }
  };

  const handleCancel = () => {
    setEditingItem(null);
    setShowAddForm(false);
    setFormData({});
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const renderForm = () => {
    // Dynamic form based on active tab
    switch (activeTab) {
      case 'giftshop':
        return (
          <div className="admin-form">
            <h3>{editingItem ? 'Edit Gift Shop Item' : 'Add New Gift Shop Item'}</h3>
            <input
              type="text"
              placeholder="Item Name"
              value={formData.item_name || ''}
              onChange={(e) => handleInputChange('item_name', e.target.value)}
            />
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
            <input
              type="number"
              placeholder="Price"
              step="0.01"
              value={formData.price || ''}
              onChange={(e) => handleInputChange('price', e.target.value)}
            />
            <input
              type="number"
              placeholder="Stock Quantity"
              value={formData.stock_quantity || ''}
              onChange={(e) => handleInputChange('stock_quantity', e.target.value)}
            />
            <textarea
              placeholder="Description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows="3"
            />
            <input
              type="text"
              placeholder="Image URL"
              value={formData.image_url || ''}
              onChange={(e) => handleInputChange('image_url', e.target.value)}
            />
            <label>
              <input
                type="checkbox"
                checked={formData.is_available || false}
                onChange={(e) => handleInputChange('is_available', e.target.checked)}
              />
              Available for Purchase
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

      case 'cafeteria':
        return (
          <div className="admin-form">
            <h3>{editingItem ? 'Edit Cafeteria Item' : 'Add New Cafeteria Item'}</h3>
            <input
              type="text"
              placeholder="Item Name"
              value={formData.item_name || ''}
              onChange={(e) => handleInputChange('item_name', e.target.value)}
            />
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
            <input
              type="number"
              placeholder="Price"
              step="0.01"
              value={formData.price || ''}
              onChange={(e) => handleInputChange('price', e.target.value)}
            />
            <textarea
              placeholder="Description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows="3"
            />
            <input
              type="text"
              placeholder="Allergen Information"
              value={formData.allergen_info || ''}
              onChange={(e) => handleInputChange('allergen_info', e.target.value)}
            />
            <input
              type="number"
              placeholder="Calories"
              value={formData.calories || ''}
              onChange={(e) => handleInputChange('calories', e.target.value)}
            />
            <label>
              <input
                type="checkbox"
                checked={formData.is_vegetarian || false}
                onChange={(e) => handleInputChange('is_vegetarian', e.target.checked)}
              />
              Vegetarian
            </label>
            <label>
              <input
                type="checkbox"
                checked={formData.is_vegan || false}
                onChange={(e) => handleInputChange('is_vegan', e.target.checked)}
              />
              Vegan
            </label>
            <label>
              <input
                type="checkbox"
                checked={formData.is_available || false}
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
            <input
              type="text"
              placeholder="Event Name"
              value={formData.event_name || ''}
              onChange={(e) => handleInputChange('event_name', e.target.value)}
            />
            <input
              type="text"
              placeholder="Event Type"
              value={formData.event_type || ''}
              onChange={(e) => handleInputChange('event_type', e.target.value)}
            />
            <input
              type="date"
              placeholder="Event Date"
              value={formData.event_date || ''}
              onChange={(e) => handleInputChange('event_date', e.target.value)}
            />
            <input
              type="time"
              placeholder="Event Time"
              value={formData.event_time || ''}
              onChange={(e) => handleInputChange('event_time', e.target.value)}
            />
            <input
              type="text"
              placeholder="Location"
              value={formData.location || ''}
              onChange={(e) => handleInputChange('location', e.target.value)}
            />
            <input
              type="number"
              placeholder="Max Capacity"
              value={formData.max_capacity || ''}
              onChange={(e) => handleInputChange('max_capacity', e.target.value)}
            />
            <textarea
              placeholder="Description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows="3"
            />
            <label>
              <input
                type="checkbox"
                checked={formData.is_members_only || false}
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
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="admin-content">
        <div className="admin-actions">
          <button 
            onClick={() => setShowAddForm(true)} 
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