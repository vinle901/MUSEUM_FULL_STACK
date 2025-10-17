import { useState, useEffect } from 'react';
import axios from 'axios';

function Visit() {
  const [ticketTypes, setTicketTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTicketTypes = async () => {
      try {
        const response = await axios.get('http://localhost:3000/ticket_types');
        setTicketTypes(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching ticket types:', error);
        setLoading(false);
      }
    };

    fetchTicketTypes();
  }, []);

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
            {loading ? (
              <tr>
                <td colSpan="2">Loading ticket prices...</td>
              </tr>
            ) : (
              ticketTypes.map((ticket) => (
                <tr key={ticket.id}>
                  <td>{ticket.ticket_name}</td>
                  <td>{ticket.base_price === 0 ? 'Free' : `$${ticket.base_price.toFixed(2)}`}</td>
                </tr>
              ))
            )}
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