
import * as fs from "fs";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, Cell, Address, WalletContractV4, beginCell } from "@ton/ton";
import UTonic from "../wrappers/UTonic";

const OFF_CHAIN_CONTENT_PREFIX = 0x01;

function bufferToChunks(buff: Buffer, chunkSize: number) {
	const chunks: Buffer[] = [];
	while (buff.byteLength > 0) {
		chunks.push(buff.slice(0, chunkSize));
		buff = buff.slice(chunkSize);
	}
	return chunks;
}

export function makeSnakeCell(data: Buffer) {
	const chunks = bufferToChunks(data, 127);
	const rootCell = beginCell();
	let curCell = rootCell;

	for (let i = 0; i < chunks.length; i++) {
		const chunk = chunks[i];

		curCell.storeBuffer(chunk);

		if (chunks[i + 1]) {
			const nextCell = beginCell();
			curCell.storeRef(nextCell);
			curCell = nextCell;
		}
	}

	return rootCell.endCell();
}

export function encodeOffChainContent(content: string) {
	let data = Buffer.from(content);
	const offChainPrefix = Buffer.from([OFF_CHAIN_CONTENT_PREFIX]);
	data = Buffer.concat([offChainPrefix, data]);
	return makeSnakeCell(data);
}

function jettonMinterInitData(
  last_price_day: number,
  last_price: number,
  price_inc: number,
  owner: Address,
  ton_receiver: Address,
  metadata: string,
  walletCode: Cell,
  withdrawCode: Cell
): Cell {
  return beginCell()
    .storeCoins(0)
    .storeUint(last_price_day, 32)
    .storeUint(last_price, 32)
    .storeUint(price_inc, 32)
    .storeCoins(0)
    .storeAddress(owner)
    .storeAddress(ton_receiver)
    .storeRef(encodeOffChainContent(metadata))
    .storeRef(walletCode)
    .storeRef(withdrawCode)
    .endCell();
}

export async function run() {
  // initialize ton rpc client on testnet
  const endpoint = await getHttpEndpoint({ network: "testnet" });
  const client = new TonClient({ endpoint });

  // open wallet v4 (notice the correct wallet version here)
  const mnemonic = "";
  const key = await mnemonicToWalletKey(mnemonic.split(" "));
  const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });

  // prepare minter's initial code and data cells for deployment
  const minterCode = Cell.fromBoc(fs.readFileSync("build/minter.cell"))[0];
  const walletCode = Cell.fromBoc(fs.readFileSync("build/wallet.cell"))[0];
  const withdrawCode = Cell.fromBoc(fs.readFileSync("build/withdraw.cell"))[0];
  const data = jettonMinterInitData(
    Math.floor(new Date().getTime() / 1000 / 24 / 3600),
    0,
    0,
    wallet.address,
    wallet.address,
    'UTonicMinter',
    walletCode,
    withdrawCode
  )
  const utonic = UTonic.createForDeploy(minterCode, data);

  // exit if contract is already deployed
  console.log("contract address:", utonic.address.toString());
  if (await client.isContractDeployed(utonic.address)) {
    return console.log("Counter already deployed");
  }

  // open wallet and read the current seqno of the wallet
  const walletContract = client.open(wallet);
  const walletSender = walletContract.sender(key.secretKey);
  const seqno = await walletContract.getSeqno();

  // send the deploy transaction
  const utonicContract = client.open(utonic);
  await utonicContract.sendDeploy(walletSender);

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