import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import * as dotenv from 'dotenv';

dotenv.config();

function validateEnv() {
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log('='.repeat(80));
  console.log('🔍 VALIDATING ENVIRONMENT CONFIGURATION');
  console.log('='.repeat(80));

  // Check PRIVATE_KEY_HEX
  const privateKey = process.env.PRIVATE_KEY_HEX;
  if (!privateKey) {
    errors.push('PRIVATE_KEY_HEX is not set');
  } else if (privateKey.length !== 128) {
    errors.push(
      `PRIVATE_KEY_HEX must be 128 hex chars, got ${privateKey.length}`
    );
  } else {
    try {
      const keypair = Ed25519Keypair.fromSecretKey(
        Uint8Array.from(Buffer.from(privateKey, 'hex'))
      );
      const address = keypair.getPublicKey().toSuiAddress();
      console.log('\n✅ Valid private key');
      console.log('   Address:', address);
    } catch (e) {
      errors.push('Invalid PRIVATE_KEY_HEX format');
    }
  }

  // Check Sui addresses
  const checkAddress = (name: string, value: string | undefined) => {
    if (!value) {
      errors.push(`${name} is not set`);
    } else if (!value.startsWith('0x')) {
      errors.push(`${name} must start with 0x`);
    } else if (value.length !== 66) {
      if (
        value ===
        '0x0000000000000000000000000000000000000000000000000000000000000000'
      ) {
        warnings.push(
          `${name} is placeholder - you need to deploy the contract first`
        );
      } else {
        warnings.push(
          `${name} should be 66 chars (0x + 64 hex), got ${value.length}`
        );
      }
    } else {
      console.log(`✅ ${name}: ${value.substring(0, 10)}...`);
    }
  };

  checkAddress('PACKAGE_ID', process.env.PACKAGE_ID);
  checkAddress('REGISTRY_OBJECT_ID', process.env.REGISTRY_OBJECT_ID);
  checkAddress('OWNER_ADDRESS', process.env.OWNER_ADDRESS);

  // Check URLs
  if (!process.env.SUI_RPC) {
    errors.push('SUI_RPC is not set');
  } else if (!process.env.SUI_RPC.startsWith('http')) {
    errors.push('SUI_RPC must start with http:// or https://');
  } else {
    console.log('✅ SUI_RPC:', process.env.SUI_RPC);
  }

  // Check Walrus
  if (!process.env.WALRUS_NETWORK) {
    warnings.push('WALRUS_NETWORK is not set, defaulting to testnet');
  } else {
    console.log('✅ WALRUS_NETWORK:', process.env.WALRUS_NETWORK);
  }

  // Check numeric values
  const batchSize = parseInt(process.env.BATCH_SIZE || '0');
  if (batchSize <= 0) {
    errors.push('BATCH_SIZE must be a positive number');
  } else {
    console.log('✅ BATCH_SIZE:', batchSize);
  }

  const batchTime = parseInt(process.env.BATCH_TIME_MS || '0');
  if (batchTime <= 0) {
    errors.push('BATCH_TIME_MS must be a positive number');
  } else {
    console.log('✅ BATCH_TIME_MS:', batchTime, 'ms');
  }

  const wsPort = parseInt(process.env.WS_PORT || '0');
  if (wsPort <= 0) {
    warnings.push('WS_PORT is not set, defaulting to 8081');
  } else {
    console.log('✅ WS_PORT:', wsPort);
  }

  // Print results
  console.log('\n' + '='.repeat(80));

  if (errors.length > 0) {
    console.log('❌ ERRORS:');
    errors.forEach((err) => console.log(`   - ${err}`));
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    warnings.forEach((warn) => console.log(`   - ${warn}`));
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ ALL ENVIRONMENT VARIABLES ARE VALID!');
  }

  console.log('='.repeat(80));

  return errors.length === 0;
}

const isValid = validateEnv();
process.exit(isValid ? 0 : 1);