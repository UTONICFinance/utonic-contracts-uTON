import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV4, Address } from "@ton/ton";
import DiscoveryReceiver from "../../wrappers/discovery/DiscoveryReceiver"; // this is the interface class we just implemented
import { loadIni } from "../../libs/config";

export async function run() {
  const config = loadIni("config.ini");
  // initialize ton rpc client on testnet
  const endpoint = await getHttpEndpoint({ network: config.network });
  const client = new TonClient({ endpoint });

  // open Counter instance by address
  const discoveryReceiverAddress = Address.parse(config.discovery_receiver);
  const discoveryReceiver = new DiscoveryReceiver(discoveryReceiverAddress);
  const discoveryReceiverContract = client.open(discoveryReceiver);
  
  const data = await discoveryReceiverContract.getReceiverData();
  console.log("data: ", data);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
