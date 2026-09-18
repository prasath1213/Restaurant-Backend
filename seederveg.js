// seedVeg.js
// Run from backend root (same folder as server.js):
//   node seedVeg.js

require('dotenv').config();
const mongoose = require('mongoose');
const Food = require('./models/Food');   // adjust path if this file sits elsewhere
const User = require('./models/User');   // adjust path/name if your user model differs

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found. Check your .env file and dotenv setup.');
  process.exit(1);
}

const vegItemsBase = [
  { name: 'Paneer Butter Masala', price: 220, category: 'Main Course', description: 'Cottage cheese cubes in a rich buttery tomato gravy', preparationTimeMinutes: 25 },
  { name: 'Veg Biryani', price: 200, category: 'Rice & Biryani', description: 'Fragrant basmati rice cooked with mixed vegetables and spices', preparationTimeMinutes: 30 },
  { name: 'Dal Makhani', price: 180, category: 'Main Course', description: 'Slow-cooked black lentils in a creamy buttery gravy', preparationTimeMinutes: 30 },
  { name: 'Veg Manchurian', price: 160, category: 'Starters', description: 'Crispy vegetable balls tossed in a tangy Indo-Chinese sauce', preparationTimeMinutes: 20 },
  { name: 'Gobi 65', price: 150, category: 'Starters', description: 'Crispy deep-fried cauliflower tossed in spicy masala', preparationTimeMinutes: 20 },
  { name: 'Paneer Tikka', price: 210, category: 'Starters', description: 'Char-grilled cottage cheese marinated in yogurt and spices', preparationTimeMinutes: 25 },
  { name: 'Veg Fried Rice', price: 150, category: 'Rice & Biryani', description: 'Wok-tossed rice with mixed vegetables', preparationTimeMinutes: 15 },
  { name: 'Veg Noodles', price: 150, category: 'Fast Food', description: 'Stir-fried noodles with fresh vegetables', preparationTimeMinutes: 15 },
  { name: 'Butter Naan', price: 40, category: 'Breads', description: 'Soft leavened bread brushed with butter', preparationTimeMinutes: 10 },
  { name: 'Chana Masala', price: 170, category: 'Main Course', description: 'Chickpeas simmered in a spiced onion-tomato gravy', preparationTimeMinutes: 25 },
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

    for (const base of vegItemsBase) {
      const item = {
        ...base,
        isVeg: true,
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

    console.log(`✅ ${addedCount} Veg items added/updated in menu!`);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

seed();