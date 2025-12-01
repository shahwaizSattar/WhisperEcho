// Test script to check what media exists on Render server
const axios = require('axios');

const BASE_URL = 'https://echo-yddc.onrender.com';

async function testMediaEndpoints() {
  console.log('🔍 Testing Render media endpoints...\n');
  
  // Test basic server health
  try {
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server health:', health.data);
  } catch (error) {
    console.log('❌ Server health check failed:', error.message);
    return;
  }
  
  // Test uploads directory
  try {
    const uploads = await axios.get(`${BASE_URL}/uploads/`);
    console.log('✅ Uploads directory accessible');
  } catch (error) {
    console.log('❌ Uploads directory error:', error.response?.status, error.message);
  }
  
  // Test specific image URLs from the error logs
  const testUrls = [
    '/uploads/images/1a2d9d12-9a87-4d1f-a7ab-d675e7ce66e1.jpg',
    '/uploads/images/140fbc7e-c020-47c5-bfe9-34a76ace53a8.jpg',
    '/uploads/images/8fef7227-25b8-47cc-96cd-2046a040c3d3.jpg',
    '/uploads/audio/9e4def99-bdb2-483f-abd8-46a23a973a5d.m4a'
  ];
  
  console.log('\n🎯 Testing specific media files:');
  for (const url of testUrls) {
    try {
      const response = await axios.head(`${BASE_URL}${url}`);
      console.log(`✅ ${url} - Status: ${response.status}`);
    } catch (error) {
      console.log(`❌ ${url} - Status: ${error.response?.status || 'Network Error'}`);
    }
  }
  
  // Test if uploads folder structure exists
  console.log('\n📁 Testing folder structure:');
  const folders = ['/uploads/images/', '/uploads/videos/', '/uploads/audio/'];
  for (const folder of folders) {
    try {
      const response = await axios.get(`${BASE_URL}${folder}`);
      console.log(`✅ ${folder} - Accessible`);
    } catch (error) {
      console.log(`❌ ${folder} - Status: ${error.response?.status || 'Network Error'}`);
    }
  }
}

testMediaEndpoints().catch(console.error);