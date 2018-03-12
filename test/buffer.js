/* global  artifacts:true, web3: true, contract: true */
import chaiAsPromised from 'chai-as-promised'
import chai from 'chai'
import { ether } from '../scripts/constants'
import { watchNextEvent } from '../scripts/events'

chai.use(chaiAsPromised)
    .use(require('chai-bignumber')(web3.BigNumber))
    .should()

const RewardsStorageProxy = artifacts.require('./libraries/RewardsStorageProxy.sol')
const CryptoFiatStorageProxy = artifacts.require('./libraries/CryptoFiatStorageProxy.sol')
const CryptoDollarStorageProxy = artifacts.require('./libraries/CryptoDollarStorageProxy.sol')
const SafeMath = artifacts.require('./libraries/SafeMath.sol')
const CryptoDollar = artifacts.require('./CryptoDollar.sol')
const CryptoFiatHub = artifacts.require('./CryptoFiatHub.sol')
const ProofToken = artifacts.require('./mocks/ProofToken.sol')
const Store = artifacts.require('./Store.sol')
const Rewards = artifacts.require('./Rewards.sol')

contract('Buffer', (accounts) => {
  let rewardsStorageProxy, cryptoFiatStorageProxy, cryptoDollarStorageProxy, safeMath
  let store, proofToken, cryptoDollar, rewards, cryptoFiatHub
  let fund = accounts[0]
  let wallet1 = accounts[2]
  let initialExchangeRate = { asString: '20000', asNumber: 20000 }
  let updatedExchangeRate = { asString: '2000', asNumber: 2000 }
  let collateral = 1 * ether
  let payment = 1 * ether
  let rewardsFee = 0.005 * payment
  let bufferFee = 0.005 * payment
  let blocksPerEpoch = 20

  /*
  The initial exchange rate is equal to 1 ETH = 100 USD (in cents, exchangeRate = 10000)
  The contract is initially capitalized with 1 ether
  The first user (wallet1) buys 1000 tokens therefore the contract state is initially:

  buffer = contractbalance - outstanding = 2 ether - ~1000 cryptodollar tokens = 2 ether - 10 ether = 1 ether
  buffer > 0

  The exchange rate drops and is now equal to 1 ETH = 10 USD (in cents, exchangeRate = 100)

  buffer = contractbalance - outstanding = 11 ether - 1000 cryptodollar tokens = 11 ether - 100 ether = - 89 ether
  **/
  beforeEach(async() => {
    // Libraries are deployed before the rest of the contracts. In the testing case, we need a clean deployment
    // state for each test so we redeploy all libraries an other contracts every time.
    let deployedLibraries = await Promise.all([
      RewardsStorageProxy.new(),
      CryptoFiatStorageProxy.new(),
      CryptoDollarStorageProxy.new(),
      SafeMath.new()
    ])

    rewardsStorageProxy = deployedLibraries[0]
    cryptoFiatStorageProxy = deployedLibraries[1]
    cryptoDollarStorageProxy = deployedLibraries[2]
    safeMath = deployedLibraries[3]

    // Libraries are linked to each contract
    await Promise.all([
      ProofToken.link(SafeMath, safeMath.address),
      CryptoDollar.link(CryptoDollarStorageProxy, cryptoDollarStorageProxy.address),
      CryptoDollar.link(CryptoFiatStorageProxy, cryptoFiatStorageProxy.address),
      CryptoDollar.link(SafeMath, safeMath.address),
      CryptoFiatHub.link(CryptoFiatStorageProxy, cryptoFiatStorageProxy.address),
      CryptoFiatHub.link(RewardsStorageProxy, rewardsStorageProxy.address),
      CryptoFiatHub.link(SafeMath, safeMath.address),
      Rewards.link(CryptoFiatStorageProxy, cryptoFiatStorageProxy.address),
      Rewards.link(RewardsStorageProxy, rewardsStorageProxy.address),
      Rewards.link(SafeMath, safeMath.address)
    ])

    store = await Store.new()
    proofToken = await ProofToken.new()
    cryptoDollar = await CryptoDollar.new(store.address)
    rewards = await Rewards.new(store.address, proofToken.address)
    cryptoFiatHub = await CryptoFiatHub.new(cryptoDollar.address, store.address, proofToken.address, rewards.address)

    await Promise.all([
      store.authorizeAccess(cryptoFiatHub.address),
      store.authorizeAccess(cryptoDollar.address),
      store.authorizeAccess(rewards.address)
    ])

    await Promise.all([
      cryptoDollar.authorizeAccess(cryptoFiatHub.address),
      cryptoFiatHub.initialize(blocksPerEpoch),
      cryptoFiatHub.capitalize({ from: fund, value: collateral })
    ])
  })

  describe('Initial Buffer State', async () => {
    it('contract balance should be equal to initial collateral', async() => {
      let contractBalance = await cryptoFiatHub.contractBalance()
      contractBalance.should.be.bignumber.equal(collateral)
    })

    it('total outstanding should be equal to 0', async() => {
      let totalOutstanding = await cryptoFiatHub.totalOutstanding(initialExchangeRate.asNumber)
      totalOutstanding.should.be.bignumber.equal(0)
    })

    it('buffer should be equal to the initial collateral', async() => {
      let buffer = await cryptoFiatHub.buffer(initialExchangeRate.asNumber)
      buffer.should.be.bignumber.equal(collateral)
    })
  })

  describe('Buffer state', async () => {
    beforeEach(async() => {
      await cryptoFiatHub.buyCryptoDollar({ from: wallet1, value: 1 * ether })
      let { queryId } = await watchNextEvent(cryptoFiatHub)
      await cryptoFiatHub.__callback(queryId, initialExchangeRate.asString)
    })

    // The oraclizeFee is also removed from the payment value. The oraclize fee basically pays for the callback function
    it('contract balance should be equal to (collateral + payment - rewards fee)', async () => {
      let balance = await cryptoFiatHub.contractBalance()
      let expectedBalance = collateral + payment - rewardsFee
      balance.should.be.bignumber.equal(expectedBalance)
    })

    it('total outstanding should be equal to (collateral - rewards fee - buffer fee)', async () => {
      let totalOutstanding = await cryptoFiatHub.totalOutstanding(initialExchangeRate.asNumber)
      let expectedTotalOutstanding = payment - rewardsFee - bufferFee
      totalOutstanding.should.be.bignumber.equal(expectedTotalOutstanding)
    })

    it('buffer should be equal to (collateral + buffer fee)', async () => {
      let buffer = await cryptoFiatHub.buffer(initialExchangeRate.asNumber)
      let expectedBuffer = collateral + bufferFee
      buffer.should.be.bignumber.equal(expectedBuffer)
    })
  })

  describe('Buffer (Unpegged) state', async () => {
    beforeEach(async() => {
      await cryptoFiatHub.buyCryptoDollar({ from: wallet1, value: ether })
      let { queryId } = await watchNextEvent(cryptoFiatHub)
      await cryptoFiatHub.__callback(queryId, initialExchangeRate.asString)
    })

    it('contract balance should be equal to (collateral + payment - rewards fee)', async () => {
      let balance = await cryptoFiatHub.contractBalance()
      let expectedBalance = collateral + payment - rewardsFee
      balance.should.be.bignumber.equal(expectedBalance)
    })

    it('total outstanding should be equal to (total cryptodollar supply) * (exchange rate)', async () => {
      let totalOutstanding = await cryptoFiatHub.totalOutstanding(updatedExchangeRate.asNumber)
      let tokenSupply = await cryptoFiatHub.cryptoDollarTotalSupply()
      let expectedTotalOutstanding = tokenSupply.times(ether).div(updatedExchangeRate.asNumber)
      totalOutstanding.should.be.bignumber.equal(expectedTotalOutstanding)
    })

    it('buffer should be negative', async () => {
      let contractBalance = await cryptoFiatHub.contractBalance()
      let totalOutstanding = await cryptoFiatHub.totalOutstanding(updatedExchangeRate.asNumber)
      contractBalance.minus(totalOutstanding).should.be.bignumber.below(0)
    })

    it('buffer should be equal to initial collateral + payment - rewards fee - token supply * exchange rate', async () => {
      let bufferValue = await cryptoFiatHub.buffer(updatedExchangeRate.asNumber)
      let tokenSupply = await cryptoFiatHub.cryptoDollarTotalSupply()
      let expectedBalance = new web3.BigNumber(collateral + payment - rewardsFee)
      let expectedOutstandingValue = tokenSupply.times(ether).div(updatedExchangeRate.asNumber)
      let expectedBufferValue = expectedBalance.minus(expectedOutstandingValue)
      bufferValue.should.be.bignumber.equal(expectedBufferValue)
    })
  })
})
