const express = require("express");
const path = require("path");
const collection = require("./config");
const bcrypt = require('bcrypt');




const app = express();

app.use(express.json());

app.use(express.static("public"));

app.use(express.urlencoded({ extended: false }));

app.set("view engine", "ejs");

app.get("/",(req,res)=>{
    res.render("home1");
})

app.get("/home",async(req,res)=>{

    const userData = await collection.findById({_id:req.session.user_id});

    res.render('home',{user : userData});

})


app.get("/login", (req, res) => {
    res.render("login");
});


app.get("/signup", (req, res) => {
    res.render("signup");
});

app.post("/signup", async (req, res) => {

    const data = {
        name: req.body.username,
        password: req.body.password
    }

    const existingUser = await collection.findOne({ name: data.name });

    if (existingUser) {
        res.send('User already exists. Please choose a different username.');
    } else {
        const saltRounds = 10; 
        const hashedPassword = await bcrypt.hash(data.password, saltRounds);

        data.password = hashedPassword;

        const userdata = await collection.insertMany(data);
        console.log(userdata);

        res.render("login");
    }

});

app.post("/login", async (req, res) => {
    try {
        const username = req.body.username;

        const user = await collection.findOne({ name: username });
        if (!user) {
            return res.send("User name not found");
        }

        if (user.is_blocked) {
            const blockedTill = new Date(user.blocked_till);
            const currentTime = new Date();

            if (currentTime.getTime() >= blockedTill.getTime()) {
                await collection.findOneAndUpdate({ name: username }, { failed_attempts: 0, is_blocked: false });
            } else {
                return res.send("User account is blocked for 24 hrs");
            }
        }

        const isPasswordMatch = await bcrypt.compare(req.body.password, user.password);

        if (!isPasswordMatch) {
            const currentTime = new Date();
            const lastFailedAttempt = new Date(user.last_failed_attempt);

            if (currentTime.getTime() - lastFailedAttempt.getTime() <= 12 * 60 * 60 * 1000) {
                user.failed_attempts += 1;

                if (user.failed_attempts >= 5) {
                    const blockedTill = new Date(currentTime.getTime() + (24 * 60 * 60 * 1000));
                    await collection.findOneAndUpdate({ name: username }, { failed_attempts: user.failed_attempts, is_blocked: true, blocked_till: blockedTill, last_failed_attempt: currentTime });
                    return res.send("User account is blocked for 24 hrs due to consecutive failed attempts.");
                } else {
                    await collection.findOneAndUpdate({ name: username }, { failed_attempts: user.failed_attempts, last_failed_attempt: currentTime });
                    return res.send(`Invalid password. ${5 - user.failed_attempts} attempts remaining before account is blocked.`);
                }
            } else {
                await collection.findOneAndUpdate({ name: username }, { failed_attempts: 1, last_failed_attempt: currentTime });
                return res.send("Invalid password. 4 attempts remaining before account is blocked.");
            }
        }

        await collection.findOneAndUpdate({ name: username }, { failed_attempts: 0, last_failed_attempt: null });

        res.render("home", { username: user.name });
    } catch (error) {
        console.error("Login error:", error);
        res.send("Something went wrong. Please try again later.");
    }
});


const port = 5000;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
});
