# Deploy to Base testnet (or other L2)

This document explains how to deploy the TwoPartyEscrow contract to a testnet (we recommend Base testnet for low fees).

1) Setup environment
- Create a .env file in repo root with:

PROVIDER_URL=<YOUR_RPC_URL>
PRIVATE_KEY=<DEPLOYER_PRIVATE_KEY>
ESCROW_ADDRESS= (updated after deploy)

2) Install deps
- npm install

3) Compile and deploy
- npx hardhat compile
- npx hardhat run --network localhost scripts/deploy.js

To deploy to Base testnet, add a network config to hardhat.config.js and run with --network <basename>.

4) After deploy
- Note the contract address; set ESCROW_ADDRESS in .env for the merchant service and relayer.

5) Run merchant service (demo HSM)
- Set MERCHANT_PRIVATE_KEY in .env to emulate HSM.
- node services/merchant_service.js

6) Run relayer (demo)
- Set RELAYER_PRIVATE_KEY and ensure ESCROW_ADDRESS is set
- Create depositSig.json with depositorSig & merchantSig payload and run node services/relayer.js

Security: In production replace in-process private keys with real HSM or multisig signing flows. Do not store private keys in plaintext.
