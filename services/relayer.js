// Simple relayer example (relayer.js)
// Accepts depositor+merchant signatures (for demo, reads merchantSig from environment or a file)
// then submits the release transaction to the blockchain on behalf of a payer-relayer.

const { ethers } = require('ethers');
const abi = require('../artifacts/contracts/TwoPartyEscrow.sol/TwoPartyEscrow.json').abi;
require('dotenv').config();

const PROVIDER_URL = process.env.PROVIDER_URL || 'http://localhost:8545';
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY; // pays gas
const ESCROW_ADDRESS = process.env.ESCROW_ADDRESS;

if (!RELAYER_PRIVATE_KEY || !ESCROW_ADDRESS) {
  console.error('Please set RELAYER_PRIVATE_KEY and ESCROW_ADDRESS in .env');
  process.exit(1);
}

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
  const relayer = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
  const escrow = new ethers.Contract(ESCROW_ADDRESS, abi, relayer);

  console.log('Relayer running as', relayer.address);

  // For demo we will read a JSON file depositSig.json containing fields below (in production use API)
  // { escrowId, recipient, token, amount, nonce, expiry, depositorSig, merchantSig }

  const fs = require('fs');
  const path = './depositSig.json';

  if (!fs.existsSync(path)) {
    console.log('No depositSig.json found — create one with depositorSig and merchantSig to relay a release.');
    return;
  }

  const payload = JSON.parse(fs.readFileSync(path));
  console.log('Loaded payload', payload);

  // Submit release
  const tx = await escrow.release(
    payload.escrowId,
    payload.recipient,
    payload.token,
    payload.amount,
    payload.nonce,
    payload.expiry,
    payload.depositorSig,
    payload.merchantSig,
    { gasLimit: 500_000 }
  );

  console.log('Release tx submitted', tx.hash);
  const rc = await tx.wait();
  console.log('Mined in', rc.blockNumber);
}

main().catch(console.error);
