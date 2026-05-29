import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState(null);

  // This is the abstract, domain-agnostic payload we tested via curl
  const testPayload = {
    metadata: {
      time_horizon: { start: "2026-06-01T08:00:00Z", end: "2026-06-01T18:00:00Z", resolution_minutes: 60 }
    },
    resources: [
      { id: "res_alpha", type: "hardware_unit" },
      { id: "res_beta", type: "human_operator" }
    ],
    activities: [
      { id: "act_001", duration_units: 4 },
      { id: "act_002", duration_units: 2 },
      { id: "act_003", duration_units: 8 }
    ],
    constraints: []
  };

  const handleTriggerSchedule = async () => {
    setLoading(true);
    try {
      // Direct request to the Node Express Gateway
      const response = await axios.post('http://localhost:5000/api/generate-schedule', testPayload);
      setSchedule(response.data);
    } catch (error) {
      console.error("Gateway error:", error);
      alert("Failed to communicate with Node gateway.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Universal Scheduling Engine Dashboard</h1>
      <p>Click below to pass domain-independent constraints down the Node-Python-Rust data pipeline.</p>
      
      <button 
        onClick={handleTriggerSchedule} 
        disabled={loading}
        style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', cursor: 'pointer', marginBottom: '2rem' }}
      >
        {loading ? 'Crunching Numbers in Rust...' : 'Generate Schedule'}
      </button>

      {schedule && (
        <div>
          <h2>Timeline Resource Allocation</h2>
          <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '4px', background: '#f9f9f9' }}>
            {schedule.assignments.map((assignment, index) => (
              <div 
                key={index} 
                style={{ 
                  margin: '10px 0', 
                  padding: '15px', 
                  background: '#e0f7fa', 
                  borderLeft: '5px solid #00acc1',
                  borderRadius: '2px'
                }}
              >
                <strong>Activity:</strong> {assignment.activity_id} | 
                <strong> Assigned To:</strong> {assignment.resource_id} | 
                <strong> Starts at unit:</strong> {assignment.start_unit}
              </div>
            ))}
          </div>

          {schedule.unscheduled.length > 0 && (
            <div style={{ marginTop: '1.5rem', color: 'red' }}>
              <h3>Unscheduled Activities (Overflow):</h3>
              <ul>
                {schedule.unscheduled.map(id => <li key={id}>{id}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;