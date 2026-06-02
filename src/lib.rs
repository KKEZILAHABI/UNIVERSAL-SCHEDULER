use pyo3::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// --- DOMAIN AGNOSTIC STRUCTURES ---

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

// --- NEW CONSTRUCTS FOR RULES ---
#[derive(Debug, Serialize, Deserialize, Clone)]
struct ConstraintScope {
    target_type: String,
    filter_value: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ConstraintBehavior {
    parameters: HashMap<String, u32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Constraint {
    #[serde(rename = "type")]
    rule_type: String,
    scope: ConstraintScope,
    behavior: ConstraintBehavior,
}

#[derive(Debug, Serialize, Deserialize)]
struct ScheduleRequest {
    resources: Vec<Resource>,
    activities: Vec<Activity>,
    #[serde(default)]
    constraints: Vec<Constraint>,
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

// --- ENGINE LOGIC ---

fn compute_schedule(payload: &str) -> String {
    let req: ScheduleRequest = match serde_json::from_str(payload) {
        Ok(data) => data,
        Err(e) => return format!(r#"{{"error": "Failed to parse JSON: {}"}}"#, e),
    };

    let mut assignments = Vec::new();
    let mut unscheduled = Vec::new();
    
    // Track resource timelines (1440 units for PoC)
    let mut resource_timelines: HashMap<String, Vec<u8>> = HashMap::new();
    for res in &req.resources {
        resource_timelines.insert(res.id.clone(), vec![0; 1440]);
    }

    // Process each activity
    for activity in req.activities {
        let mut placed = false;
        
        for res in &req.resources {
            let timeline = resource_timelines.get_mut(&res.id).unwrap();
            let mut consecutive_zeros = 0;
            let mut potential_start = 0;

            // Find a gap
            for slot_idx in 0..1440 {
                if timeline[slot_idx] == 0 {
                    if consecutive_zeros == 0 {
                        potential_start = slot_idx;
                    }
                    consecutive_zeros += 1;
                    
                    if consecutive_zeros == activity.duration_units as usize {
                        // We found a gap! Now, SIMULATE placement to check constraints
                        let mut valid = true;
                        
                        // Temporarily apply the placement
                        for i in potential_start..(potential_start + activity.duration_units as usize) {
                            timeline[i] = 1;
                        }

                        // Evaluate all user-defined constraints
                        for constraint in &req.constraints {
                            if constraint.rule_type == "max_consecutive" 
                               && constraint.scope.target_type == "resource" 
                               && constraint.scope.filter_value == res.resource_type 
                            {
                                let limit = *constraint.behavior.parameters.get("limit").unwrap_or(&999) as usize;
                                let mut current_streak = 0;
                                let mut max_streak = 0;

                                // Scan the simulated timeline for breaches
                                for &status in timeline.iter() {
                                    if status == 1 {
                                        current_streak += 1;
                                        if current_streak > max_streak {
                                            max_streak = current_streak;
                                        }
                                    } else {
                                        current_streak = 0;
                                    }
                                }

                                if max_streak > limit {
                                    valid = false; // Constraint breached!
                                    break;
                                }
                            }
                        }

                        if valid {
                            // Keep the placement and record the assignment
                            assignments.push(Assignment {
                                activity_id: activity.id.clone(),
                                resource_id: res.id.clone(),
                                start_unit: potential_start as u32,
                            });
                            placed = true;
                            break; 
                        } else {
                            // Rollback the simulation and keep looking
                            for i in potential_start..(potential_start + activity.duration_units as usize) {
                                timeline[i] = 0;
                            }
                            consecutive_zeros = 0; // Reset gap search
                        }
                    }
                } else {
                    consecutive_zeros = 0;
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

#[pymodule]
fn scheduling_core(_py: Python, m: &PyModule) -> PyResult<()> {
    #[pyfn(m)]
    #[pyo3(name = "solve")]
    fn solve_py(_py: Python, payload: String) -> PyResult<String> {
        Ok(compute_schedule(&payload))
    }
    Ok(())
}