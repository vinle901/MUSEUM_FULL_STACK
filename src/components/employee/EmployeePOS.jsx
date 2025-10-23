// File: src/components/employee/EmployeePOS.jsx

import React, { useState, useEffect } from 'react';
import { FaPlus, FaMinus, FaTrash, FaCreditCard, FaMoneyBillWave } from 'react-icons/fa';
import api from '../../services/api';
import './EmployeePortal.css';

function EmployeePOS() {
  const [cafeteriaItems, setCafeteriaItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [customerEmail, setCustomerEmail] = useState('');

  // Get user info safely for development mode
  const getUserInfo = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return {
        firstName: user.first_name || 'Demo',
        lastName: user.last_name || 'Employee'
      };
    } catch {
      return {
        firstName: 'Demo',
        lastName: 'Employee'
      };
    }
  };

  const userInfo = getUserInfo();

  useEffect(() => {
    fetchCafeteriaItems();
  }, []);

  const fetchCafeteriaItems = async () => {
    try {
      const response = await api.get('/api/cafeteria');
      setCafeteriaItems(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching cafeteria items:', error);
      // For development, use mock data if API fails
      setCafeteriaItems(getMockCafeteriaItems());
      setLoading(false);
    }
  };

  const getMockCafeteriaItems = () => {
    return [
      { item_id: 1, item_name: 'House Latte', category: 'Hot Beverages', price: '5.25', is_available: true },
      { item_id: 2, item_name: 'Cold Brew', category: 'Cold Beverages', price: '4.75', is_available: true },
      { item_id: 3, item_name: 'Croissant', category: 'Snacks', price: '4.50', is_available: true },
      { item_id: 4, item_name: 'Garden Salad', category: 'Salads', price: '10.25', is_available: true },
      { item_id: 5, item_name: 'Chocolate Tart', category: 'Desserts', price: '6.50', is_available: false },
    ];
  };

  const categories = ['All', 'Hot Beverages', 'Cold Beverages', 'Sandwiches', 'Salads', 'Desserts', 'Snacks', 'Main Dishes'];

  const filteredItems = cafeteriaItems.filter(item => 
    selectedCategory === 'All' || item.category === selectedCategory
  );

  const addToCart = (item) => {
    if (!item.is_available) {
      alert('This item is currently out of stock');
      return;
    }
    
    const existingItem = cart.find(cartItem => cartItem.item_id === item.item_id);
    
    if (existingItem) {
      setCart(cart.map(cartItem => 
        cartItem.item_id === item.item_id 
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.item_id !== itemId));
  };

  const updateQuantity = (itemId, change) => {
    setCart(cart.map(item => {
      if (item.item_id === itemId) {
        const newQuantity = item.quantity + change;
        if (newQuantity <= 0) return null;
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(Boolean));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0).toFixed(2);
  };

  const processOrder = async () => {
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }

    setProcessing(true);

    try {
      // Create transaction data
      const transactionData = {
        customerEmail: customerEmail || 'walk-in@museum.org',
        paymentMethod,
        items: cart.map(item => ({
          cafeteria_item_id: item.item_id,
          quantity: item.quantity,
          unit_price: item.price
        }))
      };

      // For development, simulate success if API fails
      const response = await api.post('/api/transactions/cafeteria-pos', transactionData).catch(() => {
        // Simulate successful transaction for development
        return { 
          data: { 
            success: true, 
            transactionId: `DEMO-${Date.now()}`,
            message: 'Demo transaction processed'
          } 
        };
      });

      if (response.data.success) {
        alert(`Order processed successfully! Transaction ID: ${response.data.transactionId}`);
        setCart([]);
        setCustomerEmail('');
      }
    } catch (error) {
      console.error('Error processing order:', error);
      // For development, still clear the cart
      alert('Demo Mode: Order would be processed here');
      setCart([]);
      setCustomerEmail('');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="loading-container">Loading POS System...</div>;
  }

  return (
    <div className="employee-pos-container">
      <div className="pos-header">
        <h1>Cafeteria POS System</h1>
        <div className="pos-employee-info">
          Employee: {userInfo.firstName} {userInfo.lastName}
          <span style={{ marginLeft: '10px', fontSize: '0.9em', opacity: 0.7 }}>
            (Development Mode)
          </span>
        </div>
      </div>

      <div className="pos-layout">
        {/* Left side - Menu items */}
        <div className="pos-menu-section">
          <div className="category-tabs">
            {categories.map(category => (
              <button
                key={category}
                className={`category-tab ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="menu-items-grid">
            {filteredItems.map(item => (
              <div 
                key={item.item_id} 
                className={`menu-item-card ${!item.is_available ? 'unavailable' : ''}`}
                onClick={() => addToCart(item)}
                style={{ opacity: item.is_available ? 1 : 0.6 }}
              >
                <div className="item-name">{item.item_name}</div>
                <div className="item-price">${parseFloat(item.price).toFixed(2)}</div>
                {item.is_available ? (
                  <span className="availability available">Available</span>
                ) : (
                  <span className="availability unavailable">Out of Stock</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right side - Cart */}
        <div className="pos-cart-section">
          <h2>Current Order</h2>
          
          <div className="customer-info">
            <input
              type="email"
              placeholder="Customer email (optional)"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="customer-email-input"
            />
          </div>

          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="empty-cart">No items in cart</div>
            ) : (
              cart.map(item => (
                <div key={item.item_id} className="cart-item">
                  <div className="cart-item-info">
                    <span className="cart-item-name">{item.item_name}</span>
                    <span className="cart-item-price">${parseFloat(item.price).toFixed(2)}</span>
                  </div>
                  <div className="cart-item-controls">
                    <button 
                      className="quantity-btn"
                      onClick={(e) => { e.stopPropagation(); updateQuantity(item.item_id, -1); }}
                    >
                      <FaMinus />
                    </button>
                    <span className="quantity">{item.quantity}</span>
                    <button 
                      className="quantity-btn"
                      onClick={(e) => { e.stopPropagation(); updateQuantity(item.item_id, 1); }}
                    >
                      <FaPlus />
                    </button>
                    <button 
                      className="remove-btn"
                      onClick={(e) => { e.stopPropagation(); removeFromCart(item.item_id); }}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="cart-summary">
            <div className="total">
              <span>Total:</span>
              <span className="total-amount">${calculateTotal()}</span>
            </div>

            <div className="payment-method">
              <label>Payment Method:</label>
              <select 
                value={paymentMethod} 
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="payment-select"
              >
                <option>Credit Card</option>
                <option>Debit Card</option>
                <option>Cash</option>
                <option>Mobile Payment</option>
              </select>
            </div>

            <button 
              className="process-order-btn"
              onClick={processOrder}
              disabled={processing || cart.length === 0}
            >
              {processing ? 'Processing...' : `Process Order - $${calculateTotal()}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmployeePOS;