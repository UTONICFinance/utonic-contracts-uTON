
import * as fs from "fs";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, Cell, Address, WalletContractV4, beginCell, Dictionary } from "@ton/ton";
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

export function jettonMinterInitData(
  lastPriceDay: number,
  lastPrice: number,
  priceInc: number,
  owner: Address,
  tonReceiver: Address,
  utonReceiver: Address,
  metadata: string,
  walletCode: Cell,
  withdrawCode: Cell,
  proxyCode: Cell
): Cell {
  const codeCells = beginCell()
    .storeRef(walletCode)
	.storeRef(withdrawCode)
	.storeRef(proxyCode)
	.endCell();
  const emptyDict = Dictionary.empty();
  const addressCells = beginCell()
	.storeAddress(owner)
	.storeAddress(tonReceiver)
	.storeAddress(utonReceiver)
	.storeDict(emptyDict)
	.endCell();
  return beginCell()
    .storeCoins(0)
    .storeUint(lastPriceDay, 32)
    .storeUint(lastPrice, 64)
    .storeUint(priceInc, 64)
    .storeCoins(0)
	.storeRef(addressCells)
    .storeRef(encodeOffChainContent(metadata))
    .storeRef(codeCells)
    .endCell();
}