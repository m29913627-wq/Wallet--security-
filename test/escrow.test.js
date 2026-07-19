const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TwoPartyEscrow", function () {
  let Escrow, escrow, depositor, merchant, attacker, recipient, owner;

  beforeEach(async function () {
    [owner, depositor, merchant, attacker, recipient] = await ethers.getSigners();
    Escrow = await ethers.getContractFactory("TwoPartyEscrow");
    escrow = await Escrow.connect(owner).deploy();
    await escrow.deployed();
  });

  it("deposit and release with valid signatures", async function () {
    // depositor deposits 1 ETH to merchant
    const expiry = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour
    const tx = await escrow.connect(depositor).deposit(merchant.address, expiry, { value: ethers.utils.parseEther("1.0") });
    const rc = await tx.wait();
    const ev = rc.events.find(e => e.event === 'Deposited');
    const escrowId = ev.args.escrowId;

    // Build EIP-712 data
    const domain = {
      name: 'TwoPartyEscrow',
      version: '1',
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: escrow.address
    };

    const types = {
      Release: [
        { name: 'escrowId', type: 'bytes32' },
        { name: 'recipient', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'expiry', type: 'uint256' }
      ]
    };

    const value = {
      escrowId: escrowId,
      recipient: recipient.address,
      amount: ethers.utils.parseEther("1.0"),
      nonce: 0,
      expiry: expiry
    };

    // depositor signs
    const depositorSig = await depositor._signTypedData(domain, types, value);
    const merchantSig = await merchant._signTypedData(domain, types, value);

    // release
    await expect(escrow.connect(depositor).release(escrowId, recipient.address, ethers.utils.parseEther("1.0"), 0, expiry, depositorSig, merchantSig))
      .to.emit(escrow, 'Released');

    // attacker cannot re-release
    await expect(escrow.connect(attacker).release(escrowId, recipient.address, ethers.utils.parseEther("1.0"), 0, expiry, depositorSig, merchantSig))
      .to.be.revertedWith('Not active');
  });

  it("fails release with missing or wrong signature", async function () {
    const expiry = Math.floor(Date.now() / 1000) + 60 * 60;
    const tx = await escrow.connect(depositor).deposit(merchant.address, expiry, { value: ethers.utils.parseEther("0.5") });
    const rc = await tx.wait();
    const ev = rc.events.find(e => e.event === 'Deposited');
    const escrowId = ev.args.escrowId;

    const domain = {
      name: 'TwoPartyEscrow',
      version: '1',
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: escrow.address
    };

    const types = {
      Release: [
        { name: 'escrowId', type: 'bytes32' },
        { name: 'recipient', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'expiry', type: 'uint256' }
      ]
    };

    const value = {
      escrowId: escrowId,
      recipient: recipient.address,
      amount: ethers.utils.parseEther("0.5"),
      nonce: 0,
      expiry: expiry
    };

    const depositorSig = await depositor._signTypedData(domain, types, value);
    const wrongMerchantSig = await attacker._signTypedData(domain, types, value);

    await expect(escrow.connect(depositor).release(escrowId, recipient.address, ethers.utils.parseEther("0.5"), 0, expiry, depositorSig, wrongMerchantSig))
      .to.be.revertedWith('Invalid merchant signature');
  });

  it("refund after expiry", async function () {
    const expiry = Math.floor(Date.now() / 1000) + 1; // 1 second
    const tx = await escrow.connect(depositor).deposit(merchant.address, expiry, { value: ethers.utils.parseEther("0.1") });
    const rc = await tx.wait();
    const ev = rc.events.find(e => e.event === 'Deposited');
    const escrowId = ev.args.escrowId;

    // wait for expiry
    await new Promise(resolve => setTimeout(resolve, 1500));

    await expect(escrow.connect(depositor).refund(escrowId)).to.emit(escrow, 'Refunded');
  });
});
