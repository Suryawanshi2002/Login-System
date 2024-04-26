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

// Create Schema
const Loginschema = new mongoose.Schema({
    name: {
        type:String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
});

// collection part
const collection = new mongoose.model("users", Loginschema);

module.exports = collection;


