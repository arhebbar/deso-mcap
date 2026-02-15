#!/usr/bin/env node
/**
 * Test DeSo API for LazyNina - see if get-single-profile and get-users-stateless work
 */
const DESO_NODE = 'https://node.deso.org/api/v0';

async function check() {
  console.log('Checking LazyNina on DeSo API...\n');

  // 1. get-single-profile
  console.log('1. get-single-profile (Username: LazyNina)');
  try {
    const profileRes = await fetch(`${DESO_NODE}/get-single-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Username: 'LazyNina' }),
    });
    console.log('   Status:', profileRes.status, profileRes.statusText);
    const profileData = await profileRes.json();
    if (profileRes.ok) {
      const pk = profileData?.Profile?.PublicKeyBase58Check;
      console.log('   PublicKey:', pk ?? '(none)');
      if (!pk) {
        console.log('   Full response:', JSON.stringify(profileData, null, 2));
      } else {
        // 2. get-users-stateless
        console.log('\n2. get-users-stateless (IncludeBalance: true)');
        const usersRes = await fetch(`${DESO_NODE}/get-users-stateless`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            PublicKeysBase58Check: [pk],
            SkipForLeaderboard: false,
            IncludeBalance: true,
          }),
        });
        console.log('   Status:', usersRes.status, usersRes.statusText);
        const usersData = await usersRes.json();
        const user = usersData?.UserList?.[0];
        if (user) {
          console.log('   BalanceNanos:', user.BalanceNanos);
          console.log('   DESOBalanceNanos:', user.DESOBalanceNanos);
          console.log('   UsersYouHODL count:', user.UsersYouHODL?.length ?? 0);
          if (user.UsersYouHODL?.length) {
            console.log('   Sample HODL:', JSON.stringify(user.UsersYouHODL[0], null, 2));
          }
        } else {
          console.log('   UserList empty or missing');
          console.log('   Full response:', JSON.stringify(usersData, null, 2).slice(0, 500));
        }
      }
    } else {
      console.log('   Error response:', JSON.stringify(profileData, null, 2));
    }
  } catch (err) {
    console.log('   Exception:', err.message);
  }
}

check();
