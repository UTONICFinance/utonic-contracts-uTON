
import * as fs from "fs";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, Cell, WalletContractV4, Address } from "@ton/ton";
import { ONE_DAY, PRICE_BASE } from "../wrappers/constants/params";
import ProxyLSTTon from "../wrappers/proxy/proxyLSTTon/ProxyLSTTon";
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

  // prepare minter's initial code and data cells for deployment
  const proxyLSTTonCode = Cell.fromBoc(fs.readFileSync("build/proxy_lst_ton.cell"))[0];
  const minterAddressString = config.utonic_minter;
  const minterAddress = Address.parse(minterAddressString);
  
  const proxyLSTTon = ProxyLSTTon.createForDeploy(
    proxyLSTTonCode,
    ProxyLSTTon.initData(
        1,
        1,
        1000000000n,
        0n,
        minterAddress,
        wallet.address,
        Address.parse(config.lst_ton_receiver)
    )
  );

  // exit if contract is already deployed
  console.log("contract address:", proxyLSTTon.address.toString());
  if (await client.isContractDeployed(proxyLSTTon.address)) {
    return console.log("Counter already deployed");
  }

  // open wallet and read the current seqno of the wallet
  const walletContract = client.open(wallet);
  const walletSender = walletContract.sender(key.secretKey);
  const seqno = await walletContract.getSeqno();

  // send the deploy transaction
  const proxyLSTTonContract = client.open(proxyLSTTon);
  await proxyLSTTonContract.sendDeploy(walletSender);

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