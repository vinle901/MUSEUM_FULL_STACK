import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaTrash, FaCheck, FaBell } from 'react-icons/fa'
import api from '../../services/api'
import './NotificationBell.css'

function NotificationBell() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('unresolved') // 'unresolved' or 'all'

  // Helper function to format timestamps in local time
  const formatLocalTime = (timestamp) => {
    console.log('Formatting timestamp:', timestamp)
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  useEffect(() => {
    fetchNotifications()
    // Real-time polling: check every 3 seconds for new notifications
    // Only poll when dropdown is closed to avoid flicker
    if (!showDropdown) {
      const interval = setInterval(fetchNotifications, 3000) // 3 seconds for near real-time
      return () => clearInterval(interval)
    }
  }, [filter, showDropdown])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const endpoint = filter === 'unresolved'
        ? '/api/notifications/unresolved'
        : '/api/notifications'

      const response = await api.get(endpoint)
      setNotifications(response.data)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const resolveNotification = (notification) => {
    // Close dropdown
    setShowDropdown(false)

    // Navigate to admin portal with item info to auto-open edit form
    // The database trigger will auto-resolve the notification when stock is updated
    navigate('/employee/admin', {
      state: {
        openTab: 'giftshop',
        editItemId: notification.item_id,
        notificationId: notification.message_id
      }
    })
  }

  const deleteNotification = async (messageId) => {
    if (!confirm('Are you sure you want to delete this notification?')) {
      return
    }

    try {
      // Optimistic update - remove from UI immediately
      setNotifications(prev => prev.filter(notif => notif.message_id !== messageId))

      // Then delete from backend
      await api.delete(`/api/notifications/${messageId}`)
    } catch (error) {
      console.error('Error deleting notification:', error)
      alert('Failed to delete notification')
      // Revert on error
      fetchNotifications()
    }
  }

  const unresolvedCount = notifications.filter(n => !n.resolved).length

  return (
    <div className="notification-bell-container">
      <button
        className="notification-bell-button"
        onClick={() => setShowDropdown(!showDropdown)}
        aria-label="Notifications"
      >
        <FaBell className={`bell-icon ${unresolvedCount > 0 ? 'has-notifications' : ''}`} />
        {unresolvedCount > 0 && (
          <span className="notification-badge">{unresolvedCount}</span>
        )}
      </button>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            <button
              className="close-button"
              onClick={() => setShowDropdown(false)}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="notification-filters">
            <button
              className={filter === 'unresolved' ? 'filter-active' : ''}
              onClick={() => setFilter('unresolved')}
            >
              Unresolved ({unresolvedCount})
            </button>
            <button
              className={filter === 'all' ? 'filter-active' : ''}
              onClick={() => setFilter('all')}
            >
              All
            </button>
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="notification-loading">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                {filter === 'unresolved'
                  ? 'No unresolved notifications 🎉'
                  : 'No notifications yet'}
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.message_id}
                  className={`notification-item ${notif.resolved ? 'resolved' : 'unresolved'}`}
                >
                  <div className="notification-content">
                    <p className="notification-message">{notif.message}</p>
                    <div className="notification-meta">
                      <span className="notification-time">
                        {formatLocalTime(notif.created_at)}
                      </span>
                    </div>
                    {notif.resolved && notif.resolved_at && (
                      <p className="notification-resolved-info">
                        ✓ Resolved: {formatLocalTime(notif.resolved_at)}
                      </p>
                    )}
                  </div>

                  <div className="notification-actions">
                    {!notif.resolved && (
                      <button
                        className="resolve-button"
                        onClick={() => resolveNotification(notif)}
                        title="Open item in admin portal"
                      >
                        <FaCheck /> Resolve
                      </button>
                    )}
                    <button
                      className="delete-button"
                      onClick={() => deleteNotification(notif.message_id)}
                      title="Delete notification"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-footer">
              <button
                className="refresh-button"
                onClick={fetchNotifications}
                disabled={loading}
              >
                {loading ? 'Refreshing...' : '🔄 Refresh'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationBell
