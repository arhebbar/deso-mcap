#!/usr/bin/env node
/**
 * Test DeSo API for all DeSo Bulls - see which ones error out
 */
const DESO_NODE = 'https://node.deso.org/api/v0';
const NANOS_PER_DESO = 1e9;

const DESO_BULLS = [
  { username: 'Randhir', displayName: 'Randhir (Me)' },
  { username: 'HighKey' },
  { username: 'JordanLintz' },
  { username: 'LukeLintz' },
  { username: 'HighKeyValidator' },
  { username: 'StarGeezer' },
  { username: 'SG_Vault' },
  { username: 'BeyondSocialValidator' },
  { username: 'DesocialWorld' },
  { username: 'Edokoevoet' },
  { username: 'Gabrielist' },
  { username: 'gabrielvault' },
  { username: 'RobertGraham' },
  { username: '0xAustin' },
  { username: '0xBen_' },
  { username: 'Darian_Parrish' },
  { username: 'DariansWallet' },
  { username: 'VishalGulia' },
  { username: 'ZeroToOne' },
  { username: 'anku' },
  { username: 'fllwthrvr' },
  { username: 'PremierNS' },
  { username: 'WhaleDShark' },
  { username: 'Fernando_Pessoa' },
  { username: 'SkhiBridges' },
  { username: 'Arnoud' },
  { username: 'Silto_Nascao' },
  { username: 'jemarsh' },
  { username: 'carry2web' },
  { username: 'Kaanha' },
  { username: 'Stevonagy' },
  { username: 'dennishlewis' },
  { username: 'desonocode' },
  { username: 'SafetyNet' },
  { username: 'SafetyNetStaking' },
  { username: 'SafetyNetFunding' },
  { username: 'SafetyNetValidator' },
  { username: 'TangledBrush918' },
  { username: 'Tangyshroom' },
  { username: 'ReihanRei' },
  { username: 'AlecsandrosRei' },
  { username: 'mgoff' },
  { username: 'Ugottalovit' },
  { username: 'DesoWomenUnite' },
  { username: 'Nordian' },
  { username: 'DOZ' },
  { username: 'markvanzee' },
  { username: 'OliBvault' },
  { username: 'Gjoe' },
  { username: 'Briandrever' },
  { username: 'Pradier' },
  { username: 'StevoNagy' },
  { username: 'erwinwillems' },
  { username: 'Exotica_S' },
  { username: 'JohnDWeb3' },
  { username: 'gawergy' },
  { username: 'nathanwells' },
  { username: 'bkat' },
  { username: 'jodybossert' },
  { username: 'JohnJardin' },
  { username: 'Capatin' },
  { username: 'degen_doge' },
  { username: 'kuririn' },
  { username: 'fisnikee' },
  { username: 'GoldBerry' },
  { username: 'GoldberryWal' },
  { username: 'ryleesnet' },
  { username: 'rylee19' },
  { username: 'ryleesnetvalidator' },
  { username: 'ChaseSteely' },
  { username: 'CompDec' },
  { username: 'RajLahoti' },
  { username: 'StubbornDad' },
  { username: 'TheBitcloutDog' },
  { username: 'SharkGang' },
  { username: 'Metaphilosopher' },
  { username: 'SharkToken' },
  { username: 'SharkBank' },
  { username: 'SharkCoin' },
  { username: 'Degen_doge' },
  { username: 'PaulyHart' },
  { username: 'Mher' },
  { username: 'vampirecampfire' },
];

async function checkOne(config) {
  const username = config.username;
  const displayName = config.displayName ?? username;
  try {
    const profileRes = await fetch(`${DESO_NODE}/get-single-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Username: username }),
    });

    if (!profileRes.ok) {
      return { username: displayName, status: profileRes.status, error: `get-single-profile: ${profileRes.status}`, deso: 0 };
    }

    const profileData = await profileRes.json();
    const pk = profileData?.Profile?.PublicKeyBase58Check;

    if (!pk) {
      return { username: displayName, status: 200, error: 'No PublicKey in response', deso: 0 };
    }

    const usersRes = await fetch(`${DESO_NODE}/get-users-stateless`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        PublicKeysBase58Check: [pk],
        SkipForLeaderboard: false,
        IncludeBalance: true,
      }),
    });

    if (!usersRes.ok) {
      return { username: displayName, status: usersRes.status, error: `get-users-stateless: ${usersRes.status}`, deso: 0 };
    }

    const usersData = await usersRes.json();
    const user = usersData?.UserList?.[0];

    if (!user) {
      return { username: displayName, status: 200, error: 'UserList empty', deso: 0 };
    }

    const desoNanos = user.DESOBalanceNanos ?? user.BalanceNanos ?? 0;
    const deso = desoNanos / NANOS_PER_DESO;
    const hodlCount = user.UsersYouHODL?.length ?? 0;

    return { username: displayName, status: 200, error: null, deso, hodlCount };
  } catch (err) {
    return { username: displayName, status: 'ERR', error: err.message, deso: 0 };
  }
}

async function main() {
  console.log('Checking all DeSo Bulls on DeSo API...\n');
  console.log('Username              | Status | DESO    | HODLs | Error');
  console.log('---------------------|--------|---------|-------|------');

  const results = [];
  for (const config of DESO_BULLS) {
    const r = await checkOne(config);
    results.push(r);
    const status = typeof r.status === 'number' ? r.status : r.status;
    const desoStr = r.deso >= 1000 ? `${(r.deso / 1000).toFixed(1)}K` : r.deso.toFixed(2);
    const hodlStr = (r.hodlCount ?? '-').toString();
    const errStr = r.error ?? '-';
    console.log(`${r.username.padEnd(21)} | ${String(status).padEnd(6)} | ${desoStr.padStart(7)} | ${hodlStr.padStart(5)} | ${errStr}`);
  }

  const ok = results.filter((r) => !r.error && r.deso >= 0);
  const failed = results.filter((r) => r.error);
  console.log('\n--- Summary ---');
  console.log(`OK: ${ok.length}/${results.length}`);
  if (failed.length) {
    console.log(`Failed: ${failed.map((r) => r.username).join(', ')}`);
  }
}

main();
