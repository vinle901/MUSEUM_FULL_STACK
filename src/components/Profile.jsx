import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [expandedTransaction, setExpandedTransaction] = useState(null);
  const [transactionDetails, setTransactionDetails] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    address: "",
    subscribe_to_newsletter: false,
  });

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
    fetchTransactions();
  }, []);

  async function fetchProfile() {
    try {
      setLoading(true);
      setError("");
      
      const res = await api.get("/api/users/profile");

      setProfile(res.data);

      // Initialize form data
      setFormData({
        first_name: res.data.first_name || "",
        last_name: res.data.last_name || "",
        email: res.data.email || "",
        phone_number: res.data.phone_number || "",
        address: res.data.address || "",
        subscribe_to_newsletter: res.data.subscribe_to_newsletter || false,
      });
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  async function fetchTransactions() {
    try {
      setLoadingTransactions(true);
      const userId = JSON.parse(localStorage.getItem("user") || "{}").id;
      
      if (!userId) return;
      
      const res = await api.get(`/api/transactions/user/${userId}`);
      setTransactions(res.data || []);
    } catch (err) {
      console.error("Failed to load transactions:", err);
      // Don't show error for transactions as it's not critical
    } finally {
      setLoadingTransactions(false);
    }
  }

  async function fetchTransactionDetails(transactionId) {
    if (transactionDetails[transactionId]) {
      // Already loaded, just toggle
      setExpandedTransaction(expandedTransaction === transactionId ? null : transactionId);
      return;
    }

    try {
      setLoadingDetails(prev => ({ ...prev, [transactionId]: true }));
      const res = await api.get(`/api/transactions/${transactionId}`);
      console.log('Transaction details response:', res.data);
      setTransactionDetails(prev => ({ ...prev, [transactionId]: res.data }));
      setExpandedTransaction(transactionId);
    } catch (err) {
      console.error("Failed to load transaction details:", err);
      console.error("Error response:", err.response?.data);
      const errorMessage = err.response?.data?.error || err.message || "Unknown error occurred";
      setError("Failed to load transaction details: " + errorMessage);
      setTimeout(() => setError(""), 5000); // Clear error after 5 seconds
    } finally {
      setLoadingDetails(prev => ({ ...prev, [transactionId]: false }));
    }
  }

  function toggleTransactionDetails(transactionId) {
    if (expandedTransaction === transactionId) {
      setExpandedTransaction(null);
    } else {
      fetchTransactionDetails(transactionId);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validation
    if (!formData.first_name || !formData.last_name || !formData.email) {
      setError("First name, last name, and email are required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);

      // Interceptor handles auth token and 401 errors automatically
      await api.put("/api/users/profile", formData);

      // Refetch full profile to get membership data
      await fetchProfile();

      setSuccess("Profile updated successfully!");
      setEditing(false);

      // Update user in localStorage
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      storedUser.email = formData.email;
      storedUser.first_name = formData.first_name;
      storedUser.last_name = formData.last_name;
      localStorage.setItem("user", JSON.stringify(storedUser));
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    // Reset form to current profile data
    if (profile) {
      setFormData({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        email: profile.email || "",
        phone_number: profile.phone_number || "",
        address: profile.address || "",
        subscribe_to_newsletter: profile.subscribe_to_newsletter || false,
      });
    }
    setEditing(false);
    setError("");
    setSuccess("");
  }

  function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  if (loading && !profile) {
    return (
      <main className="auth-page">
        <header className="hero hero--teal">
          <div className="container hero__inner">
            <h1 className="hero__title">My Profile</h1>
          </div>
        </header>
        <section className="container py-8 pb-16 text-center">
          <p className="text-lg text-gray-600">Loading profile...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <header className="hero hero--teal">
        <div className="container hero__inner">
          <h1 className="hero__title">My Profile</h1>
          <p className="hero__sub">
            Manage your personal information and account settings
          </p>
        </div>
      </header>

      <section className="container py-8 pb-16">
        <div className="card card--spacious max-w-4xl mx-auto">
          {/* Error/Success alerts */}
          {error && (
            <div
              role="alert"
              className="alert alert--error mb-4"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="alert"
              className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-4"
            >
              {success}
            </div>
          )}

          {!editing ? (
            // View Mode
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold m-0">Account Information</h2>
                <button
                  className="btn btn--brand"
                  onClick={() => setEditing(true)}
                >
                  Edit Profile
                </button>
              </div>

              <div className="space-y-4">
                {/* Personal Information */}
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-lg font-semibold mb-3">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="m-0 text-sm text-gray-600">First Name</p>
                      <p className="m-0 font-medium">{profile?.first_name}</p>
                    </div>
                    <div>
                      <p className="m-0 text-sm text-gray-600">Last Name</p>
                      <p className="m-0 font-medium">{profile?.last_name}</p>
                    </div>
                    <div>
                      <p className="m-0 text-sm text-gray-600">Email</p>
                      <p className="m-0 font-medium">{profile?.email}</p>
                    </div>
                    <div>
                      <p className="m-0 text-sm text-gray-600">Phone Number</p>
                      <p className="m-0 font-medium">{profile?.phone_number || "Not provided"}</p>
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-lg font-semibold mb-3">Additional Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="m-0 text-sm text-gray-600">Birthdate</p>
                      <p className="m-0 font-medium">{formatDate(profile?.birthdate)}</p>
                    </div>
                    <div>
                      <p className="m-0 text-sm text-gray-600">Gender</p>
                      <p className="m-0 font-medium">{profile?.sex}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="m-0 text-sm text-gray-600">Address</p>
                      <p className="m-0 font-medium">{profile?.address || "Not provided"}</p>
                    </div>
                  </div>
                </div>

                {/* Membership Information */}
                {profile?.membership ? (
                  <div className="border-b border-gray-200 pb-4">
                    <h3 className="text-lg font-semibold mb-3">Membership</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <p className="m-0 text-sm text-gray-600">Type</p>
                        <p className="m-0 font-medium">{profile.membership.membership_type}</p>
                      </div>
                      <div>
                        <p className="m-0 text-sm text-gray-600">Status</p>
                        <p className="m-0 font-medium">
                          {profile.membership.is_active ? (
                            <span className="text-green-600">Active</span>
                          ) : (
                            <span className="text-red-600">Inactive</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="m-0 text-sm text-gray-600">Start Date</p>
                        <p className="m-0 font-medium">{formatDate(profile.membership.start_date)}</p>
                      </div>
                      <div>
                        <p className="m-0 text-sm text-gray-600">Expiration Date</p>
                        <p className="m-0 font-medium">{formatDate(profile.membership.expiration_date)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-b border-gray-200 pb-4">
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-2 text-teal-900">Become a Member!</h3>
                      <p className="text-sm text-teal-800 mb-3">
                        Enjoy unlimited admission, exclusive previews, discounts, and more. Support the museum and get amazing perks!
                      </p>
                      <Link
                        to="/membershipinfo"
                        className="btn btn--brand"
                      >
                        Upgrade to Membership
                      </Link>
                    </div>
                  </div>
                )}

                {/* Preferences */}
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-lg font-semibold mb-3">Preferences</h3>
                  <div>
                    <p className="m-0 text-sm text-gray-600">Newsletter Subscription</p>
                    <p className="m-0 font-medium">
                      {profile?.subscribe_to_newsletter ? "Subscribed" : "Not subscribed"}
                    </p>
                  </div>
                </div>

                {/* Transaction History */}
                <div className="pb-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold m-0">Recent Transactions</h3>
                    {transactions.length > 5 && (
                      <button 
                        onClick={() => setShowAllTransactions(!showAllTransactions)}
                        className="text-sm text-brand hover:text-brand-dark underline"
                      >
                        {showAllTransactions ? 'Show Less' : `Show All (${transactions.length})`}
                      </button>
                    )}
                  </div>
                  {loadingTransactions ? (
                    <p className="text-sm text-gray-600">Loading transactions...</p>
                  ) : transactions.length > 0 ? (
                    <div className="space-y-3">
                      {(showAllTransactions ? transactions : transactions.slice(0, 5)).map((transaction) => (
                        <div key={transaction.transaction_id} className="border border-gray-200 rounded-lg">
                          <div 
                            className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => toggleTransactionDetails(transaction.transaction_id)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="m-0 font-medium">
                                  Transaction #{transaction.transaction_id}
                                </p>
                                <p className="m-0 text-sm text-gray-600">
                                  {formatDate(transaction.transaction_date)}
                                </p>
                                <p className="m-0 text-sm text-gray-600">
                                  Payment: {transaction.payment_method}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="m-0 font-semibold text-lg text-brand">
                                  ${parseFloat(transaction.total_price).toFixed(2)}
                                </p>
                                <p className="m-0 text-sm">
                                  <span className={`inline-block px-2 py-1 rounded text-xs ${
                                    transaction.transaction_status === 'Completed' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {transaction.transaction_status}
                                  </span>
                                </p>
                                <p className="m-0 text-xs text-gray-500 mt-1">
                                  {expandedTransaction === transaction.transaction_id ? '▲ Hide Details' : '▼ View Details'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Details */}
                          {expandedTransaction === transaction.transaction_id && (
                            <div className="border-t border-gray-200 bg-white p-4">
                              {loadingDetails[transaction.transaction_id] ? (
                                <p className="text-sm text-gray-600">Loading details...</p>
                              ) : transactionDetails[transaction.transaction_id] ? (
                                <div className="space-y-4">
                                  {/* Receipt Header */}
                                  <div className="border-b border-gray-300 pb-3">
                                    <h4 className="text-base font-bold mb-1">Transaction Receipt</h4>
                                    <div className="text-xs text-gray-600 space-y-0.5">
                                      <p className="m-0">Transaction #{transaction.transaction_id}</p>
                                      <p className="m-0">{formatDate(transaction.transaction_date)}</p>
                                      <p className="m-0">Payment: {transaction.payment_method}</p>
                                      <p className="m-0">Status: <span className={`font-semibold ${
                                        transaction.transaction_status === 'Completed'
                                          ? 'text-green-600'
                                          : transaction.transaction_status === 'Pending'
                                          ? 'text-yellow-600'
                                          : 'text-gray-600'
                                      }`}>{transaction.transaction_status}</span></p>
                                    </div>
                                  </div>

                                  {/* Items Purchased */}
                                  <div className="border-b border-gray-200 pb-3">
                                    <h4 className="text-sm font-semibold mb-3">Items Purchased</h4>

                                    {/* Tickets */}
                                    {transactionDetails[transaction.transaction_id].tickets?.length > 0 && (
                                      <div className="mb-3">
                                        <p className="text-xs font-semibold text-gray-700 mb-2">TICKETS</p>
                                        <div className="space-y-2">
                                          {transactionDetails[transaction.transaction_id].tickets.map((ticket, idx) => (
                                            <div key={idx} className="bg-gray-50 p-2 rounded text-xs">
                                              <div className="flex justify-between items-start mb-1">
                                                <div className="flex-1">
                                                  <p className="m-0 font-semibold">{ticket.ticket_name || 'General Admission'}</p>
                                                  <p className="m-0 text-gray-600">Visit: {formatDate(ticket.visit_date)}</p>
                                                  {ticket.exhibition_name && <p className="m-0 text-gray-600">Exhibition: {ticket.exhibition_name}</p>}
                                                  {ticket.event_name && (
                                                    <p className="m-0 text-gray-600">Event: {ticket.event_name} ({formatDate(ticket.event_date)})</p>
                                                  )}
                                                  {ticket.discount_amount > 0 && (
                                                    <p className="m-0 text-green-600">Discount Applied: -${parseFloat(ticket.discount_amount).toFixed(2)}</p>
                                                  )}
                                                </div>
                                                <div className="text-right ml-2">
                                                  <p className="m-0 text-gray-600">Qty: {ticket.quantity}</p>
                                                  <p className="m-0 font-semibold">${parseFloat(ticket.line_total).toFixed(2)}</p>
                                                </div>
                                              </div>
                                              <p className="m-0 text-gray-500">
                                                Status: {ticket.is_used ? 'Used' : 'Valid'}
                                              </p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Gift Shop Items */}
                                    {transactionDetails[transaction.transaction_id].giftItems?.length > 0 && (
                                      <div className="mb-3">
                                        <p className="text-xs font-semibold text-gray-700 mb-2">GIFT SHOP</p>
                                        <div className="space-y-2">
                                          {transactionDetails[transaction.transaction_id].giftItems.map((item, idx) => {
                                            // Calculate if there was a discount applied
                                            const currentPrice = parseFloat(item.current_price || 0);
                                            const paidPrice = parseFloat(item.unit_price || 0);
                                            const hasDiscount = currentPrice > 0 && paidPrice < currentPrice;
                                            const discountAmount = hasDiscount ? currentPrice - paidPrice : 0;

                                            return (
                                              <div key={idx} className="bg-gray-50 p-2 rounded text-xs">
                                                <div className="flex justify-between items-start">
                                                  <div className="flex-1">
                                                    <p className="m-0 font-semibold">{item.item_name}</p>
                                                    {item.category && <p className="m-0 text-gray-600">{item.category}</p>}
                                                    {item.description && <p className="m-0 text-gray-600 mt-1">{item.description}</p>}
                                                    {hasDiscount && (
                                                      <p className="m-0 text-green-600">Discount Applied: -${discountAmount.toFixed(2)} per item</p>
                                                    )}
                                                  </div>
                                                  <div className="text-right ml-2">
                                                    <p className="m-0 text-gray-600">Qty: {item.quantity}</p>
                                                    <p className="m-0 font-semibold">${parseFloat(item.line_total).toFixed(2)}</p>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* Cafeteria Items */}
                                    {transactionDetails[transaction.transaction_id].cafeteriaItems?.length > 0 && (
                                      <div className="mb-3">
                                        <p className="text-xs font-semibold text-gray-700 mb-2">CAFETERIA</p>
                                        <div className="space-y-2">
                                          {transactionDetails[transaction.transaction_id].cafeteriaItems.map((item, idx) => {
                                            // Calculate if there was a discount applied
                                            const currentPrice = parseFloat(item.current_price || 0);
                                            const paidPrice = parseFloat(item.unit_price || 0);
                                            const hasDiscount = currentPrice > 0 && paidPrice < currentPrice;
                                            const discountAmount = hasDiscount ? currentPrice - paidPrice : 0;

                                            return (
                                              <div key={idx} className="bg-gray-50 p-2 rounded text-xs">
                                                <div className="flex justify-between items-start">
                                                  <div className="flex-1">
                                                    <p className="m-0 font-semibold">{item.item_name}</p>
                                                    {item.category && <p className="m-0 text-gray-600">{item.category}</p>}
                                                    {(item.is_vegetarian || item.is_vegan) && (
                                                      <p className="m-0 text-green-600">
                                                        {item.is_vegan ? '🌱 Vegan' : '🥬 Vegetarian'}
                                                      </p>
                                                    )}
                                                    {hasDiscount && (
                                                      <p className="m-0 text-green-600">Discount Applied: -${discountAmount.toFixed(2)} per item</p>
                                                    )}
                                                  </div>
                                                  <div className="text-right ml-2">
                                                    <p className="m-0 text-gray-600">Qty: {item.quantity}</p>
                                                    <p className="m-0 font-semibold">${parseFloat(item.line_total).toFixed(2)}</p>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* Memberships */}
                                    {transactionDetails[transaction.transaction_id].memberships?.length > 0 && (
                                      <div className="mb-3">
                                        <p className="text-xs font-semibold text-gray-700 mb-2">MEMBERSHIPS</p>
                                        <div className="space-y-2">
                                          {transactionDetails[transaction.transaction_id].memberships.map((membership, idx) => (
                                            <div key={idx} className="bg-gray-50 p-2 rounded text-xs">
                                              <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                  <p className="m-0 font-semibold">{membership.membership_type}</p>
                                                  <p className="m-0 text-gray-600">
                                                    {formatDate(membership.start_date)} - {formatDate(membership.expiration_date)}
                                                  </p>
                                                  <p className="m-0">
                                                    <span className={membership.is_active ? 'text-green-600' : 'text-gray-500'}>
                                                      {membership.is_active ? '✓ Active' : 'Inactive'}
                                                    </span>
                                                    {membership.is_renewal === 1 || membership.is_renewal === true ? (
                                                      <span className="text-blue-600 ml-2">• Renewal</span>
                                                    ) : null}
                                                  </p>
                                                </div>
                                                <div className="text-right ml-2">
                                                  <p className="m-0 font-semibold">${parseFloat(membership.line_total).toFixed(2)}</p>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Donations */}
                                    {transactionDetails[transaction.transaction_id].donations?.length > 0 && (
                                      <div className="mb-3">
                                        <p className="text-xs font-semibold text-gray-700 mb-2">DONATIONS</p>
                                        <div className="space-y-2">
                                          {transactionDetails[transaction.transaction_id].donations.map((donation, idx) => (
                                            <div key={idx} className="bg-gray-50 p-2 rounded text-xs">
                                              <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                  <p className="m-0 font-semibold">{donation.donation_type}</p>
                                                  {donation.is_anonymous && <p className="m-0 text-gray-600">Anonymous</p>}
                                                  {donation.donation_message && <p className="m-0 text-gray-600 italic">"{donation.donation_message}"</p>}
                                                  <p className="m-0 text-gray-500">Tax Receipt: {donation.tax_receipt_sent ? '✓ Sent' : 'Pending'}</p>
                                                </div>
                                                <div className="text-right ml-2">
                                                  <p className="m-0 font-semibold">${parseFloat(donation.donation_amount).toFixed(2)}</p>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Receipt Total */}
                                  <div className="border-t-2 border-gray-300 pt-3">
                                    <div className="text-sm space-y-1">
                                      <div className="flex justify-between">
                                        <p className="m-0">Subtotal:</p>
                                        <p className="m-0">${(parseFloat(transaction.total_price) / 1.0825).toFixed(2)}</p>
                                      </div>
                                      <div className="flex justify-between">
                                        <p className="m-0">Tax (8.25%):</p>
                                        <p className="m-0">${(parseFloat(transaction.total_price) - (parseFloat(transaction.total_price) / 1.0825)).toFixed(2)}</p>
                                      </div>
                                      <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                                        <p className="m-0 font-bold text-base">TOTAL:</p>
                                        <p className="m-0 font-bold text-lg text-brand">${parseFloat(transaction.total_price).toFixed(2)}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-600">No additional details available</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-600 m-0">No transactions found</p>
                    </div>
                  )}
                </div>

                {/* Account Metadata */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="m-0 text-xs text-gray-400">
                    Member since {formatDate(profile?.created_at)}
                  </p>
                  {profile?.updated_at && (
                    <p className="m-0 mt-1 text-xs text-gray-400">
                      Last updated {formatDate(profile?.updated_at)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Edit Mode
            <form onSubmit={handleUpdate} className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold m-0">Edit Profile</h2>
                <p className="text-sm text-gray-600 m-0 mt-1">
                  Update your personal information below
                </p>
              </div>

              <div className="space-y-4">
                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="first_name">First Name *</label>
                    <input
                      id="first_name"
                      className="input"
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="last_name">Last Name *</label>
                    <input
                      id="last_name"
                      className="input"
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email">Email *</label>
                  <input
                    id="email"
                    className="input"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone_number">Phone Number</label>
                  <input
                    id="phone_number"
                    className="input"
                    type="tel"
                    placeholder="(123) 456-7890"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  />
                </div>

                {/* Address */}
                <div>
                  <label htmlFor="address">Address</label>
                  <textarea
                    id="address"
                    className="input resize-y"
                    rows="3"
                    placeholder="123 Main St, City, State ZIP"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                {/* Newsletter */}
                <div className="mt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.subscribe_to_newsletter}
                      onChange={(e) => setFormData({ ...formData, subscribe_to_newsletter: e.target.checked })}
                    />
                    Subscribe to newsletter
                  </label>
                </div>

                {/* Note about non-editable fields */}
                <div className="bg-gray-100 p-3 rounded-md mt-2">
                  <p className="text-sm text-gray-700 m-0">
                    Note: Birthdate and gender cannot be changed. Please contact support if you need to update these fields.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end mt-4">
                  <button
                    type="button"
                    className="btn"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn--brand"
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
