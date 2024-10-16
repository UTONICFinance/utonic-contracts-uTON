
import * as fs from "fs";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, Cell, WalletContractV4, Address } from "@ton/ton";
import { loadIni } from "../libs/config";
import ProxyWhale3 from "../wrappers/proxy/proxyWhale3/ProxyWhale3";
import { TYPE_PROXY_WHALE3 } from "../wrappers/proxy/proxyType";

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
  const proxyWhale3Code = Cell.fromBoc(fs.readFileSync("build/proxy_whale3.cell"))[0];
  const minterAddressString = config.utonic_minter;
  const minterAddress = Address.parse(minterAddressString);
  const whaleAddress = Address.parse(config.proxy_whale3_whale);
  const adminAddress = Address.parse(config.proxy_whale3_admin);
  const utonReceiver = Address.parse(config.proxy_whale3_uton_receiver);
  
  const proxyId = config.proxy_whale3_id;
  const limitDecimal = Number(config.proxy_whale3_limit);

  const limitUndecimal = BigInt(limitDecimal * 1e9);
  const proxyWhale3 = ProxyWhale3.createForDeploy(
    proxyWhale3Code,
    ProxyWhale3.initData(
        TYPE_PROXY_WHALE3,
        proxyId,
        limitUndecimal,
        whaleAddress,
        minterAddress,
        utonReceiver,
        adminAddress
    )
  );

  // exit if contract is already deployed
  console.log("contract address:", proxyWhale3.address.toString());
  if (await client.isContractDeployed(proxyWhale3.address)) {
    return console.log("Counter already deployed");
  }

  // open wallet and read the current seqno of the wallet
  const walletContract = client.open(wallet);
  const walletSender = walletContract.sender(key.secretKey);
  const seqno = await walletContract.getSeqno();

  // send the deploy transaction
  const proxyLSTTonContract = client.open(proxyWhale3);
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