// Authentication Debug Script
// Run this in your browser console to test authentication

const testAuth = async () => {
  console.log('🔍 Testing Authentication Flow...');
  
  // Test 1: Check Supabase connection
  console.log('\n1. Testing Supabase Connection:');
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log('✅ Supabase connected:', !error);
    if (error) console.error('❌ Supabase error:', error);
  } catch (err) {
    console.error('❌ Supabase connection failed:', err);
  }
  
  // Test 2: Check current user
  console.log('\n2. Checking Current User:');
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (user) {
      console.log('✅ Current user:', user.email);
      console.log('📧 User metadata:', user.user_metadata);
    } else {
      console.log('ℹ️ No user logged in');
    }
    if (error) console.error('❌ User check error:', error);
  } catch (err) {
    console.error('❌ User check failed:', err);
  }
  
  // Test 3: Check profiles table
  console.log('\n3. Checking Profiles Table:');
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (profiles) {
      console.log('✅ Profiles table accessible');
      console.log('📊 Sample profiles:', profiles);
    } else {
      console.log('❌ No profiles found');
    }
    if (error) console.error('❌ Profiles error:', error);
  } catch (err) {
    console.error('❌ Profiles check failed:', err);
  }
  
  // Test 4: Test signup (dry run)
  console.log('\n4. Testing Signup Flow:');
  console.log('ℹ️ To test signup, use the signup form with:');
  console.log('   - Email: test@example.com');
  console.log('   - Password: password123');
  console.log('   - Name: Test User');
  
  // Test 5: Test login (dry run)
  console.log('\n5. Testing Login Flow:');
  console.log('ℹ️ To test login, use the login form with your credentials');
  
  console.log('\n🎯 Debug complete! Check the results above.');
};

// Run the test
testAuth();
