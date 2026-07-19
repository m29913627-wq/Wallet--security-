# Scaffold notes

- To run tests:
  1. npm install
  2. npx hardhat test

- The tests use ethers.js _signTypedData which mirrors EIP-712 signing performed by hardware wallets.

- After reviewing and iterating, call `freezeForever()` (owner-only) to permanently lock deposit functionality.
