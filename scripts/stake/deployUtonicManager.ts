
import * as fs from "fs";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, Cell, WalletContractV4, Address } from "@ton/ton";
import UtonicManager from "../../wrappers/stake/utonicManager/UtonicManager";
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
  const utonicManagerCode = Cell.fromBoc(fs.readFileSync("build/utonic_manager.cell"))[0];
  const operatorRegisterCode = Cell.fromBoc(fs.readFileSync("build/operator_register.cell"))[0];
  const adminAddress = Address.parse(config.utonic_manager_admin_address);
  
  const utonicManager = UtonicManager.createForDeploy(
    utonicManagerCode,
    UtonicManager.initData(
        adminAddress,
        operatorRegisterCode
    )
  );

  // exit if contract is already deployed
  console.log("contract address:", utonicManager.address.toString());
  if (await client.isContractDeployed(utonicManager.address)) {
    return console.log("Counter already deployed");
  }

  // open wallet and read the current seqno of the wallet
  const walletContract = client.open(wallet);
  const walletSender = walletContract.sender(key.secretKey);
  const seqno = await walletContract.getSeqno();

  // send the deploy transaction
  const utonicManagerContract = client.open(utonicManager);
  await utonicManagerContract.sendDeploy(walletSender, config.utonic_manager_value);

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