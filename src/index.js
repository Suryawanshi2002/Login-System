const express = require("express");
const path = require("path");
const collection = require("./config");
const bcrypt = require('bcrypt');

const app = express();
// convert data into json format
app.use(express.json());
// Static file
app.use(express.static("public"));

app.use(express.urlencoded({ extended: false }));
//use EJS as the view engine
app.set("view engine", "ejs");

const MAX_LOGIN_ATTEMPTS = 5; // Maximum allowed consecutive failed login attempts
const LOCKOUT_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const LOGIN_ATTEMPT_WINDOW = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

app.get("/",(req,res)=>{
    res.render("home1");
})

app.get("/home",async(req,res)=>{
    //const user = req.session.user;

    const userData = await collection.findById({_id:req.session.user_id});

    res.render('home',{user : userData});

})


app.get("/login", (req, res) => {
    res.render("login");
});


app.get("/signup", (req, res) => {
    res.render("signup");
});

// Register User
app.post("/signup", async (req, res) => {

    const data = {
        name: req.body.username,
        password: req.body.password
    }

    // Check if the username already exists in the database
    const existingUser = await collection.findOne({ name: data.name });

    if (existingUser) {
        res.send('User already exists. Please choose a different username.');
    } else {
        // Hash the password using bcrypt
        const saltRounds = 10; // Number of salt rounds for bcrypt
        const hashedPassword = await bcrypt.hash(data.password, saltRounds);

        data.password = hashedPassword; // Replace the original password with the hashed one

        const userdata = await collection.insertMany(data);
        console.log(userdata);

        res.render("login");
    }

});

// Login user 
// app.post("/login", async (req, res) => {
//     try {
//         const check = await collection.findOne({ name: req.body.username });
//         if (!check) {
//             res.send("User name cannot found")
//         }
//         // Compare the hashed password from the database with the plaintext password
//         const isPasswordMatch = await bcrypt.compare(req.body.password, check.password);
//         if (!isPasswordMatch) {
            
//             res.send("Invalid Paswword");
//         }
//         else {
//             //req.session.user = {username: username};
//             res.render("home");
//         }
//     }
//     catch {
//         res.send("wrong Details");
//     }
// });




app.post("/login", async (req, res) => {
    try {
        const username = req.body.username;

        // Check if the user account is locked
        const lockedUser = await collection.findOne({ name: username, lockedUntil: { $gt: Date.now() } });
        if (lockedUser) {
            return res.send("Your account is locked. Please try again later.");
        }

        // Find the user by username
        const user = await collection.findOne({ name: username });
        if (!user) {
            return res.send("User name not found");
        }

        // Compare the hashed password from the database with the plaintext password
        const isPasswordMatch = await bcrypt.compare(req.body.password, user.password);
        if (!isPasswordMatch) {
            // Update login attempt count and lockout if necessary
            await updateLoginAttemptCount(username);
            return res.send("Invalid Password");
        }

        // Reset login attempt count upon successful login
        await resetLoginAttemptCount(username);

        // Redirect or render home page upon successful login
        res.render("home", { username: user.name });
    } catch (error) {
        console.error("Login error:", error);
        res.send("Something went wrong. Please try again later.");
    }
});

// Function to update login attempt count and lockout user if necessary
async function updateLoginAttemptCount(username) {
    const user = await collection.findOneAndUpdate(
        { name: username },
        { $inc: { loginAttempts: 1 } },
        { returnOriginal: false }
    );

    if (user.value && user.value.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        await collection.updateOne(
            { name: username },
            { $set: { lockedUntil: Date.now() + LOCKOUT_DURATION, loginAttempts: 0 } }
        );
    }
}

// Function to reset login attempt count upon successful login
async function resetLoginAttemptCount(username) {
    await collection.updateOne(
        { name: username },
        { $set: { loginAttempts: 0 } }
    );
}



// Define Port for Application
const port = 5000;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
});