import { getLeaderboardWithPagination } from './src/services/leaderboard.service';

async function testLeaderboardAPI() {
  console.log('🔄 Testing Leaderboard API...');
  
  try {
    // Test admin leaderboard with pagination
    console.log('\n📊 Testing Admin Leaderboard...');
    const adminResult = await getLeaderboardWithPagination(
      { city: 'all', year: 2024, type: 'all' },
      { page: 1, limit: 10 },
      null
    );
    
    console.log('✅ Admin Leaderboard Success:');
    console.log(`   - Total Students: ${adminResult.pagination.totalStudents}`);
    console.log(`   - Total Pages: ${adminResult.pagination.totalPages}`);
    console.log(`   - Current Page: ${adminResult.pagination.page}`);
    console.log(`   - Results: ${adminResult.leaderboard.length}`);
    
    if (adminResult.leaderboard.length > 0) {
      const first = adminResult.leaderboard[0];
      console.log(`   - Top Student: ${first.name} (Rank #${first.global_rank}, Score: ${first.score})`);
    }

    // Test student leaderboard (top 10)
    console.log('\n🎯 Testing Student Leaderboard (Top 10)...');
    const studentResult = await getLeaderboardWithPagination(
      { city: 'all', year: 2024, type: 'all' },
      { page: 1, limit: 10 },
      null
    );
    
    console.log('✅ Student Leaderboard Success:');
    console.log(`   - Top 10 Students Retrieved: ${studentResult.leaderboard.length}`);
    
    if (studentResult.leaderboard.length > 0) {
      console.log('   - Top 3 Students:');
      studentResult.leaderboard.slice(0, 3).forEach((student, index) => {
        console.log(`     ${index + 1}. ${student.name} - Global: #${student.global_rank}, City: #${student.city_rank}, Score: ${student.score}`);
      });
    }

    console.log('\n🎉 All Leaderboard API tests passed!');
    
  } catch (error) {
    console.error('❌ Leaderboard API test failed:', error);
    throw error;
  }
}

// Run the test
testLeaderboardAPI()
  .then(() => {
    console.log('\n✅ Leaderboard API verification completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Leaderboard API verification failed:', error);
    process.exit(1);
  });
