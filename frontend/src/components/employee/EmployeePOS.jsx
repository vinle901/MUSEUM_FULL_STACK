// File: src/components/employee/EmployeePOS.jsx

import React, { useState, useEffect } from 'react';
import { FaPlus, FaMinus, FaTrash, FaCreditCard, FaMoneyBillWave, FaCheckCircle, FaCoffee, FaGift, FaTicketAlt } from 'react-icons/fa';
import api from '../../services/api';
import './EmployeePortal.css';

function EmployeePOS() {
  // Department states
  const [activeDepartment, setActiveDepartment] = useState('cafeteria'); // cafeteria, giftshop, tickets

  // Item states
  const [cafeteriaItems, setCafeteriaItems] = useState([]);
  const [giftShopItems, setGiftShopItems] = useState([]);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [benefits, setBenefits] = useState([]); // Membership types from Benefits table

  // Cart and UI states
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [customerEmail, setCustomerEmail] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const [quantityModal, setQuantityModal] = useState(null); // { item, quantity }

  // Membership discount
  const [membership, setMembership] = useState(null);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [membershipChecked, setMembershipChecked] = useState(false); // Track if button was clicked

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
    fetchAllItems();
  }, []);

  const fetchMembership = async () => {
    setMembershipLoading(true);
    setMembershipChecked(true); // Mark that we checked
    try {
      const response = await api.get(`/api/memberships/by-email/${encodeURIComponent(customerEmail)}`);
      setMembership(response.data);
    } catch (error) {
      // No membership found - that's okay
      setMembership(null);
    } finally {
      setMembershipLoading(false);
    }
  };

  const fetchAllItems = async () => {
    setLoading(true);
    try {
      const [cafRes, giftRes, ticketRes, benefitsRes] = await Promise.all([
        api.get('/api/cafeteria'),
        api.get('/api/giftshop'),
        api.get('/api/tickets/types'),
        api.get('/api/benefits')
      ]);

      setCafeteriaItems(cafRes.data);
      setGiftShopItems(giftRes.data);
      setTicketTypes(ticketRes.data);
      setBenefits(benefitsRes.data);
    } catch (error) {
      console.error('Error fetching items:', error);
      alert('Failed to load items from server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Department configuration
  const departments = {
    cafeteria: {
      name: 'Cafeteria',
      icon: FaCoffee,
      items: cafeteriaItems,
      categories: ['All', 'Hot Beverages', 'Cold Beverages', 'Sandwiches', 'Salads', 'Desserts', 'Vegan', 'Main Dishes'],
      idField: 'item_id',
      nameField: 'item_name',
      priceField: 'price',
      availabilityField: 'is_available',
      categoryField: 'category'
    },
    giftshop: {
      name: 'Gift Shop',
      icon: FaGift,
      items: giftShopItems,
      categories: ['All', 'Posters', 'Books', 'Postcards', 'Jewelry', 'Souvenirs', 'Toys', 'Stationery'],
      idField: 'item_id',
      nameField: 'item_name',
      priceField: 'price',
      availabilityField: 'is_available',
      categoryField: 'category'
    },
    tickets: {
      name: 'Tickets',
      icon: FaTicketAlt,
      items: ticketTypes,
      categories: ['All'],
      idField: 'ticket_type_id',
      nameField: 'ticket_name',
      priceField: 'base_price',
      availabilityField: 'is_available',
      categoryField: null
    }
  };

  const currentDept = departments[activeDepartment];

  const filteredItems = currentDept.items.filter(item => {
    if (selectedCategory === 'All') return true;
    if (selectedCategory === 'Vegan' && activeDepartment === 'cafeteria') {
      const v = item.is_vegan;
      return v === true || v === 1 || v === '1';
    }
    if (currentDept.categoryField) {
      return item[currentDept.categoryField] === selectedCategory;
    }
    return true;
  });

  const addToCart = (item) => {
    const idField = currentDept.idField;
    const avail = item[currentDept.availabilityField];

    if (!(avail === true || avail === 1 || avail === '1')) {
      alert('This item is currently unavailable');
      return;
    }

    // Open quantity modal for all items
    setQuantityModal({ item, quantity: 1, idField, activeDept: activeDepartment });
  };

  const confirmAddToCart = (selectedQuantity) => {
    if (!quantityModal) return;
    const { item, idField, activeDept } = quantityModal;

    if (selectedQuantity <= 0) return;

    const existingItem = cart.find(cartItem =>
      cartItem[idField] === item[idField] && cartItem.department === activeDept
    );

    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem[idField] === item[idField] && cartItem.department === activeDept
          ? { ...cartItem, quantity: cartItem.quantity + selectedQuantity }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: selectedQuantity, note: '', department: activeDept }]);
    }

    setQuantityModal(null);
  };

  const removeFromCart = (item) => {
    const idField = departments[item.department].idField;
    setCart(cart.filter(cartItem =>
      !(cartItem[idField] === item[idField] && cartItem.department === item.department)
    ));
  };

  const updateQuantity = (item, change) => {
    const idField = departments[item.department].idField;
    setCart(cart.map(cartItem => {
      if (cartItem[idField] === item[idField] && cartItem.department === item.department) {
        const newQuantity = cartItem.quantity + change;
        if (newQuantity <= 0) return null;
        return { ...cartItem, quantity: newQuantity };
      }
      return cartItem;
    }).filter(Boolean));
  };

  // Calculate subtotal, discount, tax, and total
  const calculateTotals = () => {
    const discountPercent = membership?.discount_percentage || 0;
    const taxRate = 0.0825; // 8.25% Texas sales tax

    // Calculate subtotal for each department
    const cafeteriaSubtotal = cart
      .filter(i => i.department === 'cafeteria')
      .reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0);

    const giftshopSubtotal = cart
      .filter(i => i.department === 'giftshop')
      .reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0);

    const ticketsSubtotal = cart
      .filter(i => i.department === 'tickets')
      .reduce((total, item) => total + (parseFloat(item.base_price) * item.quantity), 0);

    const subtotalBeforeDiscount = cafeteriaSubtotal + giftshopSubtotal + ticketsSubtotal;

    // Apply discount to cafeteria and gift shop items (NOT tickets)
    const discountableAmount = cafeteriaSubtotal + giftshopSubtotal;
    const discountAmount = discountableAmount * (discountPercent / 100);

    const subtotalAfterDiscount = subtotalBeforeDiscount - discountAmount;

    // Calculate tax on subtotal after discount
    const tax = subtotalAfterDiscount * taxRate;

    // Final total
    const total = subtotalAfterDiscount + tax;

    return {
      subtotalBeforeDiscount,
      discountPercent,
      discountAmount,
      subtotalAfterDiscount,
      tax,
      total,
      cafeteriaSubtotal,
      giftshopSubtotal,
      ticketsSubtotal
    };
  };

  const calculateTotal = () => {
    return calculateTotals().total.toFixed(2);
  };

  const fmtMoney = (n) => `$${Number(n).toFixed(2)}`;

  const updateItemNote = (item, value) => {
    const idField = departments[item.department].idField;
    setCart(cart.map(cartItem => (
      cartItem[idField] === item[idField] && cartItem.department === item.department
        ? { ...cartItem, note: value }
        : cartItem
    )));
  };

  const openPreview = (item) => setPreviewItem({ ...item, department: activeDepartment });
  const closePreview = () => setPreviewItem(null);

  const processOrder = async () => {
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }

    setProcessing(true);

    try {
      // Group cart items by department
      const cafeteriaCartItems = cart.filter(i => i.department === 'cafeteria');
      const giftshopCartItems = cart.filter(i => i.department === 'giftshop');
      const ticketsCartItems = cart.filter(i => i.department === 'tickets');

      // Calculate discount
      const orderTotals = calculateTotals();
      const discountMultiplier = 1 - (orderTotals.discountPercent / 100);

      // Prepare unified order data
      const unifiedData = {
        customerEmail: customerEmail || 'walk-in@museum.org',
        paymentMethod,
        cafeteriaItems: cafeteriaCartItems.map(item => ({
          cafeteria_item_id: item.item_id,
          quantity: item.quantity,
          unit_price: (parseFloat(item.price) * discountMultiplier).toFixed(2),
          note: item.note || ''
        })),
        giftshopItems: giftshopCartItems.map(item => ({
          item_id: item.item_id,
          quantity: item.quantity,
          unit_price: (parseFloat(item.price) * discountMultiplier).toFixed(2)
        })),
        ticketItems: ticketsCartItems.map(item => ({
          ticket_type_id: item.ticket_type_id,
          quantity: item.quantity,
          unit_price: item.base_price
        }))
      };

      // Process unified transaction
      const res = await api.post('/api/transactions/unified-pos', unifiedData);

      // Create combined receipt with discount and tax info
      setReceipt({
        responses: [{
          type: 'unified',
          data: res.data,
          items: cart
        }],
        customerEmail: customerEmail || '',
        cashier: `${userInfo.firstName} ${userInfo.lastName}`,
        createdAt: new Date().toISOString(),
        totalAmount: orderTotals.total,
        subtotalBeforeDiscount: orderTotals.subtotalBeforeDiscount,
        subtotalAfterDiscount: orderTotals.subtotalAfterDiscount,
        discountPercent: orderTotals.discountPercent,
        discountAmount: orderTotals.discountAmount,
        tax: orderTotals.tax,
        membershipType: membership?.membership_type || null,
        paymentMethod
      });

      setCart([]);
      setCustomerEmail('');
      setMembership(null);
      setMembershipChecked(false);
    } catch (error) {
      console.error('Error processing order:', error);
      let msg = 'Failed to process order';
      
      if (error.response?.data?.error) {
        msg = error.response.data.error;
      } else if (error.response?.status === 400) {
        msg = 'Invalid order data. Please check your items and try again.';
      } else if (error.response?.status === 401) {
        msg = 'Unauthorized. Please log in again.';
      } else if (error.response?.status === 500) {
        msg = 'Server error. Please try again later or contact support.';
      } else if (error.message) {
        msg = error.message;
      }

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
    const {
      responses,
      customerEmail: custEmail,
      cashier,
      createdAt,
      totalAmount,
      subtotalBeforeDiscount,
      subtotalAfterDiscount,
      discountPercent,
      discountAmount,
      tax,
      membershipType,
      paymentMethod: payMethod
    } = receipt;
    const when = new Date(createdAt);

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        zIndex: 3000
      }}>
        <div style={{
          width: '100%',
          maxWidth: 900,
          background: '#fff',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          borderRadius: 12,
          overflow: 'hidden',
          maxHeight: 'calc(100vh - 48px)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header with museum branding */}
          <div style={{ background: 'linear-gradient(135deg, #19667C 0%, #127a86 100%)', color: '#fff', padding: 32, textAlign: 'center' }}>
            <h1 style={{ margin: 0, fontSize: 36, fontWeight: 700 }}>🎨 Museum Receipt</h1>
            <p style={{ margin: '8px 0 0 0', fontSize: 16, opacity: 0.9 }}>Transaction Confirmed</p>
          </div>

          {/* Success Banner */}
          <div style={{ background: '#ecfdf5', borderBottom: '3px solid #10b981', padding: 20, display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
            <FaCheckCircle style={{ color: '#059669', fontSize: 28 }} />
            <div style={{ color: '#065f46', fontWeight: 600, fontSize: 18 }}>Order Placed Successfully</div>
          </div>

          <div style={{ padding: 32, overflowY: 'auto' }}>
              {/* Transaction Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32, padding: '20px', background: '#f9fafb', borderRadius: 8 }}>
                <div>
                  <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Date & Time</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{when.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Payment Method</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{payMethod}</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Customer</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{custEmail || '👤 Walk-in Customer'}</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Cashier</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{cashier}</div>
                </div>
              </div>

              {/* Items Section */}
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18, color: '#111', borderBottom: '2px solid #19667C', paddingBottom: 14 }}>Order Items</h2>
                {responses.map((resp, idx) => {
                  // For unified responses, split by department
                  if (resp.type === 'unified') {
                    const cafItems = resp.items.filter(i => i.department === 'cafeteria');
                    const giftItems = resp.items.filter(i => i.department === 'giftshop');
                    const ticketItems = resp.items.filter(i => i.department === 'tickets');

                    return (
                      <div key={idx}>
                        {cafItems.length > 0 && (
                          <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #e5e7eb' }}>
                            <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 700, color: '#19667C', display: 'flex', alignItems: 'center', gap: 8 }}>
                              ☕ Cafeteria
                            </h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                              <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '2px solid #d1d5db', background: '#f9fafb' }}>
                                  <th style={{ padding: '12px 10px', fontWeight: 600, color: '#6b7280' }}>Item</th>
                                  <th style={{ padding: '12px 10px', fontWeight: 600, color: '#6b7280', textAlign: 'center', width: 60 }}>Qty</th>
                                  <th style={{ padding: '12px 10px', fontWeight: 600, color: '#6b7280', textAlign: 'right', width: 80 }}>Unit</th>
                                  <th style={{ padding: '12px 10px', fontWeight: 600, color: '#6b7280', textAlign: 'right', width: 80 }}>Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {cafItems.map((item, i) => (
                                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6', height: 44, verticalAlign: 'middle' }}>
                                    <td style={{ padding: '12px 10px', color: '#111' }}>
                                      <div style={{ fontWeight: 500 }}>{item.item_name}</div>
                                      {item.note && <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>• {item.note}</div>}
                                    </td>
                                    <td style={{ padding: '12px 10px', textAlign: 'center', color: '#6b7280' }}>{item.quantity}</td>
                                    <td style={{ padding: '12px 10px', textAlign: 'right', color: '#6b7280' }}>{fmtMoney(item.price)}</td>
                                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 600, color: '#111' }}>{fmtMoney(parseFloat(item.price) * item.quantity)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {giftItems.length > 0 && (
                          <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #e5e7eb' }}>
                            <h3 style={{ marginBottom: 12, fontSize: 16, fontWeight: 700, color: '#19667C', display: 'flex', alignItems: 'center', gap: 8 }}>
                              🎁 Gift Shop
                            </h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                              <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '2px solid #d1d5db', background: '#f9fafb' }}>
                                  <th style={{ padding: '12px 10px', fontWeight: 600, color: '#6b7280' }}>Item</th>
                                  <th style={{ padding: '12px 10px', fontWeight: 600, color: '#6b7280', textAlign: 'center', width: 60 }}>Qty</th>
                                  <th style={{ padding: '12px 10px', fontWeight: 600, color: '#6b7280', textAlign: 'right', width: 80 }}>Unit</th>
                                  <th style={{ padding: '12px 10px', fontWeight: 600, color: '#6b7280', textAlign: 'right', width: 80 }}>Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {giftItems.map((item, i) => (
                                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6', height: 44, verticalAlign: 'middle' }}>
                                    <td style={{ padding: '12px 10px', color: '#111', fontWeight: 500 }}>{item.item_name}</td>
                                    <td style={{ padding: '12px 10px', textAlign: 'center', color: '#6b7280' }}>{item.quantity}</td>
                                    <td style={{ padding: '12px 10px', textAlign: 'right', color: '#6b7280' }}>{fmtMoney(item.price)}</td>
                                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 600, color: '#111' }}>{fmtMoney(parseFloat(item.price) * item.quantity)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {ticketItems.length > 0 && (
                          <div style={{ marginBottom: 24, paddingBottom: 16 }}>
                            <h3 style={{ marginBottom: 12, fontSize: 16, fontWeight: 700, color: '#19667C', display: 'flex', alignItems: 'center', gap: 8 }}>
                              🎫 Tickets
                            </h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                              <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '2px solid #d1d5db', background: '#f9fafb' }}>
                                  <th style={{ padding: '12px 10px', fontWeight: 600, color: '#6b7280' }}>Ticket Type</th>
                                  <th style={{ padding: '12px 10px', fontWeight: 600, color: '#6b7280', textAlign: 'center', width: 60 }}>Qty</th>
                                  <th style={{ padding: '12px 10px', fontWeight: 600, color: '#6b7280', textAlign: 'right', width: 80 }}>Unit</th>
                                  <th style={{ padding: '12px 10px', fontWeight: 600, color: '#6b7280', textAlign: 'right', width: 80 }}>Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ticketItems.map((item, i) => (
                                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6', height: 44, verticalAlign: 'middle' }}>
                                    <td style={{ padding: '12px 10px', color: '#111', fontWeight: 500 }}>{item.ticket_name}</td>
                                    <td style={{ padding: '12px 10px', textAlign: 'center', color: '#6b7280' }}>{item.quantity}</td>
                                    <td style={{ padding: '12px 10px', textAlign: 'right', color: '#6b7280' }}>{fmtMoney(item.base_price)}</td>
                                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 600, color: '#111' }}>{fmtMoney(parseFloat(item.base_price) * item.quantity)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  }

              // For individual responses
              return (
                <div key={idx} style={{ marginBottom: 20 }}>
                  <h3 style={{ marginBottom: 10, textTransform: 'capitalize' }}>
                    {resp.type === 'giftshop' ? 'Gift Shop' : resp.type}
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                        <th style={{ padding: '8px 6px' }}>Item</th>
                        <th style={{ padding: '8px 6px' }}>Qty</th>
                        <th style={{ padding: '8px 6px' }}>Unit</th>
                        <th style={{ padding: '8px 6px' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resp.items.map((item, i) => {
                        const dept = departments[resp.type];
                        const name = item[dept.nameField];
                        const price = item[dept.priceField];
                        const lineTotal = parseFloat(price) * item.quantity;

                        return (
                          <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '8px 6px' }}>
                              <div>{name}</div>
                              {item.note && <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>• {item.note}</div>}
                            </td>
                            <td style={{ padding: '8px 6px' }}>{item.quantity}</td>
                            <td style={{ padding: '8px 6px' }}>{fmtMoney(price)}</td>
                            <td style={{ padding: '8px 6px', fontWeight: 600 }}>{fmtMoney(lineTotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
              </div>

              {/* Summary Section */}
              <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: 28, marginTop: 28 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
                    <span>Subtotal:</span>
                    <span>{fmtMoney(subtotalBeforeDiscount)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: 600, background: '#ecfdf5', padding: '8px 12px', borderRadius: 6 }}>
                      <span>✓ {membershipType} Discount ({discountPercent}%):</span>
                      <span>-{fmtMoney(discountAmount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
                    <span>Tax (8.25%):</span>
                    <span>{fmtMoney(tax)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #19667C', paddingTop: 12, marginTop: 12 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>TOTAL</span>
                    <span style={{ fontSize: 20, fontWeight: 700, color: '#19667C' }}>{fmtMoney(totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => {
                  setMembership(null);
                  setMembershipChecked(false);
                  setCustomerEmail('');
                  setCart([]);
                  setPaymentMethod('Credit Card');
                  setReceipt(null);
                  // Refresh items to get updated stock quantities and availability
                  fetchAllItems();
                }}
                style={{
                  width: '100%',
                  marginTop: 28,
                  padding: '16px',
                  background: 'linear-gradient(135deg, #19667C 0%, #127a86 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 18,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: '0 4px 12px rgba(25, 102, 124, 0.3)'
                }}
                onMouseOver={(e) => e.target.style.boxShadow = '0 6px 16px rgba(25, 102, 124, 0.4)'}
                onMouseOut={(e) => e.target.style.boxShadow = '0 4px 12px rgba(25, 102, 124, 0.3)'}
              >
                🛒 Start New Order
              </button>
            </div>
          </div>
        </div>
    );
  }

  // Quantity Modal Component
  const QuantityModal = () => {
    if (!quantityModal) return null;

    const { item, quantity } = quantityModal;
    const nameField = currentDept.nameField;
    const priceField = currentDept.priceField;
    const itemName = item[nameField];
    const itemPrice = item[priceField];

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: 32,
          maxWidth: 400,
          width: '90%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}>
          {/* Header */}
          <h2 style={{ margin: '0 0 8px 0', fontSize: 20, fontWeight: 700, color: '#111' }}>
            {itemName}
          </h2>
          <p style={{ margin: '0 0 24px 0', fontSize: 14, color: '#6b7280' }}>
            Price: <span style={{ fontSize: 18, fontWeight: 700, color: '#19667C' }}>
              ${parseFloat(itemPrice).toFixed(2)}
            </span>
          </p>

          {/* Quantity Selection */}
          <div style={{
            background: '#f9fafb',
            padding: 20,
            borderRadius: 8,
            marginBottom: 24,
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Quantity
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16
            }}>
              <button
                onClick={() => {
                  if (quantity > 1) {
                    setQuantityModal({ ...quantityModal, quantity: quantity - 1 });
                  }
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  border: '2px solid #19667C',
                  background: '#fff',
                  color: '#19667C',
                  fontSize: 20,
                  fontWeight: 700,
                  cursor: quantity > 1 ? 'pointer' : 'not-allowed',
                  opacity: quantity > 1 ? 1 : 0.5,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                −
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  if (val > 0) {
                    setQuantityModal({ ...quantityModal, quantity: val });
                  }
                }}
                style={{
                  width: 60,
                  height: 40,
                  fontSize: 18,
                  fontWeight: 700,
                  textAlign: 'center',
                  border: '2px solid #e5e7eb',
                  borderRadius: 6,
                  color: '#111'
                }}
              />
              <button
                onClick={() => {
                  setQuantityModal({ ...quantityModal, quantity: quantity + 1 });
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  border: '2px solid #19667C',
                  background: '#19667C',
                  color: '#fff',
                  fontSize: 20,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: 12
          }}>
            <button
              onClick={() => setQuantityModal(null)}
              style={{
                flex: 1,
                padding: 12,
                background: '#f3f4f6',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                color: '#6b7280',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#e5e7eb';
              }}
              onMouseOut={(e) => {
                e.target.style.background = '#f3f4f6';
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => confirmAddToCart(quantity)}
              style={{
                flex: 1,
                padding: 12,
                background: 'linear-gradient(135deg, #19667C 0%, #127a86 100%)',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                color: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(25, 102, 124, 0.2)'
              }}
              onMouseOver={(e) => {
                e.target.style.boxShadow = '0 6px 16px rgba(25, 102, 124, 0.3)';
              }}
              onMouseOut={(e) => {
                e.target.style.boxShadow = '0 4px 12px rgba(25, 102, 124, 0.2)';
              }}
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="employee-pos-container">
      <div className="pos-header">
        <h1>POS System</h1>
        <div className="pos-employee-info">
          Employee: {userInfo.firstName} {userInfo.lastName}
        </div>
      </div>

      {/* Department Tabs */}
      <div style={{ display: 'flex', gap: 10, padding: '0 20px', marginBottom: 10 }}>
        {Object.entries(departments).map(([key, dept]) => {
          const Icon = dept.icon;
          return (
            <button
              key={key}
              onClick={() => { setActiveDepartment(key); setSelectedCategory('All'); }}
              style={{
                padding: '12px 24px',
                background: activeDepartment === key ? '#19667C' : '#f0f0f0',
                color: activeDepartment === key ? 'white' : '#333',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600,
                transition: 'all 0.3s'
              }}
            >
              <Icon /> {dept.name}
            </button>
          );
        })}
      </div>

      <div className="pos-layout">
        {/* Left side - Menu items */}
        <div className="pos-menu-section">
          <div className="category-tabs">
            {currentDept.categories.map(category => (
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
            {filteredItems.map(item => {
              const idField = currentDept.idField;
              const nameField = currentDept.nameField;
              const priceField = currentDept.priceField;
              const availField = currentDept.availabilityField;

              // Check availability based on department
              let isAvailable = item[availField] === true || item[availField] === 1 || item[availField] === '1';

              // For gift shop, also check if stock is available
              if (activeDepartment === 'giftshop') {
                const stockQuantity = parseInt(item.stock_quantity) || 0;
                isAvailable = isAvailable && stockQuantity > 0;
              }

              // Check if this is a member ticket using Benefits table
              const ticketName = item[nameField]?.toLowerCase() || '';

              // Check if ticket name includes any membership type from Benefits table
              const isMemberTicket = activeDepartment === 'tickets' &&
                                     benefits.some(benefit =>
                                       ticketName.includes(benefit.membership_type.toLowerCase())
                                     );

              // Check if member ticket matches their membership type
              let memberTicketDisabled = false;
              if (isMemberTicket) {
                if (!membership) {
                  memberTicketDisabled = true; // No membership at all
                } else {
                  // Check if ticket name matches their membership type
                  const membershipType = membership.membership_type?.toLowerCase() || '';
                  const ticketMatchesMembership = ticketName.includes(membershipType);
                  memberTicketDisabled = !ticketMatchesMembership;
                }
              }

              const isDisabled = !isAvailable || memberTicketDisabled;

              return (
                <div
                  key={item[idField]}
                  className={`menu-item-card ${isDisabled ? 'disabled' : ''}`}
                  onClick={() => !isDisabled && addToCart(item)}
                >
                  <div className="item-name">{item[nameField]}</div>
                  <div className="item-price">${parseFloat(item[priceField]).toFixed(2)}</div>
                  {memberTicketDisabled ? (
                    <span className="availability unavailable" style={{ marginTop: 4, display: 'block' }}>Member Verification Required</span>
                  ) : isAvailable ? (
                    <span className="availability available" style={{ marginTop: 4, display: 'block' }}>
                      {activeDepartment === 'giftshop' ? `In Stock (${item.stock_quantity})` : 'Available'}
                    </span>
                  ) : (
                    <span className="availability unavailable" style={{ marginTop: 4, display: 'block' }}>
                      {activeDepartment === 'giftshop' && parseInt(item.stock_quantity || 0) === 0 ? 'Out of Stock' : 'Unavailable'}
                    </span>
                  )}
                  {activeDepartment !== 'tickets' && (
                    <div className="item-actions">
                      <button
                        className="info-btn"
                        onClick={(e) => { e.stopPropagation(); openPreview(item); }}
                        type="button"
                      >
                        Info
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Item Preview Modal */}
        {previewItem && previewItem.department !== 'tickets' && (
          <div className="modal-overlay" onClick={closePreview}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{previewItem[departments[previewItem.department].nameField]}</h3>
                <button className="modal-close" onClick={closePreview} aria-label="Close">×</button>
              </div>
              <div className="modal-content">
                <div className="modal-price">{fmtMoney(previewItem[departments[previewItem.department].priceField])}</div>
                <div className="modal-row"><strong>Description:</strong> <span>{previewItem.description || 'No description available.'}</span></div>
                {previewItem.department === 'cafeteria' && (
                  <>
                    <div className="modal-row"><strong>Calories:</strong> <span>{previewItem.calories ?? 'N/A'}</span></div>
                    <div className="modal-row"><strong>Allergen info:</strong> <span>{previewItem.allergen_info || '—'}</span></div>
                  </>
                )}
                {previewItem.department === 'giftshop' && (
                  <div className="modal-row">
                    <strong>Stock:</strong>
                    <span style={{ color: parseInt(previewItem.stock_quantity || 0) === 0 ? '#c62828' : 'inherit', fontWeight: parseInt(previewItem.stock_quantity || 0) === 0 ? '600' : 'normal' }}>
                      {parseInt(previewItem.stock_quantity || 0) === 0 ? 'Out of Stock' : previewItem.stock_quantity ?? 'N/A'}
                    </span>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button
                  className="process-order-btn"
                  onClick={() => { addToCart(previewItem); closePreview(); }}
                  disabled={(() => {
                    const dept = departments[previewItem.department];
                    const isAvailable = previewItem[dept.availabilityField] === true ||
                                       previewItem[dept.availabilityField] === 1 ||
                                       previewItem[dept.availabilityField] === '1';

                    // For gift shop, also check stock quantity
                    if (previewItem.department === 'giftshop') {
                      const stockQuantity = parseInt(previewItem.stock_quantity) || 0;
                      return !isAvailable || stockQuantity <= 0;
                    }

                    return !isAvailable;
                  })()}
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
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <input
                type="email"
                placeholder="Customer email (optional)"
                value={customerEmail}
                onChange={(e) => {
                  setCustomerEmail(e.target.value);
                  setMembershipChecked(false); // Reset when email changes
                  setMembership(null);
                }}
                className="customer-email-input"
                style={{ flex: 1 }}
              />
              <button
                onClick={fetchMembership}
                disabled={!customerEmail || !customerEmail.includes('@') || membershipLoading}
                style={{
                  padding: '10px 16px',
                  backgroundColor: !customerEmail || !customerEmail.includes('@') || membershipLoading ? '#ccc' : '#19667C',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: !customerEmail || !customerEmail.includes('@') || membershipLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  transition: 'background-color 0.3s'
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = '#145261';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = '#19667C';
                  }
                }}
              >
                {membershipLoading ? 'Checking...' : 'Check Member'}
              </button>
            </div>
            {!membershipLoading && membershipChecked && !membership && (
              <div style={{
                marginTop: 8,
                padding: 8,
                background: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: 4,
                fontSize: 13,
                color: '#856404'
              }}>
                No active membership found for this email
              </div>
            )}
            {membership && (
              <div style={{
                marginTop: 8,
                padding: 10,
                background: '#E6F3F6',
                border: '2px solid #19667C',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: '600',
                color: '#08323E'
              }}>
                ✓ Member: {membership.membership_type} ({membership.discount_percentage}% discount on food & gifts)
              </div>
            )}
          </div>

          <div className="cart-actions">
            <button
              type="button"
              className="clear-cart-btn"
              onClick={() => {
                setCart([]);
                // Keep membership and email so they can continue ordering
              }}
              disabled={cart.length === 0}
            >
              Clear Order
            </button>
          </div>

          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="empty-cart">No items in cart</div>
            ) : (
              cart.map((item, idx) => {
                const dept = departments[item.department];
                const idField = dept.idField;
                const nameField = dept.nameField;
                const priceField = dept.priceField;

                return (
                  <div key={`${item.department}-${item[idField]}-${idx}`} className="cart-item">
                    <div className="cart-item-info">
                      <span className="cart-item-name">
                        [{dept.name}] {item[nameField]}
                      </span>
                      <span className="cart-item-price">${parseFloat(item[priceField]).toFixed(2)}</span>
                    </div>
                    {/* Per-item special request (not for tickets) */}
                    {item.department !== 'tickets' && (
                      <div style={{ marginTop: 6 }}>
                        <textarea
                          placeholder="Special request"
                          value={item.note || ''}
                          onChange={(e) => updateItemNote(item, e.target.value)}
                          className="item-note-input"
                          rows={2}
                        />
                      </div>
                    )}
                    <div className="cart-item-controls">
                      <button
                        className="quantity-btn"
                        onClick={(e) => { e.stopPropagation(); updateQuantity(item, -1); }}
                      >
                        <FaMinus />
                      </button>
                      <span className="quantity">{item.quantity}</span>
                      <button
                        className="quantity-btn"
                        onClick={(e) => { e.stopPropagation(); updateQuantity(item, 1); }}
                      >
                        <FaPlus />
                      </button>
                      <button
                        className="remove-btn"
                        onClick={(e) => { e.stopPropagation(); removeFromCart(item); }}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="cart-summary">
            {(() => {
              const totals = calculateTotals();
              return (
                <>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Subtotal:</span>
                      <span>${totals.subtotalBeforeDiscount.toFixed(2)}</span>
                    </div>
                    {totals.discountAmount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#19667C', fontWeight: '600' }}>
                        <span>Member Discount ({totals.discountPercent}%):</span>
                        <span>-${totals.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Tax (8.25%):</span>
                      <span>${totals.tax.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="total">
                    <span>Total:</span>
                    <span className="total-amount">${totals.total.toFixed(2)}</span>
                  </div>
                </>
              );
            })()}

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

      {/* Quantity Modal */}
      <QuantityModal />
    </div>
  );
}

export default EmployeePOS;
