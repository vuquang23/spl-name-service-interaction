require('dotenv').config()
const Base58 = require('base-58')
const {web3, InstructionCoder} = require('@project-serum/anchor')
const { 
    createNameRegistry, 
    signAndSendTransactionInstructions, 
    NameRegistryState,
    getHashedName,
    getNameAccountKey,
    updateNameRegistryData
} = require('@solana/spl-name-service')

const { TOKEN_PROGRAM_ID, Token } = require("@solana/spl-token")

const {
    Keypair, Connection, PublicKey, Transaction
} = web3

const BEIN_ADMIN_SECRET_KEY = process.env.BEIN_ADMIN_SECRET_KEY
const ADMIN_KEYPAIR = new Keypair(Keypair.fromSecretKey(Base58.decode(BEIN_ADMIN_SECRET_KEY)))
const BEIN_USER_SECRET_KEY = process.env.BEIN_USER_SECRET_KEY
const BEIN_USER_KEYPAIR = new Keypair(Keypair.fromSecretKey(Base58.decode(BEIN_USER_SECRET_KEY)))
const BEIN_USER_2_SECRET_KEY = process.env.BEIN_USER_2_SECRET_KEY
const BEIN_USER_2_KEYPAIR = new Keypair(Keypair.fromSecretKey(Base58.decode(BEIN_USER_2_SECRET_KEY)))

const MAINNET = 'https://api.mainnet-beta.solana.com'
const DEVNET = 'https://api.devnet.solana.com'

const CONNECTION = new Connection(DEVNET)
const BIC = new Token(CONNECTION, new web3.PublicKey('TVS2vUYedu5SPHzanWVKWmoQKGbwPeuT3QB9JBpCrLm'), TOKEN_PROGRAM_ID, BEIN_USER_KEYPAIR)

async function createTLD(name) {
    const instructions = []

    const initNameRegInstr = await createNameRegistry(CONNECTION, name, 200, ADMIN_KEYPAIR.publicKey, ADMIN_KEYPAIR.publicKey) 
    instructions.push(
        initNameRegInstr
    )
    const receipt = await signAndSendTransactionInstructions(
        CONNECTION,
        [ADMIN_KEYPAIR],
        ADMIN_KEYPAIR,
        instructions
    )
    console.log(receipt)
}

// nameClass + parentName: pubkey
async function createSubDomainInstr(name, nameOwnerPubKey, nameClassPubkey, parentNamePubkey, parentNameOwnerPubkey) {
    const initNameRegInstr = await createNameRegistry(
        CONNECTION,
        name,
        100,
        ADMIN_KEYPAIR.publicKey,
        nameOwnerPubKey,
        undefined,
        nameClassPubkey,
        parentNamePubkey
    )
    return initNameRegInstr
}

async function createUpdateInstr(name, offset, data, nameClassPubkey, nameParentPubkey) {
    const updateNameInstr = await updateNameRegistryData(
        CONNECTION,
        name,
        offset,
        Buffer.from(data),
        nameClassPubkey,
        nameParentPubkey
    )
    return updateNameInstr
}

async function createTransferBICInstr(from, amount, signers) {
    const tokenAccFrom = (await BIC.getOrCreateAssociatedAccountInfo(from)).address
    const tokenAccTo = (await BIC.getOrCreateAssociatedAccountInfo(ADMIN_KEYPAIR.publicKey)).address
    const instruction = Token.createTransferInstruction(TOKEN_PROGRAM_ID, tokenAccFrom, tokenAccTo, from, signers, amount) 
    return instruction
}

async function createAndSendTx(instructions, signerKeypairs) {
    const tx = new Transaction().add(...instructions)
    tx.feePayer = ADMIN_KEYPAIR.publicKey
    tx.recentBlockhash = (await CONNECTION.getRecentBlockhash()).blockhash
    tx.partialSign(...signerKeypairs)
    const rawTx = tx.serialize()
    const receipt = await CONNECTION.sendRawTransaction(rawTx)
    console.log('receipt:\n', receipt)
}

async function main() {
    //TODO: create top level domain first if you dont have any TLD
    // await createTLD('bein')
    const parentName = new PublicKey('BnytGRLSXpagnHJ2vfmGoP9CxpsXWXoujTR3pe2dvxJa') // TLD pubkey

    //TODO: after having a TLD
    // level 1
    const name = 'blockchain_team'
    await createAndSendTx([
        await createSubDomainInstr(name, BEIN_USER_KEYPAIR.publicKey, undefined, parentName, ADMIN_KEYPAIR.publicKey),
        // reverse name account
        await createSubDomainInstr(BEIN_USER_KEYPAIR.publicKey.toBase58(), BEIN_USER_KEYPAIR.publicKey, ADMIN_KEYPAIR.publicKey, parentName, ADMIN_KEYPAIR.publicKey),
        // write data to reverse name
        await createUpdateInstr(BEIN_USER_KEYPAIR.publicKey.toBase58(), 0, name, ADMIN_KEYPAIR.publicKey, parentName),
        // pay fees with BIC
        await createTransferBICInstr(BEIN_USER_KEYPAIR.publicKey, 2, [BEIN_USER_KEYPAIR])
    ], [
        ADMIN_KEYPAIR,
        BEIN_USER_KEYPAIR,
    ])
}

main()
