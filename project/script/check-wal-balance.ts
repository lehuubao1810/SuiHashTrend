import * as dotenv from 'dotenv';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

dotenv.config();

async function checkWalBalance() {
  try {
    const client = new SuiClient({ url: "https://fullnode.testnet.sui.io:443" });
    const privateKeyHex = "suiprivkey1qr7hrascxrutl2uluymxryje5hq2j8kl9y2574lmkkx95umhg0hp7309xr8";

    if (!privateKeyHex) {
      throw new Error('PRIVATE_KEY_HEX not set');
    }

    const keypair = Ed25519Keypair.fromSecretKey(
      privateKeyHex
    );
    const address = keypair.getPublicKey().toSuiAddress();

    console.log('='.repeat(60));
    console.log('💰 CHECKING BALANCES');
    console.log('='.repeat(60));
    console.log('\n📍 Address:', address);

    // Check SUI balance
    const suiBalance = await client.getBalance({ owner: address });
    console.log('\n🔵 SUI Balance:');
    console.log('   ', suiBalance.totalBalance, 'MIST');
    console.log('   ', (parseInt(suiBalance.totalBalance) / 1_000_000_000).toFixed(4), 'SUI');

    // Check WAL balance (if coin type known)
    // WAL coin type on testnet (example - verify the actual type)
    const walCoinType = '0x8190b041122eb492bf63cb464476bd68c6b7e570a4079645a8b28732b6197a82::wal::WAL'; // Update with actual WAL coin type
    
    try {
      const walBalance = await client.getBalance({
        owner: address,
        coinType: walCoinType,
      });
      console.log('\n🐋 WAL Balance:');
      console.log('   ', walBalance.totalBalance);
    } catch (e) {
      console.log('\n🐋 WAL Balance:');
      console.log('    Not found or zero');
    }

    // List all coins
    console.log('\n📦 All coins in wallet:');
    const allCoins = await client.getAllCoins({ owner: address });
    
    const coinTypes = new Map<string, bigint>();
    allCoins.data.forEach((coin) => {
      const current = coinTypes.get(coin.coinType) || BigInt(0);
      coinTypes.set(coin.coinType, current + BigInt(coin.balance));
    });

    coinTypes.forEach((balance, type) => {
      const shortType = type.split('::').pop() || type;
      console.log(`   ${shortType}:`, balance.toString());
    });

    console.log('\n' + '='.repeat(60));
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkWalBalance();