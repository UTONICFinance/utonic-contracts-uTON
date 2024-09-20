import * as fs from "fs";

import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV4, Address, Slice, Cell } from "@ton/ton";
import Minter from "../wrappers/Minter"; // this is the interface class we just implemented

export async function run() {

  // initialize ton rpc client on testnet
  const endpoint = await getHttpEndpoint({ network: "testnet" });
  const client = new TonClient({ endpoint });

  const minterCode = Cell.fromBoc(fs.readFileSync("build/minter.cell"))[0];
  
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

  // open Counter instance by address
  const minterAddressStr = "";
  const minterAddress = Address.parse(minterAddressStr); // replace with your address from step 8
  const minter = new Minter(minterAddress);
  const minterContract = client.open(minter);

  // send the increment transaction
  minterAddress.toRawString
  const contentObject = {
    "address": minterAddress.toRawString(),
    "name": "utonic TON",
    "symbol": "uTON",
    "decimals": "9",
    "image": "https://cache.tonapi.io/imgproxy/cOMlJuViiVXDCkAghnyNj7plX8pAZ9pv3WhklvebpTY/rs:fill:200:200:1/g:no/aHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3RvbmtlZXBlci9vcGVudG9uYXBpL21hc3Rlci9wa2cvcmVmZXJlbmNlcy9tZWRpYS90b2tlbl9wbGFjZWhvbGRlci5wbmc.webp",
    "description": "Testnet token to test"
  }
  minterContract.sendUpdateContent(walletSender, 1, JSON.stringify(contentObject), "0.02");

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