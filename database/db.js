const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/capeverse';

mongoose.connect(mongoUri)
    .then(() => console.log('Connected to MongoDB database'))
    .catch(err => console.error('Could not connect to MongoDB', err));

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    email: { type: String, unique: true, sparse: true },
    password_hash: { type: String },
    google_id: { type: String, unique: true, sparse: true },
    is_verified: { type: Boolean, default: false },
    role: { type: String, default: 'user' },
    banned: { type: Boolean, default: false },
    balance: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

const itemSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    cost: { type: Number, required: true },
    image: { type: String, required: true },
    stock: { type: Number, default: -1 }
});
const Item = mongoose.model('Item', itemSchema);

const verificationCodeSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    code: { type: String, required: true },
    expires_at: { type: Date, required: true }
});
const VerificationCode = mongoose.model('VerificationCode', verificationCodeSchema);

const orderSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    token: { type: String, required: true },
    points: { type: Number, default: 0 },
    timestamp: { type: Number, required: true }
});
const Order = mongoose.model('Order', orderSchema);

// Seed default admin if not exists
const seedDatabase = async () => {
    try {
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
            const bcrypt = require('bcryptjs');
            const hash = await bcrypt.hash('ZpL9mK4tR2vD7wXb', 10);
            await User.create({
                username: 'admin',
                password_hash: hash,
                is_verified: true,
                role: 'admin'
            });
            console.log("Default admin account seeded.");
        }

        // Seed default items if items collection is empty
        const itemCount = await Item.countDocuments();
        if (itemCount === 0) {
            await Item.insertMany([
                { id: 'giveaway', name: 'Capeverse Giveaway Entry', type: 'Digital Cosmetic', cost: 50, image: '/logo.png', stock: -1 },
                { id: 'moonlight', name: 'Moonlight Trail Cape', type: 'Digital Cosmetic', cost: 1000, image: '/moonlight.webp', stock: -1 },
                { id: 'crafter', name: 'Crafter Cape', type: 'Digital Cosmetic', cost: 1500, image: '/crafter.webp', stock: -1 }
            ]);
            console.log("Default items seeded.");
        }
    } catch (err) {
        console.error("Error seeding database:", err);
    }
};

mongoose.connection.once('open', seedDatabase);

module.exports = {
    User,
    Item,
    VerificationCode,
    Order
};
