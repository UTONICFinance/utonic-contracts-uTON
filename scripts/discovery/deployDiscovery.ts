
import * as fs from "fs";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, Cell, WalletContractV4, Address } from "@ton/ton";
import Discovery from "../../wrappers/discovery/Discovery";
import { loadIni } from "../../libs/config";

export async function run() {
  const config = loadIni("config.ini");
  // initialize ton rpc client on testnet
  const endpoint = await getHttpEndpoint({ network: config.network });
  const client = new TonClient({ endpoint });

  // open wallet v4 (notice the correct wallet version here)
  const mnemonic = config.words;
  const key = await mnemonicToWalletKey(mnemonic.split(" "));
  const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });

  // prepare minter's initial code and data cells for deployment
  const discoveryCode = Cell.fromBoc(fs.readFileSync("build/discovery.cell"))[0];
  const walletCode = Cell.fromBoc(fs.readFileSync("build/wallet.cell"))[0];
  const minterAddress = Address.parse(config.utonic_minter);

  const discovery = Discovery.createForDeploy(
    discoveryCode,
    Discovery.initData(
        minterAddress,
        walletCode
    )
  );

  // exit if contract is already deployed
  console.log("contract address:", discovery.address.toString());
  if (await client.isContractDeployed(discovery.address)) {
    return console.log("Counter already deployed");
  }

  // open wallet and read the current seqno of the wallet
  const walletContract = client.open(wallet);
  const walletSender = walletContract.sender(key.secretKey);
  const seqno = await walletContract.getSeqno();

  // send the deploy transaction
  const discoveryContract = client.open(discovery);
  await discoveryContract.sendDeploy(walletSender);

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