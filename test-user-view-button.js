/**
 * Test script to debug "View User" button issue in admin panel
 * This script checks if users with violations have valid IDs
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

const User = require('./backend/models/User');
const Report = require('./backend/models/Report');

async function testUserViewButton() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Get all users with violations
    console.log('📋 Test 1: Users with violations');
    console.log('='.repeat(50));
    const usersWithViolations = await User.find({ violationCount: { $gt: 0 } })
      .select('_id username violationCount shadowbanned')
      .lean();
    
    console.log(`Found ${usersWithViolations.length} users with violations:`);
    usersWithViolations.forEach(user => {
      console.log(`  - ${user.username} (ID: ${user._id})`);
      console.log(`    Violations: ${user.violationCount}, Shadowbanned: ${user.shadowbanned}`);
      console.log(`    ID Type: ${typeof user._id}, Valid ObjectId: ${mongoose.isValidObjectId(user._id)}`);
    });
    console.log('');

    // Test 2: Get all users without violations
    console.log('📋 Test 2: Users without violations (sample)');
    console.log('='.repeat(50));
    const usersWithoutViolations = await User.find({ violationCount: 0 })
      .select('_id username violationCount')
      .limit(3)
      .lean();
    
    console.log(`Found ${usersWithoutViolations.length} users without violations (showing 3):`);
    usersWithoutViolations.forEach(user => {
      console.log(`  - ${user.username} (ID: ${user._id})`);
      console.log(`    ID Type: ${typeof user._id}, Valid ObjectId: ${mongoose.isValidObjectId(user._id)}`);
    });
    console.log('');

    // Test 3: Check reports for users with violations
    console.log('📋 Test 3: Reports for users with violations');
    console.log('='.repeat(50));
    for (const user of usersWithViolations.slice(0, 3)) {
      const reports = await Report.find({ postOwner: user._id })
        .select('_id reason status postOwner')
        .lean();
      console.log(`  User: ${user.username} (${user._id})`);
      console.log(`    Reports: ${reports.length}`);
      if (reports.length > 0) {
        console.log(`    Sample report postOwner: ${reports[0].postOwner}`);
        console.log(`    postOwner Type: ${typeof reports[0].postOwner}`);
        console.log(`    Valid ObjectId: ${mongoose.isValidObjectId(reports[0].postOwner)}`);
      }
    }
    console.log('');

    // Test 4: Simulate admin API call
    console.log('📋 Test 4: Simulate admin API /users endpoint');
    console.log('='.repeat(50));
    const allUsers = await User.find({ violationCount: { $gt: 0 } })
      .select('-password')
      .limit(5)
      .lean();
    
    console.log(`Simulating API response for ${allUsers.length} users:`);
    allUsers.forEach(user => {
      console.log(`  - ${user.username}`);
      console.log(`    _id: ${user._id} (${typeof user._id})`);
      console.log(`    _id.toString(): ${user._id.toString()}`);
      console.log(`    Valid for Link: ${user._id ? 'YES' : 'NO'}`);
    });
    console.log('');

    // Test 5: Try to fetch a user with violations by ID
    if (usersWithViolations.length > 0) {
      console.log('📋 Test 5: Fetch user with violations by ID');
      console.log('='.repeat(50));
      const testUser = usersWithViolations[0];
      console.log(`Testing user: ${testUser.username} (${testUser._id})`);
      
      const fetchedUser = await User.findById(testUser._id).select('-password').lean();
      if (fetchedUser) {
        console.log('✅ User successfully fetched by ID');
        console.log(`   Username: ${fetchedUser.username}`);
        console.log(`   Violations: ${fetchedUser.violationCount}`);
      } else {
        console.log('❌ User NOT found by ID - THIS IS THE PROBLEM!');
      }
    }

    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testUserViewButton();
