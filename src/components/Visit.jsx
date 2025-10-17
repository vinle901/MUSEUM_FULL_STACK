import React from 'react';
import './Visit.css';

function Visit() {
  return (
    <div className="visit-page">
      <h1 className="section-title">Plan Your Visit</h1>

      <h2 className="section-subtitle">Location and Hours</h2>
      <div className="museum-address">1001 Museum District Dr, Houston, TX 77005</div>
      <div className="location-hours">
        <img 
          src="https://hga.com/wp-content/uploads/2020/06/Tennessee-State-Museum-exterior-01.jpg" 
          alt="Museum Exterior" 
          className="museum-image"
        />
        
        <table className="hours-table">
          <tbody>
            <tr>
              <td>Monday</td>
              <td>10:00 AM - 5:00 PM</td>
            </tr>
            <tr>
              <td>Tuesday</td>
              <td>10:00 AM - 5:00 PM</td>
            </tr>
            <tr>
              <td>Wednesday</td>
              <td>10:00 AM - 5:00 PM</td>
            </tr>
            <tr>
              <td>Thursday</td>
              <td>10:00 AM - 5:00 PM</td>
            </tr>
            <tr>
              <td>Friday</td>
              <td>10:00 AM - 8:00 PM</td>
            </tr>
            <tr>
              <td>Saturday</td>
              <td>10:00 AM - 8:00 PM</td>
            </tr>
            <tr>
              <td>Sunday</td>
              <td>12:00 PM - 5:00 PM</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="section-subtitle">Tickets</h2>
      <div className="ticket-section">
        <table className="ticket-table">
          <tbody>
            <tr>
              <td>Adults</td>
              <td>$25</td>
            </tr>
            <tr>
              <td>Seniors (65+)</td>
              <td>$20</td>
            </tr>
            <tr>
              <td>Students (with ID)</td>
              <td>$15</td>
            </tr>
            <tr>
              <td>Veterans</td>
              <td>$10</td>
            </tr>
            <tr>
              <td>Childrens (6-13)</td>
              <td>$10</td>
            </tr>
            <tr>
              <td>Child (under 6)</td>
              <td>Free</td>
            </tr>
            <tr>
              <td>Members</td>
              <td>Free</td>
            </tr>
          </tbody>
        </table>
        
        <div className="membership-info">
          <h3>Membership Benefits</h3>
          <p>Members enjoy free admission, exclusive events, discounts at the gift shop and cafeteria, and early access to special exhibitions. Become a member to support the museum and enjoy these perks!</p>
          <div className="ticket-buttons">
            <button className="buy-ticket-btn">Buy Ticket</button>
            <button className="become-member-btn">Become a Member</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Visit;