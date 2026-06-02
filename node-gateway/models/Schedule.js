const mongoose = require('mongoose');

// We use Mixed types (Array/Object) here to maintain the flexibility 
// of our domain-agnostic engine without hardcoding strict nested schemas yet.
const ScheduleSchema = new mongoose.Schema({
    title: { 
        type: String, 
        default: "Generated Engine Output" 
    },
    // The rules and entities sent by the user
    payload: {
        metadata: Object,
        resources: Array,
        activities: Array,
        constraints: Array
    },
    // The computed timeline returned by the Rust/Python engine
    result: {
        assignments: Array,
        unscheduled: Array
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Schedule', ScheduleSchema);