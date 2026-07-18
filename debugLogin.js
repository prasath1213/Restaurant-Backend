// debugLogin.js
// Run this directly with: node debugLogin.js
// It connects to your DB, finds the user by email, and tests password comparison
// step by step so we can see exactly where login is failing.

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User'); // adjust path if your models folder is elsewhere

const TEST_EMAIL = 'paulraj@gmail.com';   // <-- change to the email you're testing with
const TEST_PASSWORD = 'YOUR_PASSWORD_HERE'; // <-- change to the password you're typing in the login form

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // select +password since schema has select:false on password
    const user = await User.findOne({ email: TEST_EMAIL.toLowerCase() }).select('+password');

    if (!user) {
      console.log(`❌ No user found with email: ${TEST_EMAIL}`);
      console.log('   -> This means registration never actually saved this user, or you used a different email.');
      process.exit(0);
    }

    console.log('✅ User found:');
    console.log('   _id:', user._id.toString());
    console.log('   name:', user.name);
    console.log('   email:', user.email);
    console.log('   role:', user.role);
    console.log('   stored password hash:', user.password);
    console.log('   hash length:', user.password.length, '(bcrypt hashes are normally 60 chars)');

    // Test using the model's own comparePassword method
    const matchViaModel = await user.comparePassword(TEST_PASSWORD);
    console.log('\n🔑 comparePassword() result:', matchViaModel);

    // Test using raw bcrypt directly, bypassing the model method, as a cross-check
    const matchViaBcrypt = await bcrypt.compare(TEST_PASSWORD, user.password);
    console.log('🔑 raw bcrypt.compare() result:', matchViaBcrypt);

    if (!matchViaModel && !matchViaBcrypt) {
      console.log('\n❌ Password does NOT match stored hash.');
      console.log('   Likely causes:');
      console.log('   1. This user was created by OLD controller code that double-hashed the password.');
      console.log('   2. You are typing a different password than the one used at registration.');
      console.log('   -> Fix: delete this user document and register again with the corrected authController.js.');
    } else {
      console.log('\n✅ Password matches. Login should succeed with these exact credentials.');
      console.log('   If login still returns 401, the bug is elsewhere (e.g. wrong route hit, CORS, or frontend not sending the right field names).');
    }

    process.exit(0);
  } catch (err) {
    console.error('Script error:', err);
    process.exit(1);
  }
}

run();
