import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <div>
      <div className="visit-header">
        <span className="visit-header-title">Plan Your Visit</span>
      </div>
      <nav className="navbar-visit">
        <ul className="nav-links">
          <li><a href="#location-hours">Location & Hours</a></li>
          <li><a href="#ticket-section">Tickets</a></li>
          <li><a href="#about-section">About</a></li>
          <li><a href="#parking-section">Parking</a></li>
        </ul>
      </nav>
      <div className="visit-page">
        <h1 className="section-subtitle" id='location-hours'>Location and Hours</h1>
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

        <h1 className="section-subtitle" id='ticket-section'>Tickets</h1>
        <div className="ticket-section" id='ticket-section'>
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
            <h2>Membership Benefits</h2>
            <p>Members enjoy free admission, exclusive events, discounts at the gift shop and cafeteria, and early access to special exhibitions. Become a member to support the museum and enjoy these perks!</p>
            <div className="ticket-buttons">
              <button className="buy-ticket-btn">Buy Ticket</button>
              <button
                className="become-member-btn"
                onClick={() => navigate('/membership')}
              >
                Become a Member
              </button>
            </div>
          </div>
        </div>

        {/* About Section */}
        <h1 className="section-subtitle" id='about-section'>About</h1>
        <div className="about-section">
          <p>
            <strong>THE MUSEUM</strong> is home to a vibrant collection of art, history, and science institutions dedicated to inspiring curiosity and learning. Our museum offers world-class exhibitions, educational programs, and community events for visitors of all ages. Discover the stories behind the art, explore interactive displays, and immerse yourself in a welcoming space designed to spark imagination and creativity.
          </p>
          <p>
            Our mission is to engage, educate, and inspire the community through accessible and innovative exhibits, programs, and experiences. We strive to foster creativity, curiosity, and lifelong learning for visitors of all ages.
          </p>
        </div>

        <h1 className="section-subtitle" id='parking-section'>Parking</h1>
        <div className="parking-section">
          <div className='parking-row'>
            <div className="parking-text">
              <p>
                Museum Visitor Garage Parking is located on the south side of the building.
                Additional parking and drop-off zones are available across Willmington Street. Accessible parking spaces are provided near the main entrance.
              </p>
              <p>Parking is paid (only credit/debit accepted) but free on weekends and holidays.</p>
              <div className='transportation'>
                <h2>Additional Transportation Options</h2>
                <h3>METRO</h3>
                <p>
                  METRO provides convenient bus and rail services to the museum. The nearest METRO rail station is Museum District Station. Plan your trip at{' '}
                  <a href="https://www.ridemetro.org/" target="_blank" rel="noopener noreferrer">
                    METRO's website
                  </a>.
                </p>
                <h3>Bicycle</h3>
                <p>Bicycle racks are available near the main entrance.</p>
              </div>
            </div>

            <img 
              src="src/assets/parking-info.jpg" 
              alt="Museum parking map" 
              className="parking-map"
            />
          </div>

          <div className="parking-prices">
            <div className="parking-prices-text">
              <h2><strong>Parking Garage Hours</strong></h2>
              <p>7AM - 11PM</p>
            </div>

            <div className="parking-prices-table">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Member</th>
                    <th>Visitor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>0 - 30 minutes</td>
                    <td>Free</td>
                    <td>Free</td>
                  </tr>
                  <tr>
                    <td>31 minutes - 4 hours</td>
                    <td>$5</td>
                    <td>$10</td>
                  </tr>
                  <tr>
                    <td>4 - 12 hours</td>
                    <td>$10</td>
                    <td>$20</td>
                  </tr>
                  <tr>
                    <td>12+ hours</td>
                    <td>$25</td>
                    <td>$30</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Visit;