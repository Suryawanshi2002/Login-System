const mongoose = require('mongoose');


const connectToDatabase = async () => {
    try {
        await mongoose.connect("mongodb+srv://nikhilsuryawanshi9322:23tXqSwwpsHo56Od@cluster0.exxcun8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
        console.log("Database Connected Successfully");
    } catch (error) {
        console.log("Database cannot be Connected");
    }
};

connectToDatabase();


const Loginschema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    failed_attempts: {
        type: Number,
        default: 0
    },
    failed_attempt_times: {
        type: [Date],
        default: []
    },
    is_blocked: {
        type: Boolean,
        default: false
    },
    blocked_till: {
        type: Date
    },
    last_failed_attempt: {
        type: Date
    }
});

const collection = new mongoose.model("users", Loginschema);

module.exports = collection;


