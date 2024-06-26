

const express = require('express');
const twilio = require('twilio');
const { Logindetails, cartproducts, purchproducts, addresslist } = require("./config");
require('dotenv').config();  // Ensure this is at the top
const { helpcenterinfo } = require('./Helpcenterinfo');
const { Medicines } = require('./Medicine_info');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSid = process.env.TWILIO_SERVICE_SID;
const client = twilio(accountSid, authToken);
app.post('/send-otp', (req, res) => {
    const { phoneNumber } = req.body;
    client.verify.services(serviceSid)
        .verifications
        .create({ to: phoneNumber, channel: 'sms' })
        .then(verification => {
            console.log('OTP sent successfully to:', phoneNumber); // Log the success message
            res.status(200).send(verification);
        })
        .catch(error => {
            console.error('Error sending OTP:', error); // Log the error message
            res.status(500).send(error);
        });
});


app.post('/verify-otp', async (req, res) => {
    const { phoneNumber, code } = req.body;
    const data = {
        mno: phoneNumber
    };
    
    console.log(phoneNumber, code);
    
    try {
        const verification_check = await client.verify.services(serviceSid)
            .verificationChecks
            .create({ to: phoneNumber, code: code });
            const existingUser = await Logindetails.findOne({
                $or: [
                    
                    { mno: data.mno },
                  
                ]
            });
        
        if (verification_check.status === 'approved') {
            console.log("success");
            if (!existingUser){
            await Logindetails.create(data);
            }
            console.log("User registered successfully:", data);
            res.status(200).send('Verification successful');
        } else {
            console.log("fail");
            res.status(400).send('Verification failed');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send(error);
    }
});
app.patch("/login/:_id", async (req, res) => {
    try {
        const { _id } = req.params;
        const updateData = {
            name: req.body.name,
            mno: req.body.mno,
            email: req.body.email
        };

        // Find the user by _id and update
        const updatedUser = await Logindetails.findByIdAndUpdate(_id, updateData, { new: true });

        if (!updatedUser) {
            return res.status(404).send("User not found");
        }

        res.status(200).json(updatedUser);
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).send("Internal server error. Please try again later.");
    }
});
app.get("/login/:mno", async(req,res)=>{
    const { mno } = req.params;
    try {
        const searchpro = await Logindetails.find({mno: mno });
        if (searchpro.length > 0) {
            console.log(searchpro)
            res.status(200).json(searchpro);
        } else {
            console.log("error")
            res.status(404).json({ message: 'No items found in the cart for this user' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post("/signup", async (req, res) => {
   
    const data={
        mno:req.body.phoneNumber} 

    const otp=req.body.otp;

    try {
        const existingUser = await Logindetails.findOne({
            $or: [
                // { name: data.name },
                // { email: data.email },
                { mno: data.mno },
                // { $and: [ { email: data.email }, { otp: otpMap[data.email] } ] }
            ]
        });

        if (existingUser) {
            console.log("User already exists:", existingUser);
            res.status(409).send('urexist');
        } else {
            const saltRounds = 10;
            data.password = hashedPassword;
            await Logindetails.insertMany(data);
            console.log("User registered successfully:", data);
            res.status(201).send('successful'); 
        }
    } catch (error) {
        console.error("Error registering user:", error);
        return res.status(500).send("Internal server error. Please try again later.");
    }
});

app.get('/v1/query', (req, res) => {
    try {
        const { search } = req.query;
        let sortedquest = helpcenterinfo;

        if (search) {
            const searchWords = search.split(" ").filter(Boolean);
            sortedquest = sortedquest.filter(question => {
                return searchWords.some(word => question.question.toLowerCase().includes(word.toLowerCase()));
            });
        }

        res.status(200).json(sortedquest);
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/v1/medicines/query', async (req, res) => {
    const { search } = req.query;
    try {
        let sortedinfo = [];

        if (search) {
            const searchWords = search.split(" ").filter(Boolean); 
            const regexArray = searchWords.map(word => `(?=.*\\b${word}\\b)`);
            const regex = new RegExp(regexArray.join("") + ".*", "i");
            sortedinfo = Medicines.filter(medicine => regex.test(medicine.name));
        } else {
            sortedinfo = Medicines;
        }

        res.status(200).json(sortedinfo);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/medicine/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const searchpro = await Medicines.find(medicine => medicine.Id.toString() === id);
        if (searchpro) {
            res.status(200).json(searchpro);
        } else {
            res.status(404).json({ message: 'Dress not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post("/addingtocart/:id", async (req, res) => {
    const { id } = req.params;

    const data = {
        id: id, 
        userid:req.body.userid,
        name: req.body.name,
        manufacturers:req.body.manufacturers,
        imageUrl: req.body.imgurl1,
        MRP: req.body.MRP,
        price:req.body.MRP
    };

    try {
        await cartproducts.insertMany(data);
        // await wishlist.findOneAndDelete({ id: id, name: req.body.name });
        console.log("Product added to cart:", data);
        res.status(200).redirect('/cartdetails');
    } catch (error) {
        console.error("Error adding product to cart:", error);
        res.status(500).send("Internal server error. Please try again later.");
    }
});
app.get('/v1/cart/:userid', async (req, res) => {
    const { userid} = req.params;
    try {
        const searchpro = await cartproducts.find({ userid: userid });
        if (searchpro.length > 0) {
            res.status(200).json(searchpro);
        } else {
            res.status(404).json({ message: 'No items found in the cart for this user' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
app.delete("/cart/:id/:userid", async (req, res) => {
    const itemId = req.params.id;
    const userId = req.params.userid;
    try {
        const deletedItem = await cartproducts.findOneAndDelete({ _id: itemId, userid: userId });
        if (!deletedItem) {
            return res.status(404).json({ message: "Item not found" });
        }
        res.status(200).json({ message: "Item deleted successfully", deletedItem });
    } catch (error) {
        console.error("Error deleting item:", error);
        res.status(500).json({ message: "Internal server error. Please try again later." });
    }
});
app.patch('/cart/:itemId/:userId', async (req, res) => {
    const { itemId, userId } = req.params;
    const { qty } = req.body;

    try {
        // Find the item in the cartproducts collection
        const cartItem = await cartproducts.findOne({ _id: itemId, userid: userId });

        if (!cartItem) {
            return res.status(404).json({ message: 'Item not found in cart' });
        }

        // Update the quantity
        cartItem.qty = qty;
        cartItem.qty = qty;
        // cartItem.price= cartItem.price* cartItem.qty;
        await cartItem.save();
        console.log("Quantity updated:", qty);

        res.json(cartItem);
    } catch (error) {
        console.error("Error updating item quantity:", error);
        res.status(500).json({ message: 'Error updating item quantity', error });
    }
});

  

app.post('/checkout', async (req, res) => {
    const { userId, items, total } = req.body;

    if (!userId || !items || !total) {
        return res.status(400).json({ message: "Invalid request" });
    }

    try {
        const purchasePromises = items.map(item => {
            const newPurchasedProduct = new  purchproducts({
                id: item.id,
                userid: userId,
                name: item.name,
                imageUrl: item.imageUrl,
                manufacturers: item.manufacturers,
                MRP: item.MRP,
                price: item.price,
                qty: item.qty
            });
            return newPurchasedProduct.save();
        });

        await Promise.all(purchasePromises);
        res.status(201).json({ message: "Checkout successful" });
    } catch (error) {
        console.error("Error during checkout:", error);
        res.status(500).json({ message: "Internal server error. Please try again later." });
    }
});

app.post("/address/:userid", async (req, res) => {
    const { userid } = req.params;

    const data = {
        userid:userid, 
        name: req.body.name,
        number: req.body.number,
        pincode: req.body.pincode,
        houseNumber: req.body.houseNumber,
        area: req.body.area,
        landmark: req.body.landmark,
        town: req.body.town,
        state: req.body.state,
    };

    try {
        await addresslist.insertMany(data);

        console.log("address added:", data);
        res.status(200).redirect('/purchased');
    } catch (error) {
        console.error("Error adding product to cart:", error);
        res.status(500).send("Internal server error. Please try again later.");
    }
});
app.get('/address/:userid', async (req, res) => {
    const { userid } = req.params;
    try {
        const searchpro = await addresslist.find({userid: userid});
        if (searchpro.length > 0) {
            res.status(200).json(searchpro);
        } else {
            res.status(404).json({ message: ' no address exist' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/v1/address/:id', async (req, res) => {
    const {id } = req.params;
    try {
        const searchpro = await addresslist.find({ _id:id});
        if (searchpro.length > 0) {
            res.status(200).json(searchpro);
        } else {
            res.status(404).json({ message: ' no address exist' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.patch("/v1/address/:id/:userid", async (req, res) => {
    try {
        const { id,userid } = req.params;
        const updateData = {
            userid:userid,
            name: req.body.name,
            number: req.body.number,
            pincode: req.body.pincode,
            houseNumber: req.body.houseNumber,
            area: req.body.area,
            landmark: req.body.landmark,
            town: req.body.town,
            state: req.body.state,
        };

        // Find the user by _id and update
        const updatedUser = await addresslist.findByIdAndUpdate(id, updateData, { new: true });
        console.log(updateUser)

        if (!updatedUser) {
            return res.status(404).send("address not found");
            console.log("not found")
        }

        res.status(200).json(updatedUser);
    } catch (error) {
        console.error("Error updating address:", error);
        res.status(500).send("Internal server error. Please try again later.");
    }
});

app.delete("/address/:_id/:userid", async (req, res) => {
    const itemId = req.params._id;
    const userid=req.params.userid;
    try {
        const deletedItem = await addresslist.findOneAndDelete({ _id: itemId, userid: userid});
        if (!deletedItem) {
            return res.status(404).json({ message: "Item not found" });
        }
        res.status(200).json({ message: "Item deleted successfully", deletedItem });
    } catch (error) {
        console.error("Error deleting item:", error);
        res.status(500).json({ message: "Internal server error. Please try again later." });
    }
});



const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
