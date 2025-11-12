import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { formatDate } from '../utils/dateHelpers';
import './MembershipExpirationBanner.css';

export default function MembershipExpirationBanner() {
  const [show, setShow] = useState(false);
  const [membershipInfo, setMembershipInfo] = useState(null);
  const [membershipPlan, setMembershipPlan] = useState(null);

  useEffect(() => {
    checkMembershipExpiration();
  }, []);

  const checkMembershipExpiration = async () => {
    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user) {
      setShow(false);
      return;
    }

    try {
      // Fetch current membership status from server
      const response = await api.get(`/api/memberships/user/${user.id}`);
      const memberships = response.data;

      // No memberships found
      if (!memberships || memberships.length === 0) {
        setShow(false);
        return;
      }

      // Only check the most recent membership (first in array, ordered by created_at DESC)
      const currentMembership = memberships[0];
      
      // Store membership plan details (includes annual_fee from Benefits table)
      setMembershipPlan({
        membership_type: currentMembership.membership_type,
        annual_fee: currentMembership.annual_fee,
      });

      const now = new Date();
      const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      // Helper to parse date correctly (avoid timezone issues)
      const parseDate = (dateString) => {
        const [year, month, day] = dateString.split('T')[0].split('-');
        return new Date(year, month - 1, day);
      };

      const expirationDate = parseDate(currentMembership.expiration_date);

      // Check if current membership is expired (inactive)
      if (!currentMembership.is_active && expirationDate < now) {
        const info = {
          membershipId: currentMembership.membership_id,
          membershipType: currentMembership.membership_type,
          expirationDate: currentMembership.expiration_date,
          isExpired: true,
        };
        setMembershipInfo(info);
        setShow(true);
        return;
      }

      // Check if current membership is expiring soon (show_warning controlled by backend)
      if (currentMembership.is_active && currentMembership.show_warning == true) {
        const daysLeft = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));

        const info = {
          membershipId: currentMembership.membership_id,
          membershipType: currentMembership.membership_type,
          expirationDate: currentMembership.expiration_date,
          daysLeft: daysLeft,
          isExpired: false,
        };

        setMembershipInfo(info);
        setShow(true);
      } else {
        setShow(false);
      }
    } catch (error) {
      // If error (like 403 or 404), just don't show banner
      console.error('Error checking membership:', error);
      setShow(false);
    }
  };

  const handleRenew = () => {
    // Hide banner while navigating to renewal page
    setShow(false);
  };

  const handleClose = () => {
    // Just hide the banner for this session
    setShow(false);
  };

  if (!show || !membershipInfo) return null;

  const { membershipType, daysLeft, isExpired } = membershipInfo;
  const expirationDate = formatDate(membershipInfo.expirationDate);

  // Get user info for checkout
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  return (
    <div className={`membership-expiration-banner ${isExpired ? 'banner-expired' : ''}`}>
      <div className="banner-container">
        <div className="banner-icon">{isExpired ? '🚫' : '⚠️'}</div>
        <div className="banner-content">
          {isExpired ? (
            <>
              <strong>Your {membershipType} membership is inactive</strong>
              <p className="banner-message">
                Your membership expired on {expirationDate}. Renew now to regain access to your benefits!
              </p>
            </>
          ) : (
            <>
              <strong>Your {membershipType} membership expires soon!</strong>
              <p className="banner-message">
                Your membership expires in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong> (on {expirationDate}).
                Renew now to continue enjoying your benefits!
              </p>
            </>
          )}
        </div>
        <div className="banner-actions">
          <Link
            to="/checkout/membership"
            state={{
              checkoutType: 'membership',
              isRenewal: true,
              membershipData: {
                plan: membershipPlan,
                user: user
              }
            }}
            className="btn-renew"
            onClick={handleRenew}
          >
            Renew Now
          </Link>
        </div>
        <button
          className="btn-close"
          onClick={handleClose}
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  );
}
