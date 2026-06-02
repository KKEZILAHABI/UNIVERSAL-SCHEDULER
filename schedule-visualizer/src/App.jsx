import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState(null);
  
  // History State
  const [history, setHistory] = useState([]);

  // Form State
  const [resources, setResources] = useState([{ id: "res_alpha", type: "hardware_unit" }]);
  const [activities, setActivities] = useState([{ id: "act_001", duration_units: 4 }]);
  const [constraints, setConstraints] = useState([]);

  // --- Fetch History on Mount ---
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/schedules');
      setHistory(response.data);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  };

  // --- Load Past Run into State ---
  const loadPastRun = (pastRun) => {
    if (!pastRun.payload) return;
    setResources(pastRun.payload.resources || []);
    setActivities(pastRun.payload.activities || []);
    setConstraints(pastRun.payload.constraints || []);
    setSchedule(pastRun.result || null);
  };

  // --- Handlers for dynamically adding rows ---
  const addResource = () => setResources([...resources, { id: "", type: "" }]);
  const addActivity = () => setActivities([...activities, { id: "", duration_units: 1 }]);
  const addConstraint = () => setConstraints([
    ...constraints, 
    { type: "max_consecutive", target_type: "resource", filter_value: "", limit: 1 }
  ]);

  // --- Handlers for updating specific inputs ---
  const updateResource = (index, field, value) => {
    const newRes = [...resources];
    newRes[index][field] = value;
    setResources(newRes);
  };

  const updateActivity = (index, field, value) => {
    const newAct = [...activities];
    newAct[index][field] = field === 'duration_units' ? parseInt(value) || 0 : value;
    setActivities(newAct);
  };

  const updateConstraint = (index, field, value) => {
    const newConst = [...constraints];
    newConst[index][field] = value;
    setConstraints(newConst);
  };

  // --- Execution ---
  const handleTriggerSchedule = async () => {
    setLoading(true);
    
    const payload = {
      metadata: { time_horizon: { start: "2026-06-01T08:00:00Z", end: "2026-06-01T18:00:00Z", resolution_minutes: 60 } },
      resources,
      activities,
      constraints: constraints.map(c => ({
        type: c.type,
        scope: { target_type: c.target_type, filter_key: "type", filter_value: c.filter_value },
        behavior: { enforcement: "hard", weight: 0, parameters: { limit: parseInt(c.limit) } }
      }))
    };

    try {
      const response = await axios.post('http://localhost:5000/api/generate-schedule', payload);
      setSchedule(response.data.result); // Extract the engine result from the saved DB document
      fetchHistory(); // Refresh the sidebar instantly
    } catch (error) {
      console.error("Gateway error:", error);
      alert("Failed to communicate with Node gateway.");
    } finally {
      setLoading(false);
    }
  };

  // --- UI Layout Styles ---
  const appContainer = { display: 'flex', gap: '30px', padding: '2rem', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' };
  const sidebarStyle = { flex: '0 0 250px', borderRight: '1px solid #ddd', paddingRight: '20px' };
  const mainStyle = { flex: '1' };
  const sectionStyle = { border: '1px solid #ccc', padding: '15px', marginBottom: '20px', borderRadius: '5px', background: '#fafafa' };
  const rowStyle = { display: 'flex', gap: '10px', marginBottom: '10px' };
  const inputStyle = { padding: '8px', border: '1px solid #aaa', borderRadius: '4px', flex: 1 };
  const btnStyle = { padding: '8px 15px', cursor: 'pointer', background: '#eee', border: '1px solid #ccc', borderRadius: '4px' };
  const historyCard = { padding: '10px', marginBottom: '10px', background: '#f0f8ff', border: '1px solid #bce8f1', borderRadius: '4px', cursor: 'pointer' };

  return (
    <div style={appContainer}>
      {/* SIDEBAR: History */}
      <div style={sidebarStyle}>
        <h2>Past Runs</h2>
        <p style={{ fontSize: '0.85rem', color: '#666' }}>Click to load template</p>
        <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {history.length === 0 ? <p>No history found.</p> : history.map((item) => (
            <div 
              key={item._id} 
              style={historyCard}
              onClick={() => loadPastRun(item)}
            >
              <strong>{item.title}</strong>
              <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '5px' }}>
                {new Date(item.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT: Rule Builder */}
      <div style={mainStyle}>
        <h1>Universal Rule Builder</h1>
        
        {/* RESOURCES */}
        <div style={sectionStyle}>
          <h3>1. Define Resources</h3>
          {resources.map((res, i) => (
            <div key={`res-${i}`} style={rowStyle}>
              <input style={inputStyle} placeholder="ID (e.g., res_alpha)" value={res.id} onChange={e => updateResource(i, 'id', e.target.value)} />
              <input style={inputStyle} placeholder="Type (e.g., human)" value={res.type} onChange={e => updateResource(i, 'type', e.target.value)} />
            </div>
          ))}
          <button style={btnStyle} onClick={addResource}>+ Add Resource</button>
        </div>

        {/* ACTIVITIES */}
        <div style={sectionStyle}>
          <h3>2. Define Activities</h3>
          {activities.map((act, i) => (
            <div key={`act-${i}`} style={rowStyle}>
              <input style={inputStyle} placeholder="ID (e.g., act_001)" value={act.id} onChange={e => updateActivity(i, 'id', e.target.value)} />
              <input style={inputStyle} type="number" placeholder="Duration" value={act.duration_units} onChange={e => updateActivity(i, 'duration_units', e.target.value)} />
            </div>
          ))}
          <button style={btnStyle} onClick={addActivity}>+ Add Activity</button>
        </div>

        {/* CONSTRAINTS */}
        <div style={sectionStyle}>
          <h3>3. Define Constraints</h3>
          {constraints.map((c, i) => (
            <div key={`const-${i}`} style={rowStyle}>
              <select style={inputStyle} value={c.type} onChange={e => updateConstraint(i, 'type', e.target.value)}>
                <option value="max_consecutive">Max Consecutive</option>
                <option value="no_overlap">Prevent Overlap</option>
              </select>
              <input style={inputStyle} placeholder="Target Type" value={c.filter_value} onChange={e => updateConstraint(i, 'filter_value', e.target.value)} />
              <input style={{...inputStyle, flex: '0 0 60px'}} type="number" value={c.limit} onChange={e => updateConstraint(i, 'limit', e.target.value)} />
            </div>
          ))}
          <button style={btnStyle} onClick={addConstraint}>+ Add Rule</button>
        </div>

        {/* EXECUTE */}
        <button 
          onClick={handleTriggerSchedule} disabled={loading}
          style={{ padding: '15px', width: '100%', fontSize: '1.1rem', background: '#007bff', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          {loading ? 'Compiling...' : 'Execute Schedule Engine'}
        </button>

        {/* RESULTS */}
        {schedule && (
          <div style={{ marginTop: '20px' }}>
            <h2>Engine Output</h2>
            <pre style={{ background: '#222', color: '#0f0', padding: '15px', borderRadius: '5px', overflowX: 'auto' }}>
              {JSON.stringify(schedule, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;