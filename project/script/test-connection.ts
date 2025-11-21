import * as dotenv from 'dotenv';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import axios from 'axios';

dotenv.config();

async function testConnection() {
  console.log('='.repeat(80));
  console.log('🧪 TESTING CONNECTIONS');
  console.log('='.repeat(80));

  try {
    // Test private key
    console.log('\n1️⃣ Testing Private Key...');
    const privateKeyHex = process.env.PRIVATE_KEY_HEX;
    if (!privateKeyHex || privateKeyHex.length !== 128) {
      throw new Error('Invalid PRIVATE_KEY_HEX');
    }

    const keypair = Ed25519Keypair.fromSecretKey(
      Uint8Array.from(Buffer.from(privateKeyHex, 'hex'))
    );
    const address = keypair.getPublicKey().toSuiAddress();

    console.log('   ✅ Private key valid');
    console.log('   📍 Address:', address);

    // Test RPC connection
    console.log('\n2️⃣ Testing Sui RPC Connection...');
    const client = new SuiClient({ url: process.env.SUI_RPC! });
    const balance = await client.getBalance({ owner: address });

    console.log('   ✅ RPC connection successful');
    console.log('   💰 Balance:', balance.totalBalance, 'MIST');
    console.log(
      '   💰 Balance:',
      (parseInt(balance.totalBalance) / 1_000_000_000).toFixed(4),
      'SUI'
    );

    // Test Walrus connection
    console.log('\n3️⃣ Testing Walrus Connection...');
    const walrusPublisher =
      process.env.WALRUS_PUBLISHER_URL ||
      'https://publisher.walrus-testnet.walrus.space';

    try {
      const testData = { test: 'connection', timestamp: Date.now() };
      const response = await axios.put(
        `${walrusPublisher}/v1/store`,
        JSON.stringify(testData),
        {
          headers: { 'Content-Type': 'application/json' },
          params: { epochs: 1 },
          timeout: 10000,
        }
      );

      const blobId =
        response.data?.newlyCreated?.blobObject?.blobId ||
        response.data?.alreadyCertified?.blobId;

      console.log('   ✅ Walrus connection successful');
      console.log('   🐋 Test Blob ID:', blobId);
    } catch (error: any) {
      console.log('   ⚠️  Walrus connection failed:', error.message);
      console.log('   ℹ️  This is OK if Walrus testnet is down');
    }

    // Test registry object if exists
    console.log('\n4️⃣ Testing Registry Object...');
    const registryId = process.env.REGISTRY_OBJECT_ID;

    if (
      !registryId ||
      registryId ===
        '0x0000000000000000000000000000000000000000000000000000000000000000'
    ) {
      console.log('   ⚠️  Registry not deployed yet');
      console.log('   ℹ️  Run: cd move && sui client publish --gas-budget 100000000');
    } else {
      try {
        const obj = await client.getObject({
          id: registryId,
          options: { showContent: true, showOwner: true },
        });

        if (obj.data) {
          console.log('   ✅ Registry object found');
          console.log('   📦 Object ID:', obj.data.objectId);
          console.log('   👤 Owner:', obj.data.owner);

          const content: any = obj.data.content;
          if (content?.fields?.cid) {
            const cidBytes = content.fields.cid;
            const cid = Buffer.from(cidBytes).toString('utf-8');
            console.log('   📄 Current CID:', cid || '(empty)');
          }
        } else {
          console.log('   ❌ Registry object not found');
        }
      } catch (error: any) {
        console.log('   ❌ Failed to fetch registry:', error.message);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ CONNECTION TESTS COMPLETED');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

testConnection();