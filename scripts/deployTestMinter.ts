
import * as fs from "fs";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, Cell, WalletContractV4 } from "@ton/ton";
import TestMinter from "../wrappers/test/jetton/TestMinter";

export async function run() {
  // initialize ton rpc client on testnet
  const endpoint = await getHttpEndpoint({ network: "testnet" });
  const client = new TonClient({ endpoint });

  // open wallet v4 (notice the correct wallet version here)
  const mnemonic = "";
  const key = await mnemonicToWalletKey(mnemonic.split(" "));
  const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });

  // prepare minter's initial code and data cells for deployment
  const minterCode = Cell.fromBoc(fs.readFileSync("build/test_jetton_minter.cell"))[0];
  const walletCode = Cell.fromBoc(fs.readFileSync("build/test_jetton_wallet.cell"))[0];
  
  const minter = TestMinter.createForDeploy(
    minterCode,
    TestMinter.initData(
        wallet.address,
        "Test Minter",
        walletCode
    )
  );

  // exit if contract is already deployed
  console.log("contract address:", minter.address.toString());
  if (await client.isContractDeployed(minter.address)) {
    return console.log("Counter already deployed");
  }

  // open wallet and read the current seqno of the wallet
  const walletContract = client.open(wallet);
  const walletSender = walletContract.sender(key.secretKey);
  const seqno = await walletContract.getSeqno();

  // send the deploy transaction
  const minterContract = client.open(minter);
  await minterContract.sendDeploy(walletSender);

  // wait until confirmed
  let currentSeqno = seqno;
  while (currentSeqno == seqno) {
    console.log("waiting for deploy transaction to confirm...");
    await sleep(1500);
    currentSeqno = await walletContract.getSeqno();
  }
  console.log("deploy transaction confirmed!");
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}