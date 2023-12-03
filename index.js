require('dotenv').config()
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs/promises');
const path = require('path');
const cors = require('cors');
const CryptoDetail = require('./models/Hotlist.model');
const NewCoins = require('./models/Newcoins.model');
const TopGainers = require('./models/TopGainers.model');


const app = express();
const port = process.env.PORT || 4040;
app.use(express.json())
app.use(cors({
    origin: '*'
}))

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('connected to database successfully')
}).catch(err => {
    console.log(err)

})



const uploadDir = path.join(__dirname, 'uploads');
fs.mkdir(uploadDir, { recursive: true }, (err) => {
    if (err) {
        console.error('Error creating uploads directory:', err);
    }
});

// Define Mongoose schema
const imageSchema = new mongoose.Schema({
    imageUrl: String,
});

const Image = mongoose.model('Image', imageSchema);


const textSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
    },
});

const Text = mongoose.model('Text', textSchema);





// Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    },
});

const upload = multer({ storage: storage });


app.get('/', (req, res) => {
    res.send('Server is working fine')
})

// API endpoint to save an image
app.post('/api/images', upload.single('image'), async (req, res) => {
    try {
        const newImage = new Image({
            imageUrl: req.file.filename,
        });

        await newImage.save();
        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${newImage.imageUrl}`;

        res.status(201).json({ message: 'Image saved successfully', imageUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.get('/api/images', async (req, res) => {
    try {
        const images = await Image.find(); // Retrieve only the imageUrl field

        const imageUrls = images.map(image => ({
            imageUrl: `${req.protocol}://${req.get('host')}/uploads/${image.imageUrl}`,
            id: image._id
        }));

        res.json({ images: imageUrls });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// API endpoint to delete an image by ID
app.delete('/api/images/:id', async (req, res) => {
    try {
        const image = await Image.findById(req.params.id);
        console.log(image)
        if (!image) {
            return res.status(404).json({ error: 'Image not found' });
        }

        const imagePath = path.join(__dirname, 'uploads', image.imageUrl);

        // Check if the file exists before attempting to delete it
        const fileExists = await fs.access(imagePath).then(() => true).catch(() => false);

        if (!fileExists) {
            return res.status(404).json({ error: 'Image file not found' });
        }

        // Delete the image file from the uploads folder
        await fs.unlink(imagePath);

        // Remove the image document from the database
        await Image.findOneAndDelete({ _id: req.params.id });

        res.json({ message: 'Image deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



// Route to save or replace a single text
app.post('/api/text', async (req, res) => {
    try {
        const newText = new Text({
            content: req.body.content,
        });

        console.log(req.body)

        // Find the existing text, if any
        const existingText = await Text.findOne();

        if (existingText) {
            // Update the existing text
            await existingText.updateOne({ content: req.body.content });
            res.json({ message: 'Text replaced successfully', text: newText });
        } else {
            // Save the new text if none exists
            await newText.save();
            res.status(201).json({ message: 'Text saved successfully', text: newText });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/text', async (req, res) => {
    try {
        const cryptoDetails = await Text.findOne();
        res.json({ text: cryptoDetails });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// hot list routes
app.post('/api/hotlists', upload.single('symbolImage'), async (req, res) => {
    try {
        const newCryptoDetail = new CryptoDetail({
            name: req.body.name,
            symbolImage: req.file ? req.file.filename : '', // Use the filename if an image is uploaded
            price: req.body.price,
            percentageChange: req.body.percentageChange,
            link: req.body.link
        });

        const userCryptoCount = await CryptoDetail.countDocuments({ /* Add user-specific condition here */ });

        if (userCryptoCount >= 5) {
            return res.status(400).json({ error: 'Maximum number of records reached (5).' });
        }



        // Save or replace the crypto detail
        const existingCryptoDetail = await CryptoDetail.findOne({ name: req.body.name });


        if (existingCryptoDetail) {
            // Update the existing detail
            await existingCryptoDetail.updateOne({
                symbolImage: newCryptoDetail.symbolImage,
                price: req.body.price,
                percentageChange: req.body.percentageChange,
                link: req.body.link
            });

            res.json({ message: 'Crypto detail replaced successfully', detail: newCryptoDetail });
        } else {
            // Save the new detail if none exists
            await newCryptoDetail.save();
            res.status(201).json({ message: 'Crypto detail saved successfully', detail: newCryptoDetail });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/hotlists', async (req, res) => {
    try {
        const cryptoDetails = await CryptoDetail.find();
        res.json({ cryptos: cryptoDetails });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// new coins routes
app.post('/api/newcoins', upload.single('symbolImage'), async (req, res) => {
    try {
        const newCryptoDetail = new NewCoins({
            name: req.body.name,
            symbolImage: req.file ? req.file.filename : '', // Use the filename if an image is uploaded
            price: req.body.price,
            percentageChange: req.body.percentageChange,
            link: req.body.link
        });

        const userCryptoCount = await NewCoins.countDocuments({ /* Add user-specific condition here */ });

        if (userCryptoCount >= 5) {
            return res.status(400).json({ error: 'Maximum number of records reached (5).' });
        }



        // Save or replace the crypto detail
        const existingCryptoDetail = await NewCoins.findOne({ name: req.body.name });


        if (existingCryptoDetail) {
            // Update the existing detail
            await existingCryptoDetail.updateOne({
                symbolImage: newCryptoDetail.symbolImage,
                price: req.body.price,
                percentageChange: req.body.percentageChange,
                link: req.body.link
            });

            res.json({ message: 'Crypto detail replaced successfully', detail: newCryptoDetail });
        } else {
            // Save the new detail if none exists
            await newCryptoDetail.save();
            res.status(201).json({ message: 'Crypto detail saved successfully', detail: newCryptoDetail });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/newcoins', async (req, res) => {
    try {
        const cryptoDetails = await NewCoins.find();
        res.json({ cryptos: cryptoDetails });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// top gainers routes

app.post('/api/topgainers', upload.single('symbolImage'), async (req, res) => {
    try {
        const newCryptoDetail = new TopGainers({
            name: req.body.name,
            symbolImage: req.file ? req.file.filename : '', // Use the filename if an image is uploaded
            price: req.body.price,
            percentageChange: req.body.percentageChange,
            link: req.body.link
        });

        const userCryptoCount = await TopGainers.countDocuments({ /* Add user-specific condition here */ });

        if (userCryptoCount >= 5) {
            return res.status(400).json({ error: 'Maximum number of records reached (5).' });
        }



        // Save or replace the crypto detail
        const existingCryptoDetail = await TopGainers.findOne({ name: req.body.name });


        if (existingCryptoDetail) {
            // Update the existing detail
            await existingCryptoDetail.updateOne({
                symbolImage: newCryptoDetail.symbolImage,
                price: req.body.price,
                percentageChange: req.body.percentageChange,
                link: req.body.link
            });

            res.json({ message: 'Crypto detail replaced successfully', detail: newCryptoDetail });
        } else {
            // Save the new detail if none exists
            await newCryptoDetail.save();
            res.status(201).json({ message: 'Crypto detail saved successfully', detail: newCryptoDetail });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/topgainers', async (req, res) => {
    try {
        const cryptoDetails = await TopGainers.find();
        res.json({ cryptos: cryptoDetails });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});




app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
