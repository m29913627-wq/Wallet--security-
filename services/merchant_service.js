// Simple merchant microservice example (merchant_service.js)
// Emulates a merchant signing service. In production replace the in-process private key
// with an HSM, hardware signer, or multisig coordination.

const { ethers } = require('ethers');
const abi = require('../artifacts/contracts/TwoPartyEscrow.sol/TwoPartyEscrow.json').abi;
require('dotenv').config();

const ESCROW_ADDRESS = process.env.ESCROW_ADDRESS;
const PROVIDER_URL = process.env.PROVIDER_URL || 'http://localhost:8545';
const MERCHANT_PRIVATE_KEY = process.env.MERCHANT_PRIVATE_KEY; // emulated HSM

if (!ESCROW_ADDRESS || !MERCHANT_PRIVATE_KEY) {
  console.error('Please set ESCROW_ADDRESS and MERCHANT_PRIVATE_KEY in .env');
  process.exit(1);
}

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
  const wallet = new ethers.Wallet(MERCHANT_PRIVATE_KEY, provider);
  const escrow = new ethers.Contract(ESCROW_ADDRESS, abi, provider);

  console.log('Merchant service running as', wallet.address);

  // Watch for Deposited events and auto-sign simple releases (for demo only)
  escrow.on('Deposited', async (escrowId, depositor, merchant, amount, expiry, event) => {
    try {
      console.log('Deposited event', { escrowId, depositor, merchant, amount: amount.toString(), expiry: expiry.toString() });

      // basic validation: only sign if merchant matches us and expiry in future
      if (merchant.toLowerCase() !== wallet.address.toLowerCase()) return;
      if (Number(expiry) <= Math.floor(Date.now() / 1000)) return;

      // Build typed data as in docs
      const domain = {
        name: 'TwoPartyEscrow',
        version: '1',
        chainId: (await provider.getNetwork()).chainId,
        verifyingContract: ESCROW_ADDRESS
      };

      const types = {
        Release: [
          { name: 'escrowId', type: 'bytes32' },
          { name: 'recipient', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'expiry', type: 'uint256' }
        ]
      };

      // In a real flow merchant would check order backend or off-chain data. For demo auto-approve recipient=depositor
      const recipient = depositor;

      // Fetch escrow nonce via storage read (we don't have a getter for nonce alone, so read struct)
      const esc = await escrow.escrows(escrowId);
      const nonce = esc.nonce;
      const tokenAddr = esc.token;
      const value = {
        escrowId: escrowId,
        recipient: recipient,
        token: tokenAddr,
        amount: amount,
        nonce: nonce.toNumber ? nonce.toNumber() : Number(nonce),
        expiry: expiry
      };

      // merchant signs
      const merchantSig = await wallet._signTypedData(domain, types, value);
      console.log('Merchant signature:', merchantSig);

      // For demo: store merchantSig for relayer or notify depositor
      // In production you would store this signature in a secure database or return to depositor via secure channel.

    } catch (err) {
      console.error('Error handling Deposited', err);
    }
  });
}

main().catch(console.error);
