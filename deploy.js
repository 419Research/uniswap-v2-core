const { Contract, ContractFactory, Wallet, providers, utils } = require('ethers')

const factoryArtifact = require('./build/UniswapV2Factory.json')
const tokenArtifact = require('./build/KRC20Token.json')
const routerArtifact = require('./UniswapV2Router02.json')
const pairArtifact = require('./IUniswapV2Pair.json')

// Custom instance
/*const KAKAROT_RPC_PROVIDER = "https://58bb-2a01-e0a-e08-83f0-8058-9f8f-fb68-86c3.ngrok-free.app";

const PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const ROUTER_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
const FACTORY_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const USDC_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
const WETH_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";*/

// Testnet Sepolia

const KAKAROT_RPC_PROVIDER = 'https://sepolia-rpc.kakarot.org'
const ADDRESS = '0x208d126001Fc7d1465b2803e3A2d7aA7Aed27FC9'
const PRIVATE_KEY = '0417d5ab682d00e64ef8c3de52bc6e90c66203290b1049714169e998aa69bcc7'

/*const FACTORY_ADDRESS = "0x9DDe87ebD19121103ad16Fbe1E2e3C13e85e4B55";
const ROUTER_ADDRESS = "0x0c57aDE4B3Ff9d4A5B75FFDbF1F1bf88Fd527617";

const USDC_ADDRESS = "0x7705242aDD460245a443FdCeF0F429655218F5DB";
const WETH_ADDRESS = "0xABB387976f4F0fe2013bD449D9DBBD10873d89BC";
const USDT_ADDRESS = "0xBDa8a3813211e783a7e613743bF6E33cE1DA0038";*/

const parseUnits = utils.parseUnits

let kakarotHttpProvider = new providers.JsonRpcProvider(KAKAROT_RPC_PROVIDER)
let owner = new Wallet(PRIVATE_KEY, kakarotHttpProvider)

/****************************************/
/*************** BASICS *****************/
/****************************************/

const approve = async (spender, token, amount) => {
  console.log(
    'Approving spender = ' +
      spender +
      ' & token = ' +
      token +
      ' & amount = ' +
      amount +
      '(' +
      parseUnits(amount, 18).toString() +
      ')'
  )
  const tokenContract = new Contract(token, tokenArtifact.abi, owner)

  const tx = await tokenContract.approve(
    spender,
    parseUnits(amount, 18).toString()
    // {nonce: nonce++}
  )
  await tx.wait()
  console.log(token + ' Approved!')
}

const addLiquidity = async (routerAddress, token0, token1, amountToken0, amountToken1) => {
  const router = new Contract(routerAddress, routerArtifact.abi, owner)
  const tx = await router.addLiquidity(
    token0,
    token1,
    parseUnits(amountToken0, 18).toString(),
    parseUnits(amountToken1, 18).toString(),
    '0',
    '0',
    owner.address,
    1915961880000 // 2030
    // {nonce: nonce++}
  )
  console.log(tx)
  const t = await tx.wait()
  console.log(t)

  console.log('Liquidity added')
}

const initAMM = async () => {
  console.log('Deploy UniV2 AMM to Kakrot zk-EVM')
  console.log('-- Deployer && Owner: ' + owner.address)
  try {
    // Deploy factory
    const Factory = new ContractFactory(factoryArtifact.abi, factoryArtifact.bytecode, owner)
    const factory = await Factory.deploy(owner.address)
    console.log('Deployed factory at address = ' + factory.address)

    // sleep for 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Deploy Token USDC
    const USDC = new ContractFactory(tokenArtifact.abi, tokenArtifact.bytecode, owner)
    const usdc = await USDC.deploy('USD Coin', 'USDC', 1000000)
    console.log('Deployed USDC at address = ' + usdc.address)

    // sleep for 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Deploy Token WETH
    const WETH = new ContractFactory(tokenArtifact.abi, tokenArtifact.bytecode, owner)

    // Deploy UniV2 router, giving WETH & Factory address
    const weth = await WETH.deploy('Wrapped Eth', 'WETH', 1000000)
    console.log('Deployed WETH at address = ' + weth.address)

    // sleep for 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000))

    const Router = new ContractFactory(routerArtifact.abi, routerArtifact.bytecode, owner)
    const router = await Router.deploy(factory.address, weth.address)
    console.log('Deployed router at address = ' + router.address)

    // sleep for 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Aprove tokens & add liquidity
    // This will trigger pair creation by UniV2 router
    console.log('Add 1 WETH & 3000 USDC liquidity...')
    approve(router.address, usdc.address, '3000')
    // sleep for 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000))
    approve(router.address, weth.address, '1')
    // sleep for 10 seconds
    await new Promise(resolve => setTimeout(resolve, 10000))
    addLiquidity(router.address, usdc.address, weth.address, '3000', '1')
  } catch (e) {
    console.log(e)
  }
}

/****************************************/
/*************** HELPERS ****************/
/****************************************/

const createPair = async (token1Address, token2Address, factoryAddress) => {
  const factory = new Contract(factoryAddress, factoryArtifact.abi, owner)
  const tx = await factory.createPair(token1Address, token2Address)
  await tx.wait()
  const pairAddress = await factory.getPair(token1Address, token2Address)
  console.log(`Pair deployed to ${pairAddress}`)
}

const deployToken = async () => {
  const USDC = new ContractFactory(tokenArtifact.abi, tokenArtifact.bytecode, owner)

  const usdc = await USDC.deploy('Tether USD', 'USDT', 1000000)
  console.log('Deployed USDT at address = ' + usdc.address)
}

const call = async () => {
  const WETH = new Contract(USDC_ADDRESS, tokenArtifact.abi, owner)
  // const result = await WETH.balanceOf(owner.address);
  const result = await WETH.name()
  console.log(result)
}

const allowance = async () => {
  const WETH = new Contract(USDC_ADDRESS, tokenArtifact.abi, owner)
  // const result = await WETH.balanceOf(owner.address);
  const result = await WETH.allowance(owner.address, ROUTER_ADDRESS)
  console.log(result)
}

const getReserves = async () => {
  const pair = new Contract('0xA7c620407Fd643DAd138b45d766eDDe0C667808C', pairArtifact.abi, owner)
  // const result = await WETH.balanceOf(owner.address);
  const result = await pair.getReserves()
  console.log(result)
}

const testKey = () => {
  console.log(owner.address)
}

const getTxStatus = async hash => {
  const receipt = await kakarotHttpProvider.getTransactionReceipt(hash)
  console.log(receipt)
}

/****************************************/
/***************** CMD ******************/
/****************************************/

// - Deploy UniV2 AMM with 2 tokens & addLiquidity
initAMM()

// - Already deployed pairs
// WETH - USDC -> 0xA7c620407Fd643DAd138b45d766eDDe0C667808C
// createPair(WETH_ADDRESS, USDC_ADDRESS, FACTORY_ADDRESS);

// - Add liquidity
// approve('0x7a67EE2b3D84477b69B7726f4c6967bd3cf63719', '0x8677Ea144bdB43fbE6E62058FA3C52E67D1136Cf', "3000");
// approve('0x0c57aDE4B3Ff9d4A5B75FFDbF1F1bf88Fd527617','0xABB387976f4F0fe2013bD449D9DBBD10873d89BC', "1");
// addLiquidity('0x0c57aDE4B3Ff9d4A5B75FFDbF1F1bf88Fd527617',  '0x7705242aDD460245a443FdCeF0F429655218F5DB', '0xABB387976f4F0fe2013bD449D9DBBD10873d89BC', "3000", "1");
// getReserves();

// - Deploy a token
// deployToken();

// - Other
// getTxStatus("0xccd3c6a0406c2373b54784e633e66688419bb416656a51255df9268db6395ae6");
// testKey();
// call();
// allowance();

// const testDeployFactory = async () => {
//   // Deploy factory
//   const Factory = new ContractFactory(factoryArtifact.abi, factoryArtifact.bytecode, owner)
//   const factory = await Factory.deploy(owner.address)
//   console.log(factory)
//   console.log('Deployed factory at address = ' + factory.address)
// }

// testDeployFactory()
