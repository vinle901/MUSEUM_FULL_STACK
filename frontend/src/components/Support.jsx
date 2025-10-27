import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Support.css';
import donationService from '../services/donationService';

function Support() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const [topDonors, setTopDonors] = useState([]);
  const [donorsYear, setDonorsYear] = useState(new Date().getFullYear());
  const [donorsLoading, setDonorsLoading] = useState(true);
  const [donorsError, setDonorsError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setDonorsLoading(true);
        const { donors, year } = await donationService.getTopDonors({ year: donorsYear, limit: 5 });
        setTopDonors(donors || []);
        setDonorsYear(year);
      } catch (err) {
        console.error('Failed to load donors', err);
        setDonorsError('Unable to load top donors at this time.');
      } finally {
        setDonorsLoading(false);
      }
    })();
  }, [donorsYear]);

  const faqItems = [
    {
      question: "What are your admission prices?",
      answer: "Please visit our Visit page for current ticket prices. We offer discounts for students, seniors, and children.",
      link: true,
      linkText: "Visit page",
      linkPath: "/visit"
    },
    {
      question: "Do you offer group tours?",
      answer: "Yes! We offer guided tours for groups of 10 or more. Please call (713) 123-1002 to schedule your tour.",
      link: false
    },
    {
      question: "Is the museum wheelchair accessible?",
      answer: "Yes, our museum is fully wheelchair accessible. We have accessible parking, entrances, elevators, and restrooms throughout the facility.",
      link: false
    },
    {
      question: "Can I take photos in the museum?",
      answer: "Photography for personal use is allowed in most galleries, but flash photography and tripods are prohibited. Some special exhibitions may have photography restrictions.",
      link: false
    },
    {
      question: "Do you have a cafeteria or restaurant?",
      answer: "Yes! Our museum cafeteria is open during regular hours and offers a variety of meals, snacks, and beverages.",
      link: false
    },
    {
      question: "How can I become a member?",
      answer: "Visit our Membership page to learn about membership benefits and sign up online, or call (713) 123-1001.",
      link: true,
      linkText: "Membership page",
      linkPath: "/membership"
    }
  ];

  const departmentContacts = [
    { department: "Front Desk", phone: "(713) 123-1000" },
    { department: "Membership", phone: "(713) 123-1001" },
    { department: "Group Tours", phone: "(713) 123-1002" },
    { department: "Gift Shop & Cafeteria", phone: "(713) 123-1003" }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    alert('Thank you for contacting us! We will respond within 24-48 hours.');
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: ''
    });
  };

  return (
    <div>
      <div className="visit-header">
        <span className="visit-header-title">Support & Contact</span>
      </div>
      <nav className="navbar-visit">
        <ul className="nav-links">
          <li><a href="#contact-section">Contact Us</a></li>
          <li><a href="#faq-section">FAQ</a></li>
          <li><a href="#donors-section">Top Donors</a></li>
        </ul>
      </nav>
      <div className="support-page">
        {/* Contact Section */}
        <h1 className="section-subtitle" id='contact-section'>Contact Us</h1>
        <div className="about-section">
          <p>
            <strong>WE'RE HERE TO HELP!</strong> Whether you have questions about exhibitions, 
            membership, events, or anything else, our team is ready to assist you. Reach out to 
            us using any of the methods below, and we'll get back to you as soon as possible.
          </p>
        </div>

        <div className="location-hours">
          <div className="parking-text">
            <h2>Get In Touch</h2>
            <p><strong>Phone:</strong> (123) 456-7890</p>
            <p><strong>Email:</strong>  info@themuseum.org</p>
            <p><strong>Address:</strong> 1001 Museum District Dr, Houston, TX 77005</p>
            <p><strong>Hours of Operation:</strong> Monday-Friday, 9:00 AM - 5:00 PM</p>
            
            <h3>Department Contact Information</h3>
            <table className="hours-table">
              <tbody>
                {departmentContacts.map((contact, idx) => (
                  <tr key={idx}>
                    <td><strong>{contact.department}</strong></td>
                    <td>{contact.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="membership-info">
            <h2>Send Us a Message</h2>
            <form onSubmit={handleSubmit} className="support-form">
              <div className="form-group">
                <input
                  type="text"
                  name="name"
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <input
                  type="email"
                  name="email"
                  placeholder="Your Email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <input
                  type="text"
                  name="subject"
                  placeholder="Subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <textarea
                  name="message"
                  placeholder="Your Message"
                  value={formData.message}
                  onChange={handleInputChange}
                  className="form-textarea"
                  required
                />
              </div>
              <button type="submit" className="buy-ticket-btn">
                Send Message
              </button>
            </form>
          </div>
        </div>

        {/* FAQ Section */}
        <h1 className="section-subtitle" id='faq-section'>Frequently Asked Questions</h1>
        <div className="about-section">
          {faqItems.map((item, idx) => (
            <div key={idx} className="faq-item">
              <h3>{item.question}</h3>
              <p>
                {item.link ? (
                  <>
                    {item.answer.split(item.linkText)[0]}
                    <a 
                      href={item.linkPath} 
                      onClick={(e) => { e.preventDefault(); navigate(item.linkPath); }}
                    >
                      {item.linkText}
                    </a>
                    {item.answer.split(item.linkText)[1]}
                  </>
                ) : (
                  item.answer
                )}
              </p>
            </div>
          ))}
        </div>

        {/* Top Donors Section */}
        <h1 className="section-subtitle" id='donors-section'>Our Top Donors - {donorsYear}</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '8px 0 16px', marginLeft: 16 }}>
          <label htmlFor="donor-year-select" style={{ fontWeight: 600 }}>Year</label>
          <select
            id="donor-year-select"
            value={donorsYear}
            onChange={(e) => setDonorsYear(parseInt(e.target.value, 10))}
            className="form-input"
            style={{ width: 120 }}
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="about-section">
          <p>
            We are deeply grateful to our generous donors who make our mission possible. 
            Their support allows us to maintain world-class exhibitions, educational programs, 
            and community outreach initiatives.
          </p>
        </div>

        <div className="ticket-section">
          <table className="ticket-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Donor Name</th>
                <th>Contribution</th>
                <th>Year</th>
              </tr>
            </thead>
            <tbody>
              {donorsLoading && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 12 }}>Loading...</td></tr>
              )}
              {!donorsLoading && donorsError && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 12 }}>{donorsError}</td></tr>
              )}
              {!donorsLoading && !donorsError && topDonors.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 12 }}>No donations recorded yet for {donorsYear}.</td></tr>
              )}
              {!donorsLoading && !donorsError && topDonors.map((donor) => (
                <tr key={donor.rank}>
                  <td>#{donor.rank}</td>
                  <td>{donor.name}</td>
                  <td>${donor.amount.toLocaleString()}</td>
                  <td>{donor.year}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="membership-info">
            <h2>Become a Donor</h2>
            <p>
              Your donation helps us continue our mission of education, preservation, and 
              community engagement. Every contribution, no matter the amount, makes a difference.
            </p>
            <div className="ticket-buttons">
              <button className="buy-ticket-btn" onClick={() => navigate('/donate')}>
                Donate Now
              </button>
              <button
                className="become-member-btn"
                onClick={() => navigate('/membership')}
              >
                Become a Member
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Support;