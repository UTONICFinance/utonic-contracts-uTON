import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV4, Address } from "@ton/ton";
import Minter from "../wrappers/Minter"; // this is the interface class we just implemented
import ProxyLSTTon from "../wrappers/proxy/proxyLSTTon/ProxyLSTTon";
import TestMinter from "../wrappers/test/jetton/TestMinter";
import TestJettonWallet from "../wrappers/test/jetton/TestJettonWallet";

export async function run() {
  // initialize ton rpc client on testnet
  const endpoint = await getHttpEndpoint({ network: "testnet" });
  const client = new TonClient({ endpoint });

  // open wallet v4 (notice the correct wallet version here)
  const mnemonic = ""; // your 24 secret words (replace ... with the rest of the words)
  const key = await mnemonicToWalletKey(mnemonic.split(" "));
  const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
//   if (!await client.isContractDeployed(wallet.address)) {
//     return console.log("wallet is not deployed");
//   }

  // open wallet and read the current seqno of the wallet
  const walletContract = client.open(wallet);
  const walletSender = walletContract.sender(key.secretKey);
  const seqno = await walletContract.getSeqno();

  const proxyLSTTonAddressStr = "";
  const proxyLSTTonAddress = Address.parse(proxyLSTTonAddressStr);

  const lstTonMinterAddressStr = "";
  const lstTonMinterAddress = Address.parse(lstTonMinterAddressStr);
  const lstTonMinter = new TestMinter(lstTonMinterAddress);
  const lstTonMinterContract = client.open(lstTonMinter);
  
  const lstTonWalletAddress = await lstTonMinterContract.getWalletAddress(wallet.address);
  console.log('owner lst ton wallet address: ', lstTonWalletAddress.toString());

  const lstTonWallet = new TestJettonWallet(lstTonWalletAddress);
  const lstTonWalletContract = client.open(lstTonWallet);

  await lstTonWalletContract.sendTransfer(walletSender, 1, 1000000000n, proxyLSTTonAddress, wallet.address, "1.0", "0.5");

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