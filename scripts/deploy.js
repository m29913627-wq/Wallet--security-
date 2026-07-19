// scripts/deploy.js - Hardhat deploy script (example)
const hre = require('hardhat');

async function main() {
  const TwoParty = await hre.ethers.getContractFactory('TwoPartyEscrow');
  const escrow = await TwoParty.deploy();
  await escrow.deployed();
  console.log('TwoPartyEscrow deployed to', escrow.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
