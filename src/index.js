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
        if(user.is_blocked){
            // check blocked time
            const user = await collection.findOne({ name: username }).lean();
            // now compare the current time and the blocked_till time from user
            const blocked_till = new Date(user.blocked_till);
            const current_time = new Date();

            if(current_time.getTime() >= blocked_till.getTime()){
                // now unblock the user
                await collection.findOneAndUpdate({ name: username }, { failed_attempts: 0, is_blocked: false });
            }else{
                return res.send("User account is blocked for 24 hrs");
            }
        }

        const isPasswordMatch = await bcrypt.compare(req.body.password, user.password);

        if (!isPasswordMatch) {
            user.failed_attempts = user.failed_attempts + 1;
            if(user.failed_attempts >= 5){
                // now block the use account
                const currentDate = new Date();
                const blocked_till = new Date(currentDate.getTime() + (24 * 60 * 60 * 1000));
                await collection.findOneAndUpdate({ name: username }, { failed_attempts: user.failed_attempts, is_blocked: true, blocked_till  });
            }else{
                // now only increament the failed count
                await collection.findOneAndUpdate({ name: username }, { failed_attempts: user.failed_attempts });
            }
            return res.redirect("/login"); 
        }
        await collection.findOneAndUpdate({ name: username }, { failed_attempts: 0, is_blocked: false });

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
