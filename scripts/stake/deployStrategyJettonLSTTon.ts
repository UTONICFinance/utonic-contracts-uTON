
import * as fs from "fs";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, Cell, WalletContractV4, Address } from "@ton/ton";
import StrategyTon from "../../wrappers/stake/strategy/strategyTon/StrategyTon";
import { loadIni } from "../../libs/config";
import StrategyJetton from "../../wrappers/stake/strategy/strategyJetton/StrategyJetton";

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
  const strategyJettonCode = Cell.fromBoc(fs.readFileSync("build/strategy_jetton.cell"))[0];
  const strategyWithdrawCode = Cell.fromBoc(fs.readFileSync("build/strategy_withdraw.cell"))[0];
  const userStrategyInfoCode = Cell.fromBoc(fs.readFileSync("build/user_strategy_info.cell"))[0];
  const operatorStrategyShareCode = Cell.fromBoc(fs.readFileSync("build/operator_strategy_share.cell"))[0];
  const utonicManagerAddress = Address.parse(config.utonic_manager);
  const adminAddress = Address.parse(config.strategy_admin_address);
  const jettonReceiverAddress = Address.parse(config.strategy_lstton_receiver);
  
  const strategyJetton = StrategyJetton.createForDeploy(
    strategyJettonCode,
    StrategyJetton.initData(
      Number(config.strategy_lstton_id),
      Number(config.withdraw_pending_time),
      BigInt(Number(config.strategy_lstton_capacity)*1e9),
      utonicManagerAddress,
      jettonReceiverAddress,
      adminAddress,
      userStrategyInfoCode,
      operatorStrategyShareCode,
      strategyWithdrawCode
    )
  );

  // exit if contract is already deployed
  console.log("contract address:", strategyJetton.address.toString());
  if (await client.isContractDeployed(strategyJetton.address)) {
    return console.log("Counter already deployed");
  }

  // open wallet and read the current seqno of the wallet
  const walletContract = client.open(wallet);
  const walletSender = walletContract.sender(key.secretKey);
  const seqno = await walletContract.getSeqno();

  // send the deploy transaction
  const strategyTonContract = client.open(strategyJetton);
  await strategyTonContract.sendDeploy(walletSender, config.strategy_lstton_value);

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