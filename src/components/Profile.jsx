import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
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
      const res = await api.put("/api/users/profile", formData);

      setProfile(res.data.user);
      setSuccess("Profile updated successfully!");
      setEditing(false);

      // Update user in localStorage
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      storedUser.email = res.data.user.email;
      storedUser.first_name = res.data.user.first_name;
      storedUser.last_name = res.data.user.last_name;
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
                <div className="pb-4">
                  <h3 className="text-lg font-semibold mb-3">Preferences</h3>
                  <div>
                    <p className="m-0 text-sm text-gray-600">Newsletter Subscription</p>
                    <p className="m-0 font-medium">
                      {profile?.subscribe_to_newsletter ? "Subscribed" : "Not subscribed"}
                    </p>
                  </div>
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
