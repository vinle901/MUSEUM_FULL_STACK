// File: src/components/employee/AdminPortal.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { FaEdit, FaTrash, FaPlus, FaSave, FaTimes, FaKey } from 'react-icons/fa';
import api from '../../services/api';
import './EmployeePortal.css';
import NotificationBell from './NotificationBell';


function AdminPortal() {
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
  const [showTempPw, setShowTempPw] = useState(false);
  const [pay, setPay] = useState({
    cardNumber: '',
    expMonth: '',
    expYear: '',
    cvc: '',
  });
  // Utility: generate a secure random temporary password
const generateTempPassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*';
  const all = upper + lower + digits + symbols;

  let password = '';
  for (let i = 0; i < 10; i++) {
    password += all.charAt(Math.floor(Math.random() * all.length));
  }
  return password;
};

  // password modal
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordChangeEmployee, setPasswordChangeEmployee] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // membership sign-ups report specific
  const todayISO = new Date().toISOString().slice(0, 10);
  const twoWeeksAgoISO = new Date(Date.now() - 13 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [memberSummary, setMemberSummary] = useState({ signupCount: 0, totalAmount: 0 });
  const [activeFilter, setActiveFilter] = useState('all');
  // --- New Member modal (create) ---
  const [showCreateMember, setShowCreateMember] = useState(false);
  const PLAN_PRICES = { Individual: 70, Dual: 95, Family: 115, Patron: 200 };

  const oneYearFrom = (iso) => {
    const d = new Date(iso);
    const exp = new Date(d);
    exp.setFullYear(exp.getFullYear() + 1);
    return exp.toISOString().slice(0, 10);
  };
  
  const [newMember, setNewMember] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    subscribe_to_newsletter: false,
    membership_type: 'Individual',
    start_date: todayISO,
    expiration_date: oneYearFrom(todayISO),
    quantity: 1,
    is_active: true,
    birthdate: '',     // "YYYY-MM-DD"
    sex: '',
  });
  const [pw, setPw] = useState({
    value: '',
    confirm: '',
    show: false,
  });
  const newMemberTotal = useMemo(() => {
    const price = PLAN_PRICES[newMember.membership_type] || 0;
    const qty = Number(newMember.quantity || 0);
    return price * qty;
  }, [newMember.membership_type, newMember.quantity]);

  const openCreateMember = () => {
    const start = todayISO;
    setNewMember({
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      subscribe_to_newsletter: false,
      membership_type: 'Individual',
      start_date: start,
      expiration_date: oneYearFrom(start),
      quantity: 1,
      is_active: true,
    });
    setPay({ cardNumber: '', expMonth: '', expYear: '', cvc: '' });
    setShowCreateMember(true);
  };

  const toISO = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0,10);
  const m = String(v).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  return m ? `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}` : String(v).slice(0,10);
};

const handleCreateMember = async () => {
  try {
    const qty = Math.max(1, Number(newMember.quantity || 1));
    const generatedTempPw = generateTempPassword();
    const wantsPayment = !!(pay.cardNumber && pay.expMonth && pay.expYear && pay.cvc);

    // client-side checks
    if (!newMember.email) throw new Error('Email is required.');
    if (!newMember.first_name || !newMember.last_name) throw new Error('First/last name required.');
    if (!newMember.birthdate) throw new Error('Birthdate is required.');
    if (pw.value && pw.value !== pw.confirm) throw new Error('Passwords do not match.');

    const birthdateISO = toISO(newMember.birthdate);
    const startISO     = toISO(newMember.start_date);
    const endISO       = toISO(newMember.expiration_date);
    const chosenPassword = pw.value || generatedTempPw;

    if (wantsPayment) {
      await api.post('/api/reports/membership-signups/checkout', {   // NOTE: no leading /api
        users: {
          first_name: newMember.first_name,
          last_name: newMember.last_name,
          email: newMember.email.trim().toLowerCase(),
          phone_number: newMember.phone_number || null,
          subscribe_to_newsletter: !!newMember.subscribe_to_newsletter,
          temp_password: chosenPassword,
          birthdate: birthdateISO,      // normalized
          sex: newMember.sex || null,
        },
        membership: {
          membership_type: newMember.membership_type,
          start_date: startISO,         // normalized
          expiration_date: endISO,      // normalized
          quantity: qty,
        },
        payment: {
          amount: newMemberTotal, // server will revalidate anyway
          cardNumber: pay.cardNumber.replace(/\s+/g, ''),
          expMonth: pay.expMonth,
          expYear: pay.expYear,
          cvc: pay.cvc,
        },
      });
    } else {
      await api.post('reports/membership-signups/checkout', {
        users: {
          first_name: newMember.first_name,
          last_name:  newMember.last_name,
          email:      newMember.email.trim().toLowerCase(),
          phone_number: newMember.phone_number || null,
          subscribe_to_newsletter: !!newMember.subscribe_to_newsletter,
          temp_password: chosenPassword,
          birthdate: birthdateISO,
          sex: newMember.sex || null,
        },
        membership: {
          membership_type: newMember.membership_type,
          start_date: startISO,
          expiration_date: endISO,
          quantity: qty,
        },
      });
    }

    // show temp password and reset
    setNewPassword(chosenPassword);  
    setConfirmPassword('');
    setShowPasswordModal(true);
    await fetchItems();
    alert('Member(s) created successfully');
  } catch (err) {
    console.error('Create member failed:', err);
    // bubble up exact backend message if available
    alert(err?.response?.data?.error || err.message || 'Failed to create member(s)');
  }
};


  // ---- Member edit modal state ----
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberForm, setMemberForm] = useState({
    membership_id: null,
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    subscribe_to_newsletter: false,
    membership_type: '',
    start_date: '',
    expiration_date: '',
    is_active: true,
    charge_amount: '',
    card_number: '',
    card_exp_month: '',
    card_exp_year: '',
    card_cvc: '',
  });

  const openMemberModal = (r) => {
    setMemberForm({
      membership_id: r.primary_membership_id,
      first_name: r.first_name || '',
      last_name: r.last_name || '',
      email: r.email || '',
      phone_number: (r.phone_number && r.phone_number !== '—') ? r.phone_number : '',
      subscribe_to_newsletter: !!r.subscribe_to_newsletter,
      membership_type: r.membership_type || '',
      start_date: '', // unknown in list; admin can set if they want
      expiration_date: r.expiration_date ? r.expiration_date.slice(0,10) : '',
      is_active: !!r.is_active,

      charge_amount: '',
      card_number: '',
      card_exp_month: '',
      card_exp_year: '',
      card_cvc: '',
    });
    setShowMemberModal(true);
  };

  const closeMemberModal = () => {
    setShowMemberModal(false);
    setMemberForm((f) => ({ ...f, charge_amount: '', card_number: '', card_exp_month: '', card_exp_year: '', card_cvc: '' }));
  };

  const handleMemberField = (field, value) => {
    setMemberForm((f) => ({ ...f, [field]: value }));
  };

  const submitMemberUpdate = async () => {
    try {
      // 1) Update user + membership
      await api.put(`/api/reports/membership-signups/member/${memberForm.membership_id}`, {
        first_name: memberForm.first_name,
        last_name: memberForm.last_name,
        email: memberForm.email,
        phone_number: memberForm.phone_number,
        subscribe_to_newsletter: !!memberForm.subscribe_to_newsletter,
        membership_type: memberForm.membership_type,
        start_date: memberForm.start_date || null,
        expiration_date: memberForm.expiration_date || null,
        is_active: !!memberForm.is_active,
      });

      // 2) Optional payment (only if an amount is entered)
      const amt = parseFloat(memberForm.charge_amount || '0');
      if (amt > 0) {
        await api.post('/api/payments/charge', {
          membership_id: memberForm.membership_id,
          amount: Math.round(amt * 100), // cents
          card: {
            number: memberForm.card_number,
            exp_month: memberForm.card_exp_month,
            exp_year: memberForm.card_exp_year,
            cvc: memberForm.card_cvc,
          },
          reason: 'Membership update charge',
        });
        alert('Member updated and payment processed.');
      } else {
        alert('Member updated.');
      }

      closeMemberModal();
      await fetchItems();
    } catch (err) {
      console.error('Member update error:', err);
      alert(err.response?.data?.error || err.message || 'Failed to update member');
    }
  };

  const tabs = [
    // Core data - needed by other entities
    { id: 'employees', label: 'Employees', endpoint: '/api/employees' },
    { id: 'artists', label: 'Artists', endpoint: '/api/artists' },
    
    // Content that depends on artists/employees
    { id: 'artworks', label: 'Artworks', endpoint: '/api/artworks' },
    { id: 'exhibitions', label: 'Exhibitions', endpoint: '/api/exhibitions' },
    { id: 'events', label: 'Museum Events', endpoint: '/api/events' },
    
    // Visitor services
    { id: 'tickets', label: 'Ticket Types', endpoint: '/api/tickets/types' },
    { id: 'giftshop', label: 'Gift Shop Items', endpoint: '/api/giftshop' },
    { id: 'cafeteria', label: 'Cafeteria Items', endpoint: '/api/cafeteria' },

    // Reports (read-only)
    { id: 'membersignups', label: 'Membership Sign-ups', endpoint: '/api/reports/membership-signups' },
  ];

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

  const fetchItems = async (override = {}) => {
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
        const sRaw = (override.startDate ?? startDate) || '';
        const eRaw = (override.endDate   ?? endDate) || '';
        let s = sRaw, e = eRaw;
       if (s && !e) e = s;
       if (e && !s) s = e;
       const params = {};
       if (s) params.startDate = s;
       if (e) params.endDate   = e;
        const { data } = await api.get(url, { params });
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
  const toLocalYMD = (dLike) => {
    const d = dLike instanceof Date ? dLike : new Date(dLike);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const joinTimes = (dates) => {
  // dates: array of JS Date objects (same day)
    const times = dates
      .sort((a, b) => a - b)
      .map(d => d.toLocaleTimeString()); // keep your current locale format
    if (times.length <= 1) return times[0] || '';
    if (times.length === 2) return `${times[0]} and ${times[1]}`;
    // 3+ -> "a, b, c and d"
    return `${times.slice(0, -1).join(', ')} and ${times[times.length - 1]}`;
  };
  // membership sign-ups aggregation by day (client-side grouping)
  const membershipAgg = useMemo(() => {
  if (activeTab !== 'membersignups') return { groups: [], overall: 0, signupCount: 0 };

  const sourceRows = (items || []).filter(r => {
    if (activeFilter === 'all') return true;
    return activeFilter === 'active' ? !!r.is_active : !r.is_active;
  });

  const byDay = new Map();
  let overall = 0;

  for (const r of sourceRows) {
    const when = r.purchased_at || r.created_at;
    const dateKey = toLocalYMD(when);                 // ✅ no UTC shift
    if (!byDay.has(dateKey)) byDay.set(dateKey, []);
    byDay.get(dateKey).push(r);
    overall += Number(r.line_total ?? r.amount_paid ?? 0);
  }

  const groups = Array.from(byDay.entries()).map(([date, rows]) => {
    // ensure stable order so “latest” really is latest
    rows.sort((a, b) => new Date(a.purchased_at || a.created_at) - new Date(b.purchased_at || b.created_at));

    const byPersonPlan = new Map();

    rows.forEach((r) => {
      const firstName = r.first_name || '';
      const lastName  = r.last_name  || '';
      const email     = (r.email || '').toLowerCase();
      const plan      = r.membership_type || 'Unknown';

      // key by email + plan (names may change, so don't lock the key to them)
      const k = `${email}|${plan}`;

      const purchaseDate = new Date(r.purchased_at || r.created_at);
      const expDate      = r.expiration_date ? new Date(r.expiration_date) : null;

      if (!byPersonPlan.has(k)) {
        byPersonPlan.set(k, {
          key: k,
          // seed identity from first row
          first_name: firstName,
          last_name: lastName,
          email: r.email,
          phone_number: r.phone_number ?? '—',
          subscribe_to_newsletter: !!r.subscribe_to_newsletter,
          membership_type: plan,
          user_id: r.user_id ?? r.userId ?? null,
          count: 0,
          total: 0,
          times: [],
          membership_ids: [],
          latest: { id: r.membership_id, when: purchaseDate, is_active: !!r.is_active, row: r },
          expiration_date: r.expiration_date || null,
          _expiration_ts: expDate ? expDate.getTime() : null,
        });
      }

      const agg = byPersonPlan.get(k);
      agg.count += 1;
      agg.total += Number(r.line_total ?? r.amount_paid ?? 0);
      agg.times.push(purchaseDate);
      agg.membership_ids.push(r.membership_id);

      // update latest purchase
      if (!agg.latest || purchaseDate > agg.latest.when) {
        agg.latest = { id: r.membership_id, when: purchaseDate, is_active: !!r.is_active, row: r };
      }

      // keep the *most recent* identity info so names/emails/phone don’t go stale
      if (agg.latest && agg.latest.row === r) {
        agg.first_name = firstName;
        agg.last_name  = lastName;
        agg.email      = r.email;
        agg.phone_number = r.phone_number ?? '—';
        agg.subscribe_to_newsletter = !!r.subscribe_to_newsletter;
      }

      // keep max expiration
      if (expDate) {
        const ts = expDate.getTime();
        if (agg._expiration_ts == null || ts > agg._expiration_ts) {
          agg._expiration_ts = ts;
          agg.expiration_date = r.expiration_date;
        }
      }
    });

    const consolidated = Array.from(byPersonPlan.values()).map(x => ({
      ...x,
      line_total: x.total,
      purchased_times_text: joinTimes(x.times),
      primary_membership_id: x.latest?.id || x.membership_ids?.[0] || null,
      is_active: x.latest?.is_active ?? false,
    }));

    return [date, consolidated];
  })
  // newest day first
  .sort((a, b) => (a[0] < b[0] ? 1 : -1));

  return { groups, overall, signupCount: sourceRows.length };
}, [activeTab, items, activeFilter]);

  // Replace your handleSetMembershipActive with this:
  const handleSetMembershipActive = async (membershipId, newActive) => {
    
    // Optimistic UI update
    setItems(prev =>
      prev.map(r =>
        r.membership_id === membershipId ? { ...r, is_active: !!newActive } : r
      )
    );

    // Find the full row so we can send required fields (email, dates, etc.)
    const row = (items || []).find(r => r.membership_id === membershipId);
    if (!row) {
      console.error('Row not found for membership_id', membershipId);
      return;
    }

    const toISO = (d) => {
      if (!d) {
        // fallback to today's date if missing
        const today = new Date();
        return today.toISOString().slice(0, 10); // YYYY-MM-DD
      }
      return String(d).slice(0, 10);
    };

    const temp = Math.random().toString(36).slice(2, 10) + "A!1"; // backend requires temp_password
    const normalizeSexForSend = (v) => {
      if (v == null) return undefined;
      const s = String(v).trim().toUpperCase();
      if (s === 'M' || s === 'F' || s === 'O') return s; // keep only known single letters
      return undefined; // anything else: don't send it
    };

    const sexSafe = normalizeSexForSend(row.sex);
    const payload = {
      email: row.email,
      first_name: row.first_name ?? "",
      last_name: row.last_name ?? "",
      temp_password: temp,
      membership_id: membershipId,
      is_active: !!newActive,
      membership_type: row.membership_type,
      start_date: toISO(row.start_date),
      expiration_date: toISO(row.expiration_date),
      ...(sexSafe ? { sex: sexSafe } : {}),
      phone_number: row.phone_number ?? null,
      subscribe_to_newsletter: !!row.subscribe_to_newsletter,
      birthdate: toISO(row.birthdate),
    };

    try {
      const res = await api.post('/api/reports/membership-signups/member', payload);

      // Align with server response if it returns the final membership
      const isActiveFromServer = res?.data?.membership?.is_active;
      if (typeof isActiveFromServer === 'boolean') {
        setItems(prev =>
          prev.map(r =>
            r.membership_id === membershipId ? { ...r, is_active: isActiveFromServer } : r
          )
        );
      }

      // Optional: re-fetch to stay perfectly in sync
      // await fetchItems();
    } catch (error) {
      // rollback optimistic change on error
      setItems(prev =>
        prev.map(r =>
          r.membership_id === membershipId ? { ...r, is_active: !newActive } : r
        )
      );
      console.error('Toggle active failed:', error);
      alert(error.response?.data?.error || 'Failed to update membership status');
    }
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

  const handlePasswordChangeClick = (employee) => {
    setPasswordChangeEmployee(employee);
    setShowPasswordModal(true);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const handlePasswordChange = async () => {
    setPasswordError('');

    // Validation
    if (!newPassword || !confirmPassword) {
      setPasswordError('Both password fields are required');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    try {
      await api.post(`/api/employees/${passwordChangeEmployee.employee_id}/change-password`, {
        newPassword
      });
      
      alert('Password changed successfully! Employee will be required to change it on next login.');
      setShowPasswordModal(false);
      setPasswordChangeEmployee(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError(error.response?.data?.error || 'Failed to change password');
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
        const users = JSON.parse(localStorage.getItem('users') || '{}');
        if (users.employeeId && !editingItem) {
          // Only set curator for new artworks, not when editing
          dataToSave.curated_by_employee_id = users.employeeId;
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
  
  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setActiveFilter('all');
    // No need to call fetchItems(): the useEffect on [startDate, endDate] will run.
  };
  
  // ---------- tables ----------
  const renderItemsTable = () => {
    if (loading) return <div className="loading">Loading...</div>;
    
    // Membership Sign-ups report (read-only)
    if (activeTab === 'membersignups') {
      const groups = membershipAgg.groups;
      const overallClient = membershipAgg.overall;
      const overallServer = memberSummary.totalAmount;
      const overall = (overallServer || overallClient);

      return (
        <>
          <div className="admin-filter-group" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="filter-field">
                <label className="form-label mb-1">Active</label>
                <select
                  className="form-control"
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  style={{ height: '38px', borderRadius: '6px', border: '1px solid #d1d5db', padding: '0 8px', backgroundColor: '#fff' }}
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="filter-field">
                <label className="form-label mb-1">Start date</label>
                <input type="date" className="form-control" value={startDate || ''} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="filter-field">
                <label className="form-label mb-1">End date</label>
                <input type="date" className="form-control" value={endDate || ''} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <button className="btn btn-primary" style={{ height: '38px', marginTop: '22px', background: '	#eaa49c', color: '#ffffffff', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0 12px' }} onClick={() => fetchItems({})}>Apply</button>
               <button
                  className="btn"
                  style={{
                    height: '38px',
                    marginTop: '22px',
                    background: '	#f3e7d6',
                    color: '#374151',
                    border: '1px solid 	#f3e7d6',
                    borderRadius: '6px',
                    padding: '0 12px'
                  }}
                  onClick={handleResetFilters}
                >
                  Reset
                </button>
              <div style={{ marginLeft: 'auto', fontWeight: '700', textAlign: 'right', marginRight: '30px', fontSize: '1.1rem', lineHeight: '1.2' }}>
                Overall Total: {fmtMoney(overall)} &nbsp;•&nbsp; Sign-ups: {memberSummary.signupCount}
              </div>
              <button
                className="add-item-btn"
                onClick={openCreateMember}
                title="Add New Member"
              >
                + Add New Member
              </button>

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
                          <th>User ID</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Plan</th>
                          <th>Quantity</th>
                          <th>Newsletter</th>
                          <th>Amount</th>
                          <th>Expiration Date</th>
                          <th>Purchased At</th>
                          <th>Active</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={`${date}-${(r.membership_id ?? r.user_id ?? r.email ?? 'x')}-${i}`}>
                            <td>{r.user_id ?? '—'}</td>
                            <td>{r.first_name} {r.last_name}</td>
                            <td>{r.email}</td>
                            <td>{r.phone_number}</td>
                            <td>{r.membership_type}</td>
                            <td>{r.count}</td>
                            <td>{r.subscribe_to_newsletter ? 'Yes' : 'No'}</td>
                            <td>{fmtMoney(r.line_total)}</td>
                            <td>{r.expiration_date ? new Date(r.expiration_date).toLocaleDateString() : '—'}</td>
                            <td>{r.purchased_times_text}</td>
                            <td>
                             <select
                               value={r.is_active ? '1' : '0'}
                               onChange={(e) => handleSetMembershipActive(r.primary_membership_id, e.target.value === '1')}
                               className={`status-select ${r.is_active ? 'is-active' : 'is-inactive'}`}
                             >
                               <option value="1">Active</option>
                              <option value="0">Inactive</option>
                             </select>
                           </td>
                            <td>
                              <button
                                className="edit-btn"
                                title="Edit"
                                onClick={() => {openMemberModal(r)}}
                              >
                                <FaEdit />
                              </button>
                            </td>
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
              {items.map(item => (
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
              {items.map(item => (
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
                    <button 
                      onClick={() => handlePasswordChangeClick(item)} 
                      className="edit-btn"
                      title="Change Password"
                      style={{ backgroundColor: '#fbbf24', marginLeft: '5px' }}
                    >
                      <FaKey />
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
                setEditingItem(null);
                setFormData({});
                setSelectedImageFile(null);
              }}
              className="add-item-btn"
            >
              <FaPlus /> Add New Item
            </button>
          </div>
        )}

        {(showAddForm || editingItem) ? (
          <div className="create-member-overlay">
            <div className="bg-white/95 rounded-2xl shadow-2xl max-w-3xl w-full border border-gray-200/60 p-0 create-member-card">
              {/* Header (matches Add New Member look) */}
              <div className="p-6 border-b border-gray-200/70">
                <div className="header flex items-center gap-3 px-6 py-4 border-b">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ background: 'linear-gradient(135deg,#19667C,#127a86)' }}
                  >
                    {editingItem ? <FaEdit /> : <FaPlus />}
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {editingItem
                      ? `Edit ${currentTab?.label?.replace(/s$/, '') || 'Item'}`
                      : `Add New ${currentTab?.label?.replace(/s$/, '') || 'Item'}`}
                  </h2>

                  <button
                    aria-label="Close"
                    className="member-modal-close"
                    onClick={handleCancel}
                    style={{ marginLeft: 'auto' }}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="currentColor" d="M6.7 5.3 5.3 6.7 10.6 12l-5.3 5.3 1.4 1.4L12 13.4l5.3 5.3 1.4-1.4L13.4 12l5.3-5.3-1.4-1.4L12 10.6z"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Scrollable content: render your existing form as-is */}
              <div className="p-6 create-member-scroll modal-like">
                {renderForm()}
              </div>

              {/* Sticky footer with unified Save/Cancel (hide inner buttons via CSS below) */}
              <div className="create-member-footer px-6 py-4">
                <div className="flex items-center justify-end gap-3">
                  <button onClick={handleSave} className="btn-primary">Save</button>
                  <button onClick={handleCancel} className="btn-secondary">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          renderItemsTable()
        )}

      </div>

      {/* Password Change Modal */}
      {showPasswordModal && passwordChangeEmployee && (
        <div className="fixed inset-0 bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-200/50">
            <div className="flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4" style={{ background: 'linear-gradient(to bottom right, #19667C, #127a86)' }}>
              <FaKey className="text-white text-2xl" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
              Change Password
            </h2>
            <p className="text-gray-600 mb-4 text-center">
              Changing password for <strong>{passwordChangeEmployee.first_name} {passwordChangeEmployee.last_name}</strong>
            </p>
            <p className="text-sm text-amber-600 mb-6 text-center bg-amber-50 p-3 rounded-lg border border-amber-200">
              Employee will be required to change this password on their next login.
            </p>

            <div className="space-y-4">
              {passwordError && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-r shadow-sm">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm">{passwordError}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password:
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoFocus
                  minLength="8"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                  style={{ '--tw-ring-color': '#19667C' }}
                />
                <small className="text-xs text-gray-500 mt-1.5 block">Must be at least 8 characters</small>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password:
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                  style={{ '--tw-ring-color': '#19667C' }}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handlePasswordChange}
                  className="flex-1 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(to right, #19667C, #127a86)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #145261, #19667C)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #19667C, #127a86)'}
                >
                  Change Password
                </button>
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordChangeEmployee(null);
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError('');
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Create Member Modal */}

      {showCreateMember && (
        
        <div className="create-member-overlay">
        {/* add a class for our CSS */}
        <div className="bg-white/95 rounded-2xl shadow-2xl max-w-3xl w-full border border-gray-200/60 p-0 create-member-card">
          {/* header (kept fixed at top of card) */}
          <div className="p-6 border-b border-gray-200/70">
            <div className="header flex items-center gap-3 px-6 py-4 border-b">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ background: 'linear-gradient(135deg,#19667C,#127a86)' }}>
                +
              </div>
              <h2 className="text-xl font-bold text-gray-800">Add New Member</h2>
            </div>
          </div>

          {/* scrollable content */}
          <div className="p-6 create-member-scroll">
            {/* ————— Member fields ————— */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label mb-1">First name</label>
                <input
                  className="form-control"
                  value={newMember.first_name}
                  onChange={(e) => setNewMember(m => ({ ...m, first_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label mb-1">Last name</label>
                <input
                  className="form-control"
                  value={newMember.last_name}
                  onChange={(e) => setNewMember(m => ({ ...m, last_name: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="form-label mb-1">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={newMember.email}
                  onChange={(e) => setNewMember(m => ({ ...m, email: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="form-label mb-1">Phone</label>
                <input
                  className="form-control"
                  value={newMember.phone_number}
                  onChange={(e) => setNewMember(m => ({ ...m, phone_number: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label mb-1">Birthdate</label>
                <input
                  type="date"
                  className="form-control"
                  value={newMember.birthdate}
                  onChange={(e) =>
                    setNewMember(m => ({ ...m, birthdate: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="form-label mb-1">Gender</label>
                <select
                  className="form-control"
                  value={newMember.sex}
                  onChange={(e) =>
                    setNewMember(m => ({ ...m, sex: e.target.value }))
                  }
                >
                  <option value="">Select…</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option>Non-binary</option>
                  <option>Prefer not to say</option>
                </select>
              </div>
            </div>

            {/* ——— Password (optional: if blank, we’ll auto-generate) ——— */}
            <h3 className="section-title mt-6">Account Password</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label mb-1">Password</label>
                <div className="relative">
                  <input
                    type={pw.show ? 'text' : 'password'}
                    className="form-control pr-20"
                    value={pw.value}
                    onChange={(e) => setPw(p => ({ ...p, value: e.target.value }))}
                    placeholder="Leave blank to auto-generate"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-sm px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                    onClick={() => setPw(p => ({ ...p, show: !p.show }))}
                  >
                    {pw.show ? 'Hide' : 'Show'}
                  </button>
                </div>
                <small className="text-xs text-gray-500">Min 8 characters recommended.</small>
              </div>

              <div>
                <label className="form-label mb-1">Confirm Password</label>
                <input
                  type={pw.show ? 'text' : 'password'}
                  className="form-control"
                  value={pw.confirm}
                  onChange={(e) => setPw(p => ({ ...p, confirm: e.target.value }))}
                  placeholder="Repeat password (if set)"
                />
              </div>
            </div>

            {/* ————— Membership ————— */}
            <h3 className="section-title mt-6">Membership</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label mb-1">Plan</label>
                <div className="flex gap-2">
                  <select
                    className="form-control"
                    value={newMember.membership_type}
                    onChange={(e) => setNewMember(m => ({ ...m, membership_type: e.target.value }))}
                  >
                    {Object.keys(PLAN_PRICES).map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <div className="chip-price">${PLAN_PRICES[newMember.membership_type] || 0}</div>
                </div>
              </div>

              <div>
                <label className="form-label mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  value={newMember.quantity}
                  onChange={(e) =>
                    setNewMember(m => ({
                      ...m,
                      quantity: Math.max(1, Number(e.target.value || 1))
                    }))
                  }
                />
              </div>

              <div>
                <label className="form-label mb-1">Start date</label>
                <input
                  type="date"
                  className="form-control"
                  value={newMember.start_date}
                  onChange={(e) => {
                    const start = e.target.value;
                    setNewMember(m => ({
                      ...m,
                      start_date: start,
                      expiration_date: oneYearFrom(start || todayISO),
                    }));
                  }}
                />
              </div>

              <div>
                <label className="form-label mb-1">Expiration date</label>
                <input
                  type="date"
                  className="form-control"
                  value={newMember.expiration_date}
                  onChange={(e) => setNewMember(m => ({ ...m, expiration_date: e.target.value }))}
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-2 mt-1">
                <input
                  id="nm-news"
                  type="checkbox"
                  checked={!!newMember.subscribe_to_newsletter}
                  onChange={(e) => setNewMember(m => ({ ...m, subscribe_to_newsletter: e.target.checked }))}
                />
                <label htmlFor="nm-news" className="text-sm text-gray-700">Subscribe to newsletter</label>
              </div>
            </div>

            {/* ————— Payment ABOVE the buttons ————— */}
            <h3 className="section-title mt-6 flex items-center justify-between">
              <span>Payment (optional)</span>
              <span className="text-sm text-gray-500">
                Total: <strong>${newMemberTotal.toFixed(2)}</strong>
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="form-label mb-1">Card number</label>
                <input
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="4242 4242 4242 4242"
                  className="form-control"
                  value={pay.cardNumber}
                  onChange={(e) => setPay(p => ({ ...p, cardNumber: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label mb-1">Exp. month</label>
                <input
                  inputMode="numeric"
                  placeholder="MM"
                  className="form-control"
                  value={pay.expMonth}
                  onChange={(e) => setPay(p => ({ ...p, expMonth: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label mb-1">Exp. year</label>
                <input
                  inputMode="numeric"
                  placeholder="YYYY"
                  className="form-control"
                  value={pay.expYear}
                  onChange={(e) => setPay(p => ({ ...p, expYear: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="form-label mb-1">CVC</label>
                <input
                  inputMode="numeric"
                  placeholder="CVC"
                  className="form-control"
                  value={pay.cvc}
                  onChange={(e) => setPay(p => ({ ...p, cvc: e.target.value }))}
                />
                <small className="text-xs text-gray-500">
                  Leave payment blank to only create the member record(s).
                </small>
              </div>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              Note: This form creates the membership record(s).
            </p>
          </div>

          {/* sticky footer with Save / Cancel at the very bottom */}
          <div className="create-member-footer px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Total preview:&nbsp;
                <strong>${newMemberTotal.toFixed(2)}</strong>
                <span className="text-gray-400"> (price auto-calculated by plan × quantity)</span>
              </div>
              <div className="flex gap-3">
                <button onClick={handleCreateMember} className="btn-primary">Save</button>
                <button onClick={() => setShowCreateMember(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      )}

      {showMemberModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="member-modal-card">
            {/* Header */}
            <div className="member-modal-header">
              <div className="member-modal-avatar">
                <FaEdit className="text-white text-xl" />
              </div>
              <div className="text-center">
                <h2 className="member-modal-title">Edit Member</h2>
                <div className="member-modal-subtitle">
                  Membership&nbsp;<strong>#{memberForm.membership_id}</strong>
                </div>
              </div>
              <button
                aria-label="Close"
                className="member-modal-close"
                onClick={closeMemberModal}
              >
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M6.7 5.3 5.3 6.7 10.6 12l-5.3 5.3 1.4 1.4L12 13.4l5.3 5.3 1.4-1.4L13.4 12l5.3-5.3-1.4-1.4L12 10.6z"/></svg>
              </button>
            </div>

            {/* Content */}
            <div className="member-modal-content">
              {/* Basic info */}
              <div className="member-section">
                <h3 className="member-section-title">Member details</h3>
                <div className="member-grid">
                  <div className="field">
                    <label className="field-label">First name</label>
                    <input
                      className="field-input"
                      value={memberForm.first_name}
                      onChange={(e) => handleMemberField('first_name', e.target.value)}
                      placeholder="First name"
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">Last name</label>
                    <input
                      className="field-input"
                      value={memberForm.last_name}
                      onChange={(e) => handleMemberField('last_name', e.target.value)}
                      placeholder="Last name"
                    />
                  </div>
                  <div className="field md:col-span-2">
                    <label className="field-label">Email</label>
                    <input
                      type="email"
                      className="field-input"
                      value={memberForm.email}
                      onChange={(e) => handleMemberField('email', e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>
                  <div className="field md:col-span-2">
                    <label className="field-label">Phone</label>
                    <input
                      className="field-input"
                      value={memberForm.phone_number}
                      onChange={(e) => handleMemberField('phone_number', e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              {/* Membership controls */}
              <div className="member-section">
                <h3 className="member-section-title">Membership</h3>
                <div className="member-grid">
                  <div className="field">
                    <label className="field-label">Plan</label>
                    <select
                      className="field-input"
                      value={memberForm.membership_type}
                      onChange={(e) => handleMemberField('membership_type', e.target.value)}
                    >
                      <option value="">Select plan</option>
                      <option value="Individual">Individual</option>
                      <option value="Family">Family</option>
                      <option value="Student">Student</option>
                      <option value="Senior">Senior</option>
                    </select>
                  </div>

                  <div className="field">
                    <label className="field-label">Status</label>
                    <select
                      className="field-input"
                      value={memberForm.is_active ? '1' : '0'}
                      onChange={(e) => handleMemberField('is_active', e.target.value === '1')}
                    >
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
                    </select>
                  </div>

                  <div className="field">
                    <label className="field-label">Start date</label>
                    <input
                      type="date"
                      className="field-input"
                      value={memberForm.start_date}
                      onChange={(e) => handleMemberField('start_date', e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label className="field-label">Expiration date</label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        className="field-input flex-1"
                        value={memberForm.expiration_date || ''}
                        onChange={(e) => handleMemberField('expiration_date', e.target.value)}
                      />
                      <button
                        type="button"
                        className="chip-btn"
                        onClick={() => {
                          const base = memberForm.expiration_date
                            ? new Date(memberForm.expiration_date)
                            : new Date();
                          base.setMonth(base.getMonth() + 12);
                          handleMemberField('expiration_date', base.toISOString().slice(0, 10));
                        }}
                      >
                        +12 mo
                      </button>
                      <button
                        type="button"
                        className="chip-btn"
                        onClick={() => {
                          const base = memberForm.expiration_date
                            ? new Date(memberForm.expiration_date)
                            : new Date();
                          base.setMonth(base.getMonth() + 1);
                          handleMemberField('expiration_date', base.toISOString().slice(0, 10));
                        }}
                      >
                        +1 mo
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-2 flex items-center gap-2 mt-1">
                    <input
                      id="mf-news"
                      type="checkbox"
                      checked={!!memberForm.subscribe_to_newsletter}
                      onChange={(e) => handleMemberField('subscribe_to_newsletter', e.target.checked)}
                    />
                    <label htmlFor="mf-news" className="text-sm text-gray-700">
                      Subscribe to newsletter
                    </label>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="member-section">
                <div className="member-section-title flex items-center justify-between">
                  <span>Optional payment</span>
                  <span className="hint">Leave blank to only update info</span>
                </div>
                <div className="member-grid">
                  <div className="field">
                    <label className="field-label">Charge amount (USD)</label>
                    <div className="input-with-prefix">
                      <span className="prefix">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="field-input no-left-radius"
                        value={memberForm.charge_amount}
                        onChange={(e) => handleMemberField('charge_amount', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="field md:col-span-1">
                    <label className="field-label">Card number</label>
                    <input
                      inputMode="numeric"
                      className="field-input"
                      placeholder="4242 4242 4242 4242"
                      value={memberForm.card_number}
                      onChange={(e) => handleMemberField('card_number', e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label className="field-label">Exp. month</label>
                    <input
                      inputMode="numeric"
                      className="field-input"
                      placeholder="MM"
                      value={memberForm.card_exp_month}
                      onChange={(e) => handleMemberField('card_exp_month', e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label className="field-label">Exp. year</label>
                    <input
                      inputMode="numeric"
                      className="field-input"
                      placeholder="YYYY"
                      value={memberForm.card_exp_year}
                      onChange={(e) => handleMemberField('card_exp_year', e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label className="field-label">CVC</label>
                    <input
                      inputMode="numeric"
                      className="field-input"
                      placeholder="CVC"
                      value={memberForm.card_cvc}
                      onChange={(e) => handleMemberField('card_cvc', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="member-modal-footer">
              <button className="primary-btn" onClick={submitMemberUpdate}>
                Save changes
              </button>
              <button className="secondary-btn" onClick={closeMemberModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

export default AdminPortal;