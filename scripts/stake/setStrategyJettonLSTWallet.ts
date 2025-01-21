
import * as fs from "fs";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, Cell, WalletContractV4, Address } from "@ton/ton";
import { loadIni } from "../../libs/config";
import StrategyJetton from "../../wrappers/stake/strategy/strategyJetton/StrategyJetton";
import TestMinter from "../../wrappers/test/jetton/TestMinter";

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

  const strategyLSTAddress = Address.parse(config.strategy_lstton);
  const strategyLST = new StrategyJetton(strategyLSTAddress);
  const strategyLSTContract = client.open(strategyLST);

  const lstMinterAddress = Address.parse(config.lst_ton_minter);
  const lstMinter = new TestMinter(lstMinterAddress);
  const lstMinterContract = client.open(lstMinter);
  const lstWalletAddress = await lstMinterContract.getWalletAddress(strategyLSTAddress);
  console.log('wallet address: ', lstWalletAddress.toString());

  await strategyLSTContract.sendAdminUpdateStrategyJettonWallet(walletSender, 1, lstWalletAddress, "0.02");

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