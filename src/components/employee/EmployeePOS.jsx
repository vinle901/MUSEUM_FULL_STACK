// File: src/components/employee/EmployeePOS.jsx

import React, { useState, useEffect } from 'react';
import { FaPlus, FaMinus, FaTrash, FaCreditCard, FaMoneyBillWave, FaCheckCircle } from 'react-icons/fa';
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
  const [receipt, setReceipt] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);

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
    } catch (error) {
      console.error('Error fetching cafeteria items:', error);
      alert('Failed to load cafeteria items from server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', 'Hot Beverages', 'Cold Beverages', 'Sandwiches', 'Salads', 'Desserts', 'Vegan', 'Main Dishes'];

  const filteredItems = cafeteriaItems.filter(item => {
    if (selectedCategory === 'All') return true;
    if (selectedCategory === 'Vegan') {
      const v = item.is_vegan;
      return v === true || v === 1 || v === '1';
    }
    return item.category === selectedCategory;
  });

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
      setCart([...cart, { ...item, quantity: 1, note: '' }]);
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

  const fmtMoney = (n) => `$${Number(n).toFixed(2)}`;

  const updateItemNote = (itemId, value) => {
    setCart(cart.map(item => (
      item.item_id === itemId ? { ...item, note: value } : item
    )));
  };

  const openPreview = (item) => setPreviewItem(item);
  const closePreview = () => setPreviewItem(null);

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
          unit_price: item.price,
          note: item.note || ''
        }))
      };

      const response = await api.post('/api/transactions/cafeteria-pos', transactionData);

      if (response.data?.success) {
        const tx = response.data.transaction || {};
        const purchases = response.data.purchases || [];
        // Attach per-item notes from the current cart snapshot for display on the receipt
        const purchasesWithNotes = purchases.map(p => {
          const match = cart.find(ci => ci.item_id === p.cafeteria_item_id);
          return { ...p, note: match?.note || '' };
        });
        // For display: if no email was provided, leave it blank
        const displayEmail = customerEmail ? customerEmail : '';
        setReceipt({
          transaction: tx,
          purchases: purchasesWithNotes,
          customerEmail: displayEmail,
          cashier: `${userInfo.firstName} ${userInfo.lastName}`,
          createdAt: new Date().toISOString()
        });
        setCart([]);
        setCustomerEmail('');
      } else {
        throw new Error(response.data?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error processing order:', error);
      const msg = error.response?.data?.error || error.message || 'Failed to process order';
      alert(msg);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="loading-container">Loading POS System...</div>;
  }

  // Receipt view
  if (receipt) {
  const { transaction, purchases, customerEmail: custEmail, cashier, createdAt } = receipt;
    const txId = transaction?.transaction_id || '-';
    const total = transaction?.total_price ?? purchases.reduce((s, p) => s + parseFloat(p.line_total || 0), 0);
    const totalItems = transaction?.total_items ?? purchases.reduce((s, p) => s + (p.quantity || 0), 0);
    const payMethod = transaction?.payment_method || paymentMethod;
    const when = new Date(createdAt);

    return (
      <div className="employee-pos-container">
        <div className="pos-header">
          <h1>Cafeteria Receipt</h1>
          <div className="pos-employee-info">
            Cashier: {cashier}
          </div>
        </div>

        <div className="pos-layout" style={{ display: 'block' }}>
          <div className="card" style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
            <div className="rounded-lg" style={{ background: '#ecfdf5', border: '1px solid #86efac', color: '#065f46', padding: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaCheckCircle />
              <strong>Order placed successfully</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, color: '#6b7280' }}>Transaction ID</div>
                <div style={{ fontWeight: 700 }}>{txId}</div>
              </div>
              <div>
                <div style={{ fontSize: 14, color: '#6b7280' }}>Date</div>
                <div style={{ fontWeight: 700 }}>{when.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: 14, color: '#6b7280' }}>Payment</div>
                <div style={{ fontWeight: 700 }}>{payMethod}</div>
              </div>
              <div>
                <div style={{ fontSize: 14, color: '#6b7280' }}>Customer</div>
                <div style={{ fontWeight: 700 }}>{custEmail}</div>
              </div>
            </div>

            <hr style={{ margin: '16px 0' }} />

            <div className="receipt-items">
              {purchases.length === 0 ? (
                <div className="empty-cart">No line items</div>
              ) : (
                <div style={{ width: '100%', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                        <th style={{ padding: '8px 6px' }}>Item</th>
                        <th style={{ padding: '8px 6px' }}>Qty</th>
                        <th style={{ padding: '8px 6px' }}>Unit</th>
                        <th style={{ padding: '8px 6px' }}>Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.map((p, idx) => (
                        <tr key={p.purchase_id} style={{ borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>
                          <td style={{ padding: '8px 6px' }}>
                            <div>{p.item_name}</div>
                            {p.note && p.note.trim() && (
                              <div style={{ marginTop: 4, marginLeft: 12, color: '#66707cff', fontSize: 13 }}>
                                • {p.note}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '8px 6px' }}>{p.quantity}</td>
                          <td style={{ padding: '8px 6px' }}>{fmtMoney(p.unit_price)}</td>
                          <td style={{ padding: '8px 6px', fontWeight: 600 }}>{fmtMoney(p.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <div style={{ minWidth: 260 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span>Items</span>
                  <strong>{totalItems}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #e5e7eb', marginTop: 6 }}>
                  <span>Total</span>
                  <strong>{fmtMoney(total)}</strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
              <button
                className="process-order-btn"
                onClick={() => { setReceipt(null); setPaymentMethod('Credit Card'); setCustomerEmail(''); setCart([]); }}
              >
                Start New Order
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="employee-pos-container">
      <div className="pos-header">
        <h1>Cafeteria POS System</h1>
        <div className="pos-employee-info">
          Employee: {userInfo.firstName} {userInfo.lastName}
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
                <div className="item-actions">
                  <button
                    className="info-btn"
                    onClick={(e) => { e.stopPropagation(); openPreview(item); }}
                    type="button"
                  >
                    Info
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Item Preview Modal */}
        {previewItem && (
          <div className="modal-overlay" onClick={closePreview}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{previewItem.item_name}</h3>
                <button className="modal-close" onClick={closePreview} aria-label="Close">×</button>
              </div>
              <div className="modal-content">
                <div className="modal-price">{fmtMoney(previewItem.price)}</div>
                <div className="modal-row"><strong>Description:</strong> <span>{previewItem.description || 'No description available.'}</span></div>
                <div className="modal-row"><strong>Availability:</strong> <span>{(previewItem.is_available === true || previewItem.is_available === 1 || previewItem.is_available === '1') ? 'Available' : 'Unavailable'}</span></div>
                <div className="modal-row"><strong>Expected prep time:</strong> <span>{previewItem.preparation_time_minutes != null ? `${previewItem.preparation_time_minutes} minutes` : 'N/A'}</span></div>
                <div className="modal-row"><strong>Calories:</strong> <span>{previewItem.calories != null ? previewItem.calories : 'N/A'}</span></div>
                <div className="modal-row"><strong>Allergen info:</strong> <span>{previewItem.allergen_info || '—'}</span></div>
              </div>
              <div className="modal-actions">
                <button
                  className="process-order-btn"
                  onClick={() => { addToCart(previewItem); closePreview(); }}
                  disabled={!previewItem.is_available}
                >
                  Add to Order
                </button>
              </div>
            </div>
          </div>
        )}

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

          <div className="cart-actions">
            <button
              type="button"
              className="clear-cart-btn"
              onClick={() => setCart([])}
              disabled={cart.length === 0}
            >
              Clear Order
            </button>
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
                  {/* Per-item special request (shown under item name) */}
                  <div style={{ marginTop: 6 }}>
                    <textarea
                      placeholder="Special request"
                      value={item.note || ''}
                      onChange={(e) => updateItemNote(item.item_id, e.target.value)}
                      className="item-note-input"
                      rows={2}
                    />
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