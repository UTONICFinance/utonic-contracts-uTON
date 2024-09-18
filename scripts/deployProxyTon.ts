
import * as fs from "fs";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, Cell, WalletContractV4, Address } from "@ton/ton";
import { ONE_DAY, PRICE_BASE } from "../wrappers/constants/params";
import ProxyTon from "../wrappers/proxy/proxyTon/ProxyTon";

export async function run() {
  // initialize ton rpc client on testnet
  const endpoint = await getHttpEndpoint({ network: "testnet" });
  const client = new TonClient({ endpoint });

  // open wallet v4 (notice the correct wallet version here)
  const mnemonic = "";
  const key = await mnemonicToWalletKey(mnemonic.split(" "));
  const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });

  // prepare minter's initial code and data cells for deployment
  const proxyTonCode = Cell.fromBoc(fs.readFileSync("build/proxy_ton.cell"))[0];
  const withdrawCode = Cell.fromBoc(fs.readFileSync("build/withdraw.cell"))[0];
  const minterAddressString = "";
  const minterAddress = Address.parse(minterAddressString);
  
  const proxyTon = ProxyTon.createForDeploy(
    proxyTonCode,
    ProxyTon.initData(
        0,
        0,
        0n,
        minterAddress,
        wallet.address,
        wallet.address,
        withdrawCode
    )
  );

  // exit if contract is already deployed
  console.log("contract address:", proxyTon.address.toString());
  if (await client.isContractDeployed(proxyTon.address)) {
    return console.log("Counter already deployed");
  }

  // open wallet and read the current seqno of the wallet
  const walletContract = client.open(wallet);
  const walletSender = walletContract.sender(key.secretKey);
  const seqno = await walletContract.getSeqno();

  // send the deploy transaction
  const proxyTonContract = client.open(proxyTon);
  await proxyTonContract.sendDeploy(walletSender);

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