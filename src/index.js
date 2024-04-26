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

        const lockedUser = await collection.findOne({ name: username, lockedUntil: { $gt: Date.now() } });
        if (lockedUser) {
            return res.send("Your account is locked. Please try again later.");
        }

        const user = await collection.findOne({ name: username });
        if (!user) {
            return res.send("User name not found");
        }

        const isPasswordMatch = await bcrypt.compare(req.body.password, user.password);
        if (!isPasswordMatch) {
            await updateLoginAttemptCount(username);
            return res.redirect("/login"); 
        }
        await resetLoginAttemptCount(username);

        res.render("home", { username: user.name });
    } catch (error) {
        console.error("Login error:", error);
        res.send("Something went wrong. Please try again later.");
    }
});

async function updateLoginAttemptCount(username) {
    const user = await collection.findOneAndUpdate(
        { name: username },
        { $inc: { loginAttempts: 1 } },
        { returnOriginal: false }
    );

    if (user.value && user.value.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        await collection.updateOne(
            { name: username },
            { $set: { lockedUntil: Date.now() + (24 * 60 * 60 * 1000), loginAttempts: 0 } }
        );
    }
}

async function resetLoginAttemptCount(username) {
    await collection.updateOne(
        { name: username },
        { $set: { loginAttempts: 0 } }
    );
}


const port = 5000;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
});
