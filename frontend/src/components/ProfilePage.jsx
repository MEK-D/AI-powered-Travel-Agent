import React, { useState, useEffect } from 'react';

const styles = {
  pageContainer: {
    flex: 1,
    background: '#0a0a00',
    backgroundImage: 'radial-gradient(circle at 50% 10%, rgba(85, 107, 47, 0.18) 0%, transparent 60%)',
    overflowY: 'auto',
    padding: '40px',
    fontFamily: "'Plus Jakarta Sans', 'Outfit', 'Inter', sans-serif",
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    paddingBottom: '20px',
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  pageTitle: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: '2.2rem',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #ffffff 0%, #a3a3a3 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  pageSubtitle: {
    color: '#64748b',
    fontSize: '0.9rem',
    margin: 0,
  },
  btnBack: {
    background: 'rgba(255, 255, 255, 0.03)',
    color: '#e2e8f0',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '10px 20px',
    borderRadius: '12px',
    fontSize: '0.88rem',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
  },
  userOverviewCard: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '20px',
    padding: '24px 32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  userProfileLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  avatar: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6B8E23 0%, #556B2F 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '1.8rem',
    fontWeight: 'bold',
    color: '#ffffff',
    boxShadow: '0 4px 15px rgba(107, 142, 35, 0.3)',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  emailLabel: {
    fontSize: '0.75rem',
    color: '#6B8E23',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    fontWeight: 800,
  },
  emailVal: {
    fontSize: '1.2rem',
    fontWeight: 700,
    color: '#ffffff',
  },
  statsBlock: {
    display: 'flex',
    gap: '32px',
    borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
    paddingLeft: '32px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statVal: {
    fontSize: '1.8rem',
    fontWeight: 800,
    color: '#c4e275',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: '#64748b',
    fontWeight: 600,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '24px',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '20px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardBadge: {
    background: 'rgba(107, 142, 35, 0.15)',
    color: '#c4e275',
    border: '1px solid rgba(107, 142, 35, 0.25)',
    padding: '4px 10px',
    borderRadius: '8px',
    fontSize: '0.72rem',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#ffffff',
    margin: '8px 0 0 0',
  },
  routeDetails: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.9rem',
    color: '#94a3b8',
    background: 'rgba(255,255,255,0.02)',
    padding: '8px 12px',
    borderRadius: '10px',
  },
  routeArrow: {
    color: '#6B8E23',
    fontWeight: 'bold',
  },
  metaRows: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '0.85rem',
    color: '#94a3b8',
  },
  metaItem: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  metaValue: {
    color: '#e2e8f0',
    fontWeight: 600,
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
    marginTop: 'auto',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: '16px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    width: '100%',
    maxWidth: '650px',
  },
  btnDashboard: {
    flex: 1,
    background: 'rgba(255, 255, 255, 0.04)',
    color: '#e2e8f0',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '10px 16px',
    borderRadius: '10px',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center',
  },
  btnOpen: {
    flex: 1,
    background: 'rgba(107, 142, 35, 0.15)',
    color: '#c4e275',
    border: '1px solid rgba(107, 142, 35, 0.3)',
    padding: '10px 16px',
    borderRadius: '10px',
    fontSize: '0.82rem',
    fontWeight: 700,
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s',
  },
  btnDownload: {
    flex: 1,
    background: 'rgba(255,255,255,0.04)',
    color: '#e2e8f0',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '10px 16px',
    borderRadius: '10px',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center',
  },
  btnDelete: {
    background: 'rgba(239, 68, 68, 0.08)',
    color: '#fca5a5',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnDeleteDetail: {
    flex: 1,
    background: 'rgba(239, 68, 68, 0.08)',
    color: '#fca5a5',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    padding: '10px 16px',
    borderRadius: '10px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: '0.82rem',
    fontWeight: 600,
    gap: '6px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 40px',
    color: '#64748b',
    background: 'rgba(255, 255, 255, 0.01)',
    border: '1px dashed rgba(255, 255, 255, 0.07)',
    borderRadius: '24px',
    maxWidth: '500px',
    margin: '40px auto 0 auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  btnStartNew: {
    background: '#6B8E23',
    color: '#ffffff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '12px',
    fontSize: '0.9rem',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'background 0.2s',
  },
  loading: {
    textAlign: 'center',
    padding: '60px 0',
    color: '#94a3b8',
    fontSize: '1rem',
  },
  
  // Detailed View Styles
  detailLayout: {
    display: 'flex',
    gap: '32px',
    width: '100%',
    alignItems: 'flex-start',
  },
  leftColumn: {
    flex: 1.8,
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  rightColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    position: 'sticky',
    top: '20px',
  },
  dossierCard: {
    background: 'rgba(255, 255, 255, 0.015)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '24px',
    padding: '36px',
    backdropFilter: 'blur(20px)',
    color: '#e2e8f0',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
  },
  reservationsTitle: {
    fontSize: '1.2rem',
    color: '#ffffff',
    fontWeight: 700,
    margin: '0 0 16px 0',
    borderLeft: '4px solid #6B8E23',
    paddingLeft: '12px',
  },
  resCard: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    backdropFilter: 'blur(5px)',
  },
  resHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    paddingBottom: '10px',
    marginBottom: '4px',
  },
  resType: {
    fontSize: '0.75rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#c4e275',
  },
  resCost: {
    fontSize: '0.9rem',
    fontWeight: 700,
    color: '#6B8E23',
  },
  resName: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: '#ffffff',
    margin: 0,
  },
  resInfoText: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    lineHeight: '1.4',
  },
  badgeList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  smallBadge: {
    background: 'rgba(255,255,255,0.03)',
    color: '#94a3b8',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    border: '1px solid rgba(255,255,255,0.05)',
  },
};

const parseMarkdownToHtml = (markdown) => {
  if (!markdown) return '';
  return markdown
    .replace(/^### (.*$)/gim, '<h3 style="color: #c4e275; font-family: \'Playfair Display\', Georgia, serif; font-size: 1.3rem; margin-top: 24px; margin-bottom: 8px;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="color: #ffffff; font-family: \'Playfair Display\', Georgia, serif; font-size: 1.8rem; margin-top: 32px; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px;">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 style="color: #ffffff; font-family: \'Playfair Display\', Georgia, serif; font-size: 2.2rem; margin-bottom: 16px; text-align: center;">$1</h1>')
    .replace(/^\* (.*$)/gim, '<li style="margin-bottom: 6px; line-height: 1.5; color: #cbd5e1;">$1</li>')
    .replace(/^- (.*$)/gim, '<li style="margin-bottom: 6px; line-height: 1.5; color: #cbd5e1;">$1</li>')
    .replace(/\*\*(.*)\*\*/gim, '<strong style="color:#ffffff;">$1</strong>')
    .replace(/\*(.*)\*/gim, '<em style="color:#e2e8f0;">$1</em>')
    .replace(/\n/g, '<br/>');
};

export default function ProfilePage({ user, onBack, accessToken, onSelectThread, onStartNew }) {
  const [itineraries, setItineraries] = useState([]);
  const [selectedItinerary, setSelectedItinerary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchItineraries = async () => {
      try {
        const response = await fetch('/api/itineraries', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch itineraries: HTTP ${response.status}`);
        }
        const data = await response.json();
        setItineraries(data.itineraries || []);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to load itineraries');
      } finally {
        setLoading(false);
      }
    };

    fetchItineraries();
  }, [accessToken]);

  const handleDelete = async (e, threadId) => {
    e.stopPropagation(); // Avoid triggering open card
    if (!window.confirm('Are you sure you want to permanently delete this itinerary? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/threads/${threadId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (response.ok) {
        setItineraries(prev => prev.filter(item => item.thread_id !== threadId));
        if (selectedItinerary?.thread_id === threadId) {
          setSelectedItinerary(null);
        }
      } else {
        alert('Failed to delete itinerary');
      }
    } catch (err) {
      console.error(err);
      alert('Error occurred deleting itinerary');
    }
  };

  const handleDownloadPDF = (e, item) => {
    e.stopPropagation();
    const { itinerary, title, trip_details } = item;
    const printWindow = window.open('', '_blank');
    
    const origin = trip_details?.origin || 'Srinagar';
    const destination = trip_details?.destination || 'Goa';
    const startDate = trip_details?.start_date || '2026-04-10';
    const endDate = trip_details?.end_date || '2026-04-13';
    const travelers = trip_details?.number_of_travelers || 1;
    const budget = trip_details?.total_budget ? `$${trip_details.total_budget}` : '';

    const htmlContent = `
      <html>
        <head>
          <title>TravelEase - ${title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap');
            body {
              font-family: 'Plus Jakarta Sans', sans-serif;
              color: #334155;
              background-color: #ffffff;
              margin: 0;
              padding: 40px;
            }
            .header-badge {
              display: inline-block;
              background-color: #f1f5f9;
              color: #64748b;
              padding: 6px 14px;
              border-radius: 20px;
              font-size: 0.75rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 16px;
            }
            .title-container {
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 24px;
              margin-bottom: 30px;
            }
            .main-title {
              font-family: 'Playfair Display', Georgia, serif;
              font-size: 2.6rem;
              font-weight: 800;
              color: #0f172a;
              margin: 0 0 8px 0;
              line-height: 1.2;
            }
            .subtitle {
              color: #64748b;
              font-size: 1.05rem;
              margin: 0;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              background-color: #f8fafc;
              border: 1px solid #f1f5f9;
              border-radius: 16px;
              padding: 24px;
              margin-bottom: 40px;
            }
            .meta-item {
              display: flex;
              flex-direction: column;
              gap: 4px;
            }
            .meta-label {
              font-size: 0.72rem;
              color: #94a3b8;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-weight: 700;
            }
            .meta-value {
              font-size: 0.95rem;
              color: #334155;
              font-weight: 600;
            }
            .content {
              line-height: 1.6;
              font-size: 0.98rem;
            }
            .content h1, .content h2, .content h3 {
              font-family: 'Playfair Display', Georgia, serif;
              color: #0f172a;
              margin-top: 28px;
              margin-bottom: 12px;
            }
            .content h2 {
              font-size: 1.7rem;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 8px;
            }
            .content h3 {
              font-size: 1.35rem;
              color: #475569;
            }
            .content li {
              margin-bottom: 6px;
            }
            .footer {
              margin-top: 60px;
              border-top: 1px solid #e2e8f0;
              padding-top: 20px;
              text-align: center;
              font-size: 0.8rem;
              color: #94a3b8;
            }
            @media print {
              body { padding: 20px; }
              .meta-grid { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header-badge">Orchestrated by TravelEase AI</div>
          <div class="title-container">
            <h1 class="main-title">${title}</h1>
            <p class="subtitle">Your customized luxury travel itinerary</p>
          </div>
          
          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">Route</span>
              <span class="meta-value">${origin.charAt(0).toUpperCase() + origin.slice(1)} &rarr; ${destination.charAt(0).toUpperCase() + destination.slice(1)}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Dates</span>
              <span class="meta-value">${startDate} to ${endDate}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Travelers</span>
              <span class="meta-value">${travelers} Traveler${travelers > 1 ? 's' : ''}</span>
            </div>
            ${budget ? `
            <div class="meta-item" style="grid-column: span 3; border-top: 1px dashed #e2e8f0; padding-top: 16px; margin-top: 8px;">
              <span class="meta-label">Total Budget Allocation</span>
              <span class="meta-value" style="color: #6B8E23; font-size: 1.05rem;">${budget}</span>
            </div>` : ''}
          </div>
          
          <div class="content">
            ${parseMarkdownToHtml(itinerary)}
          </div>
          
          <div class="footer">
            Generated via TravelEase AI Concierge. Thank you for traveling with us!
          </div>
          
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            }
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleOpenPlan = (e, threadId) => {
    e.stopPropagation();
    onSelectThread(threadId);
    onBack();
  };

  const handleStartNewClick = () => {
    onStartNew();
    onBack();
  };

  // Helper renderers for lodging, transit, recommendations
  const renderLodging = (scrapedData) => {
    const hotels = scrapedData?.hotels || [];
    if (hotels.length === 0) return null;
    const hotel = hotels[0]; // Display the main selection
    
    return (
      <div style={styles.resCard}>
        <div style={styles.resHeader}>
          <span style={styles.resType}>🛖 Lodging Choice</span>
          {hotel.cost_per_night && (
            <span style={styles.resCost}>${hotel.cost_per_night}/night</span>
          )}
        </div>
        <h5 style={styles.resName}>{hotel.name || 'Selected Hotel'}</h5>
        {hotel.rating && <span style={{ fontSize: '0.8rem', color: '#fbbf24' }}>★ {hotel.rating} Rating</span>}
        {hotel.nearby_places && hotel.nearby_places.length > 0 && (
          <div style={styles.badgeList}>
            {hotel.nearby_places.slice(0, 3).map((place, idx) => (
              <span key={idx} style={styles.smallBadge}>📍 {place}</span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderTransit = (scrapedData) => {
    const flights = scrapedData?.flights || [];
    const trains = scrapedData?.trains || [];
    
    if (flights.length > 0) {
      const flight = flights[0];
      return (
        <div style={styles.resCard}>
          <div style={styles.resHeader}>
            <span style={styles.resType}>✈️ Flight Details</span>
            {flight.cost && <span style={styles.resCost}>${flight.cost}</span>}
          </div>
          <h5 style={styles.resName}>{flight.airline || 'Selected Flight'}</h5>
          <span style={styles.resInfoText}>
            🟢 {flight.departure || 'N/A'} &rarr; 🔴 {flight.arrival || 'N/A'}
          </span>
          {flight.timing_notes && <span style={styles.resInfoText}>{flight.timing_notes}</span>}
        </div>
      );
    }

    if (trains.length > 0) {
      const train = trains[0];
      return (
        <div style={styles.resCard}>
          <div style={styles.resHeader}>
            <span style={styles.resType}>🚂 Train Details</span>
            {train.cost && <span style={styles.resCost}>₹{train.cost}</span>}
          </div>
          <h5 style={styles.resName}>{train.train_name || 'Selected Train'}</h5>
          <span style={styles.resInfoText}>
            🟢 {train.departure || 'N/A'} &rarr; 🔴 {train.arrival || 'N/A'} ({train.duration || 'N/A'})
          </span>
        </div>
      );
    }

    return null;
  };

  const renderRecommendations = (scrapedData) => {
    const restaurants = scrapedData?.restaurants || [];
    const sightseeing = scrapedData?.sites || [];
    
    if (restaurants.length === 0 && sightseeing.length === 0) return null;

    return (
      <div style={styles.resCard}>
        <div style={styles.resHeader}>
          <span style={styles.resType}>🍷 Top Recommendations</span>
        </div>
        
        {sightseeing.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Attractions</span>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.82rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {sightseeing.slice(0, 3).map((site, idx) => (
                <li key={idx}>{typeof site === 'object' ? site.name || JSON.stringify(site) : site}</li>
              ))}
            </ul>
          </div>
        )}

        {restaurants.length > 0 && (
          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Dining</span>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.82rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {restaurants.slice(0, 3).map((rest, idx) => (
                <li key={idx}>
                  {typeof rest === 'object' ? (
                    <span><strong>{rest.name}</strong> {rest.cuisine ? `(${rest.cuisine})` : ''} {rest.rating ? `★ ${rest.rating}` : ''}</span>
                  ) : rest}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderWeather = (scrapedData) => {
    const weather = scrapedData?.weather || [];
    if (weather.length === 0) return null;

    return (
      <div style={styles.resCard}>
        <div style={styles.resHeader}>
          <span style={styles.resType}>🌦 Forecast & Local Info</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {weather.slice(0, 3).map((w, idx) => {
            if (typeof w !== 'object') return null;
            const sym = w.symbol || '°';
            return (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', borderBottom: idx < 2 ? '1px dashed rgba(255,255,255,0.03)' : 'none', paddingBottom: '6px' }}>
                <span style={{ color: '#cbd5e1' }}>{w.date}</span>
                <span style={{ color: '#94a3b8' }}>{w.conditions}</span>
                <span style={{ color: '#c4e275', fontWeight: 600 }}>{w.max_temp}{sym} / {w.min_temp}{sym}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Check if we should render detailed itinerary or the list grid
  if (selectedItinerary) {
    const trip = selectedItinerary.trip_details || {};
    const scrapedData = selectedItinerary.scraped_data || {};
    
    return (
      <div style={styles.pageContainer}>
        <div style={{ ...styles.topBar, justifyContent: 'center' }}>
          <div style={styles.actions}>
            <button 
              style={styles.btnDashboard}
              onClick={() => setSelectedItinerary(null)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
              }}
            >
              📋 Dashboard
            </button>
            <button 
              style={styles.btnDownload}
              onClick={(e) => handleDownloadPDF(e, selectedItinerary)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              }}
            >
              📥 Download PDF
            </button>
            <button 
              style={styles.btnOpen}
              onClick={(e) => handleOpenPlan(e, selectedItinerary.thread_id)}
            >
              Open in Chat
            </button>
            <button 
              style={styles.btnDeleteDetail}
              onClick={(e) => handleDelete(e, selectedItinerary.thread_id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
              }}
            >
              🗑️ Delete
            </button>
          </div>
        </div>

        <div style={styles.userOverviewCard}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={styles.emailLabel}>Travel Dossier Details</span>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.8rem', color: '#ffffff', margin: 0 }}>
              {selectedItinerary.title}
            </h2>
            <div style={{ display: 'flex', gap: '10px', fontSize: '0.85rem', color: '#64748b' }}>
              <span>Route: {trip.origin?.toUpperCase()} &rarr; {trip.destination?.toUpperCase()}</span>
              <span>•</span>
              <span>Dates: {trip.start_date} to {trip.end_date}</span>
            </div>
          </div>
          <div style={styles.statsBlock}>
            <div style={styles.statItem}>
              <span style={styles.statVal}>{trip.number_of_travelers || 1}</span>
              <span style={styles.statLabel}>Travelers</span>
            </div>
            {trip.total_budget && (
              <div style={styles.statItem}>
                <span style={styles.statVal}>${trip.total_budget}</span>
                <span style={styles.statLabel}>Total Budget</span>
              </div>
            )}
          </div>
        </div>

        <div style={styles.detailLayout}>
          <div style={styles.leftColumn}>
            <div style={styles.dossierCard}>
              <div 
                className="dossier-html"
                dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(selectedItinerary.itinerary) }}
              />
            </div>
          </div>

          <div style={styles.rightColumn}>
            <h4 style={styles.reservationsTitle}>Scraped Reservations</h4>
            {renderTransit(scrapedData)}
            {renderLodging(scrapedData)}
            {renderWeather(scrapedData)}
            {renderRecommendations(scrapedData)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      <div style={styles.topBar}>
        <div style={styles.titleBlock}>
          <h2 style={styles.pageTitle}>My Travel Dashboard</h2>
          <p style={styles.pageSubtitle}>Manage and review your custom luxury travel plans</p>
        </div>
      </div>

      <div style={styles.userOverviewCard}>
        <div style={styles.userProfileLeft}>
          <div style={styles.avatar}>
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div style={styles.userInfo}>
            <span style={styles.emailLabel}>Authorized Account</span>
            <span style={styles.emailVal}>{user?.email || 'N/A'}</span>
          </div>
        </div>
        <div style={styles.statsBlock}>
          <div style={styles.statItem}>
            <span style={styles.statVal}>{itineraries.length}</span>
            <span style={styles.statLabel}>Completed Trips</span>
          </div>
        </div>
      </div>

      <h3 style={{ fontSize: '1.3rem', color: '#ffffff', margin: '16px 0 0 0', borderLeft: '4px solid #6B8E23', paddingLeft: '12px' }}>
        Archived Travel Dossiers
      </h3>

      {loading ? (
        <div style={styles.loading}>
          <div style={{ display: 'inline-block', width: 32, height: 32, border: '4px solid rgba(107,142,35,0.2)', borderTopColor: '#c4e275', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 12 }}></div>
          <div>Retrieving travel plans from secure checkpointer...</div>
        </div>
      ) : error ? (
        <div style={{ color: '#fca5a5', padding: '24px', background: 'rgba(239,68,68,0.06)', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.2)', textAlign: 'center' }}>
          <h3>Database Synchronization Failed</h3>
          <p>{error}</p>
        </div>
      ) : itineraries.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={{ fontSize: '3rem' }}>🗺️</span>
          <h3 style={{ color: '#ffffff', margin: 0 }}>No Itineraries Found</h3>
          <p style={{ margin: 0 }}>You don't have any generated travel plans yet. Run a session to create your first journey!</p>
          <button style={styles.btnStartNew} onClick={handleStartNewClick}>Start Planning Now</button>
        </div>
      ) : (
        <div style={styles.grid}>
          {itineraries.map(item => {
            const dest = item.trip_details?.destination || 'Unknown';
            const origin = item.trip_details?.origin || 'Unknown';
            const startDate = item.trip_details?.start_date;
            const endDate = item.trip_details?.end_date;
            const budget = item.trip_details?.total_budget;
            const travelers = item.trip_details?.number_of_travelers || 1;

            return (
              <div 
                key={item.thread_id} 
                style={styles.card}
                onClick={() => setSelectedItinerary(item)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.borderColor = 'rgba(107, 142, 35, 0.35)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(107, 142, 35, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={styles.cardHeader}>
                  <span style={styles.cardBadge}>Active Dossier</span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : ''}
                  </span>
                </div>

                <div>
                  <h4 style={styles.cardTitle}>{item.title}</h4>
                  <div style={{ display: 'flex', gap: '6px', fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                    <span>ID: {item.thread_id.slice(0, 8)}...</span>
                  </div>
                </div>

                <div style={styles.routeDetails}>
                  <span>📍 {origin.charAt(0).toUpperCase() + origin.slice(1)}</span>
                  <span style={styles.routeArrow}>&rarr;</span>
                  <span>{dest.charAt(0).toUpperCase() + dest.slice(1)}</span>
                </div>

                <div style={styles.metaRows}>
                  {startDate && endDate && (
                    <div style={styles.metaItem}>
                      <span>Schedule:</span>
                      <span style={styles.metaValue}>{startDate} to {endDate}</span>
                    </div>
                  )}
                  <div style={styles.metaItem}>
                    <span>Travelers:</span>
                    <span style={styles.metaValue}>{travelers} traveler{travelers > 1 ? 's' : ''}</span>
                  </div>
                  {budget && (
                    <div style={styles.metaItem}>
                      <span>Budget:</span>
                      <span style={{ ...styles.metaValue, color: '#c4e275' }}>${budget}</span>
                    </div>
                  )}
                </div>

                <div style={styles.cardActions}>
                  <button 
                    style={styles.btnOpen}
                    onClick={(e) => handleOpenPlan(e, item.thread_id)}
                  >
                    Open Plan
                  </button>
                  <button 
                    style={styles.btnDownload}
                    onClick={(e) => handleDownloadPDF(e, item)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    }}
                  >
                    PDF
                  </button>
                  <button 
                    style={styles.btnDelete}
                    onClick={(e) => handleDelete(e, item.thread_id)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                      e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.35)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
