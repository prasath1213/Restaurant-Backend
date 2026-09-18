// seedNonVeg.js
// Run from backend root (same folder as server.js):
//   node seedNonVeg.js

require('dotenv').config();
const mongoose = require('mongoose');
const Food = require('./models/Food');   // adjust path if this file sits elsewhere
const User = require('./models/User');   // adjust path/name if your user model differs

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found. Check your .env file and dotenv setup.');
  process.exit(1);
}

const nonVegItemsBase = [
  { name: 'Chicken Biryani', price: 280, category: 'Rice & Biryani', description: 'Fragrant basmati rice cooked with tender chicken and spices', preparationTimeMinutes: 30 },
  { name: 'Mutton Biryani', price: 350, category: 'Rice & Biryani', description: 'Slow-cooked mutton layered with aromatic basmati rice', preparationTimeMinutes: 40 },
  { name: 'Chicken Curry', price: 220, category: 'Main Course', description: 'Home-style chicken curry in a rich onion-tomato gravy', preparationTimeMinutes: 25 },
  { name: 'Mutton Curry', price: 300, category: 'Main Course', description: 'Spicy mutton curry slow-cooked to perfection', preparationTimeMinutes: 35 },
  { name: 'Chicken 65', price: 180, category: 'Starters', description: 'Crispy deep-fried chicken tossed in spicy masala', preparationTimeMinutes: 20 },
  { name: 'Chicken Tandoori', price: 260, category: 'Starters', description: 'Char-grilled chicken marinated in yogurt and spices', preparationTimeMinutes: 25 },
  { name: 'Fish Fry', price: 240, category: 'Starters', description: 'Crispy shallow-fried fish coated in spiced masala', preparationTimeMinutes: 20 },
  { name: 'Egg Fried Rice', price: 160, category: 'Rice & Biryani', description: 'Wok-tossed rice with scrambled egg and vegetables', preparationTimeMinutes: 15 },
  { name: 'Chicken Noodles', price: 180, category: 'Fast Food', description: 'Stir-fried noodles with chicken and vegetables', preparationTimeMinutes: 15 },
  { name: 'Mutton Keema', price: 260, category: 'Main Course', description: 'Minced mutton cooked with peas and aromatic spices', preparationTimeMinutes: 30 },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Food.createdBy is required — reuse an existing user (prefer an admin/owner) as the creator
    const adminUser =
      (await User.findOne({ role: { $in: ['admin', 'owner'] } })) || (await User.findOne());

    if (!adminUser) {
      console.error('❌ No user found in the database to use as "createdBy". Create an admin user first.');
      process.exit(1);
    }

    let addedCount = 0;

    for (const base of nonVegItemsBase) {
      const item = {
        ...base,
        isVeg: false,
        isAvailable: true,
        createdBy: adminUser._id,
      };

      // Upsert by name so re-running this script doesn't create duplicates
      const result = await Food.findOneAndUpdate(
        { name: item.name },
        { $set: item },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      if (result) {
        addedCount++;
        console.log(`   - ${item.name} (₹${item.price})`);
      }
    }

    console.log(`✅ ${addedCount} Non-Veg items added/updated in menu!`);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

seed();