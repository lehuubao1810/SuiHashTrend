#!/usr/bin/env ts-node

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const MNEMONIC = 'special bike exit curtain mystery roast furnace believe ill remove robot ridge';

async function getPrivateKey() {
  try {
    // Derive keypair từ mnemonic
    const keypair = Ed25519Keypair.deriveKeypair(MNEMONIC);
    console.log('Address:', keypair.getPublicKey().toSuiAddress());

    // Lấy secretKey (Uint8Array 64 bytes) → hex string 128 chars
    const secretBytes = keypair.getSecretKey().slice(0, 64); // 64 bytes
    const privateKeyHex = Buffer.from(secretBytes).toString('hex');

    // Lấy address Sui
    const address = keypair.getPublicKey().toSuiAddress();

    console.log('='.repeat(80));
    console.log('🔑 YOUR SUI CREDENTIALS');
    console.log('='.repeat(80));
    console.log('\n📍 Address:');
    console.log(address);
    console.log('\n🔐 Private Key (Hex - 128 chars):');
    console.log(privateKeyHex);
    console.log('\n✅ Private Key Length:', privateKeyHex.length, 'chars');
    console.log('='.repeat(80));
    console.log('\n📝 Copy these to your .env file:');
    console.log('='.repeat(80));
    console.log(`PRIVATE_KEY_HEX=${privateKeyHex}`);
    console.log(`OWNER_ADDRESS=${address}`);
    console.log('='.repeat(80));
    console.log('\n⚠️  NEVER commit your .env file to git!');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('❌ Error generating Sui credentials:', error);
    process.exit(1);
  }
}

// Run
getPrivateKey();
