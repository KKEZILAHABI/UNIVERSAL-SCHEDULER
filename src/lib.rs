use pyo3::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct TimeHorizon {
    resolution_minutes: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Resource {
    id: String,
    #[serde(rename = "type")]
    resource_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Activity {
    id: String,
    duration_units: u32,
}

#[derive(Debug, Serialize, Deserialize)]
struct ScheduleRequest {
    resources: Vec<Resource>,
    activities: Vec<Activity>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Assignment {
    activity_id: String,
    resource_id: String,
    start_unit: u32,
}

#[derive(Debug, Serialize, Deserialize)]
struct ScheduleResponse {
    assignments: Vec<Assignment>,
    unscheduled: Vec<String>,
}

// Domain-independent scheduling engine calculation
fn compute_schedule(payload: &str) -> String {
    let req: ScheduleRequest = match serde_json::from_str(payload) {
        Ok(data) => data,
        Err(_) => return r#"{"error": "Failed to parse JSON payload"}"#.to_string(),
    };

    let mut assignments = Vec::new();
    let mut unscheduled = Vec::new();
    
    // Track resource timelines using a basic bitmap array (1440 minutes max for simple PoC)
    // 0 = available, 1 = occupied
    let mut resource_timelines: HashMap<String, Vec<u8>> = HashMap::new();
    for res in &req.resources {
        resource_timelines.insert(res.id.clone(), vec![0; 1440]);
    }

    // Abstract greedy placement logic
    for activity in req.activities {
        let mut placed = false;
        
        for (res_id, timeline) in resource_timelines.iter_mut() {
            let mut consecutive_slots = 0;
            let mut start_slot = 0;

            for (slot_idx, &status) in timeline.iter().enumerate() {
                if status == 0 {
                    if consecutive_slots == 0 {
                        start_slot = slot_idx as u32;
                    }
                    consecutive_slots += 1;
                    
                    if consecutive_slots == activity.duration_units {
                        // Mark timeline as occupied
                        for i in start_slot..(start_slot + activity.duration_units) {
                            timeline[i as usize] = 1;
                        }
                        assignments.push(Assignment {
                            activity_id: activity.id.clone(),
                            resource_id: res_id.clone(),
                            start_unit: start_slot,
                        });
                        placed = true;
                        break;
                    }
                } else {
                    consecutive_slots = 0;
                }
            }
            if placed { break; }
        }

        if !placed {
            unscheduled.push(activity.id.clone());
        }
    }

    let response = ScheduleResponse { assignments, unscheduled };
    serde_json::to_string(&response).unwrap_or_else(|_| r#"{"error": "Serialization failure"}"#.to_string())
}

/// Python module wrapper
#[pymodule]
fn scheduling_core(_py: Python, m: &PyModule) -> PyResult<()> {
    #[pyfn(m)]
    #[pyo3(name = "solve")]
    fn solve_py(_py: Python, payload: String) -> PyResult<String> {
        Ok(compute_schedule(&payload))
    }
    Ok(())
}