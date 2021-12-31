const {NameRegistryState, getHashedName, getNameAccountKey, ReverseTwitterRegistryState } = require('@solana/spl-name-service')
const {web3, Wallet, Provider, BN} = require('@project-serum/anchor')


function printLog(entity) {
    Object.keys(entity).forEach(key => {
        console.log(key)
        console.log(entity[key].toString() + '\n')
    });
}

const MAINNET = 'https://api.mainnet-beta.solana.com'
const DEVNET = 'https://api.devnet.solana.com'

const CONNECTION = new web3.Connection(DEVNET)

async function getInfo(address) {
  let name = await NameRegistryState.retrieve(CONNECTION, new web3.PublicKey(address));
  printLog(name)
}

async function main() { 
  // const hashedName = await getHashedName('bein')
  // const nameAccountKey = await getNameAccountKey(
  //   hashedName,
  //   undefined,
  //   undefined,
  // ) 
  // console.log(nameAccountKey.toString())
  await getInfo('8o9VgJR6bimMdTwiaAMrepfN1osmM2Z1QcnGi8QYD4th')
}


main()
