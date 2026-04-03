import { useState } from 'react';
import { INDIAN_STATES_CITIES } from '../constants/indianCities';

const s = {
  form: {
    padding: '24px',
    background: '#0d1117',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.07)',
    maxWidth: 600,
    margin: '0 auto',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#e2e8f0',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: "'Outfit', sans-serif",
  },
  group: { marginBottom: 20 },
  label: {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '.05em',
    marginBottom: 8,
  },
  row: { display: 'flex', gap: 12 },
  input: {
    flex: 1,
    padding: '12px 14px',
    background: '#0a0f1a',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    color: '#e2e8f0',
    fontSize: '.9rem',
    outline: 'none',
  },
  select: {
    flex: 1,
    padding: '12px 14px',
    background: '#0a0f1a',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    color: '#e2e8f0',
    fontSize: '.9rem',
    outline: 'none',
    width: '100%',
  },
  btn: {
    width: '100%',
    padding: '14px 0',
    border: 'none',
    borderRadius: 12,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 10,
    boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
  }
};

export default function TripForm({ onStart }) {
  const [formData, setFormData] = useState({
    originState: 'Maharashtra',
    origin: 'Mumbai',
    destinationState: 'Jammu & Kashmir',
    destination: 'Srinagar',
    startDate: '2026-04-10',
    endDate: '2026-04-13',
    travelers: 1,
    budget: 500,
    prompt: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStateChange = (direction, value) => {
    const firstCity = INDIAN_STATES_CITIES[value][0];
    setFormData(prev => ({
      ...prev,
      [`${direction}State`]: value,
      [direction]: firstCity
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const tripDetails = {
      origin: formData.origin,
      destination: formData.destination,
      start_date: formData.startDate,
      end_date: formData.endDate,
      number_of_travelers: parseInt(formData.travelers),
      total_budget: parseFloat(formData.budget)
    };
    onStart(formData.prompt, tripDetails);
  };

  return (
    <form style={s.form} onSubmit={handleSubmit}>
      <h2 style={s.title}>🌍 Plan Your Indian Adventure</h2>
      
      <div style={s.group}>
        <label style={s.label}>From</label>
        <div style={s.row}>
          <select 
            style={s.select}
            value={formData.originState}
            onChange={(e) => handleStateChange('origin', e.target.value)}
          >
            {Object.keys(INDIAN_STATES_CITIES).map(st => <option key={st} value={st}>{st}</option>)}
          </select>
          <select 
            style={s.select}
            name="origin"
            value={formData.origin}
            onChange={handleChange}
          >
            {INDIAN_STATES_CITIES[formData.originState].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div style={s.group}>
        <label style={s.label}>To</label>
        <div style={s.row}>
          <select 
            style={s.select}
            value={formData.destinationState}
            onChange={(e) => handleStateChange('destination', e.target.value)}
          >
            {Object.keys(INDIAN_STATES_CITIES).map(st => <option key={st} value={st}>{st}</option>)}
          </select>
          <select 
            style={s.select}
            name="destination"
            value={formData.destination}
            onChange={handleChange}
          >
            {INDIAN_STATES_CITIES[formData.destinationState].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div style={s.row}>
        <div style={{ ...s.group, flex: 1 }}>
          <label style={s.label}>Departure</label>
          <input 
            style={s.input} 
            type="date" 
            name="startDate" 
            value={formData.startDate}
            onChange={handleChange} 
          />
        </div>
        <div style={{ ...s.group, flex: 1 }}>
          <label style={s.label}>Return</label>
          <input 
            style={s.input} 
            type="date" 
            name="endDate" 
            value={formData.endDate}
            onChange={handleChange} 
          />
        </div>
      </div>

      <div style={s.row}>
        <div style={{ ...s.group, flex: 1 }}>
          <label style={s.label}>Travelers</label>
          <input 
            style={s.input} 
            type="number" 
            name="travelers" 
            min="1"
            value={formData.travelers}
            onChange={handleChange} 
          />
        </div>
        <div style={{ ...s.group, flex: 1 }}>
          <label style={s.label}>Budget (USD)</label>
          <input 
            style={s.input} 
            type="number" 
            name="budget" 
            min="0"
            value={formData.budget}
            onChange={handleChange} 
          />
        </div>
      </div>

      <div style={s.group}>
        <label style={s.label}>Special Requirements / Prompt</label>
        <textarea
          style={{ ...s.input, height: 80, width: '100%', resize: 'none' }}
          name="prompt"
          placeholder="e.g. I want to try Kashmiri cuisine and visit the Dal Lake..."
          value={formData.prompt}
          onChange={handleChange}
        />
      </div>

      <button type="submit" style={s.btn}>🚀 Start Planning</button>
    </form>
  );
}
