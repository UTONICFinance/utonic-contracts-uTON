import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV4, Address } from "@ton/ton";
import Minter from "../wrappers/Minter"; // this is the interface class we just implemented
import { loadIni } from "../libs/config";

export async function run() {
  const config = loadIni("config.ini");
  // initialize ton rpc client on testnet
  const endpoint = await getHttpEndpoint({ network: config.network });
  const client = new TonClient({ endpoint });

  // open wallet v4 (notice the correct wallet version here)
  const mnemonic = config.words;
  const key = await mnemonicToWalletKey(mnemonic.split(" "));
  const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
//   if (!await client.isContractDeployed(wallet.address)) {
//     return console.log("wallet is not deployed");
//   }

  // open wallet and read the current seqno of the wallet
  const walletContract = client.open(wallet);
  const walletSender = walletContract.sender(key.secretKey);
  const seqno = await walletContract.getSeqno();

  // open Counter instance by address
  const minterAddressStr = config.utonic_minter;
  const minterAddress = Address.parse(minterAddressStr); // replace with your address from step 8
  const minter = new Minter(minterAddress);
  const minterContract = client.open(minter);

  const proxyAddressStr = config.proxy;
  const proxyAddress = Address.parse(proxyAddressStr);
  const proxyId = Number(config.proxy_id);
  const proxyType = Number(config.proxy_type);
  // send the increment transaction

  await minterContract.sendSetProxyWhitelist(walletSender, 1, proxyId, proxyType, proxyAddress, "0.02");

  // wait until confirmed
  let currentSeqno = seqno;
  while (currentSeqno == seqno) {
    console.log("waiting for transaction to confirm...");
    await sleep(1500);
    currentSeqno = await walletContract.getSeqno();
  }
  console.log("transaction confirmed!");
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
