import { Address, Cell, StateInit, beginCell, contractAddress, storeStateInit, toNano } from "ton-core";
import { hex } from "../build/minter.compiled.json";
import { hex as walletHex } from "../build/wallet.compiled.json";
import { hex as withdrawHex } from "../build/withdraw.compiled.json";

import qs from "qs";
import qrcode from "qrcode-terminal";

const OFF_CHAIN_CONTENT_PREFIX = 0x01;
const JETTON_WALLET_CODE = Cell.fromBoc(Buffer.from(walletHex,"hex"))[0];
const WITHDRAW_CODE = Cell.fromBoc(Buffer.from(withdrawHex,"hex"))[0];

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
  metadata: string
): Cell {
  return beginCell()
    .storeCoins(0)
    .storeUint(last_price_day, 32)
    .storeUint(last_price, 32)
    .storeUint(price_inc, 32)
    .storeUint(0, 32)
    .storeAddress(owner)
    .storeAddress(ton_receiver)
    .storeRef(encodeOffChainContent(metadata))
    .storeRef(JETTON_WALLET_CODE)
    .storeRef(WITHDRAW_CODE)
    .endCell();
}


async function deployContract() {
    const codeCell = Cell.fromBoc(Buffer.from(hex,"hex"))[0];

    const ownerAddress = Address.parse("");
    const receiverAddress = Address.parse("");
    const metadataStr = "UTonicMinter";
    const last_price_day = Math.floor(new Date().getTime() / 1000 / (24 * 60 * 60));
    const dataCell = jettonMinterInitData(
        last_price_day,
        0,
        0,
        ownerAddress,
        receiverAddress,
        metadataStr
    );   

    const stateInit: StateInit = {
        code: codeCell,
        data: dataCell,
    };

    const stateInitBuilder = beginCell();
    storeStateInit(stateInit)(stateInitBuilder);
    const stateInitCell = stateInitBuilder.endCell();

    const address = contractAddress(0, {
        code: codeCell,
        data: dataCell,
    });


    let deployLink =
        'https://app.tonkeeper.com/transfer/' +
        address.toString({
            testOnly: true,
        }) +
        "?" +
        qs.stringify({
            text: "Deploy contract by QR",
            amount: toNano("0.1").toString(10),
            init: stateInitCell.toBoc({idx: false}).toString("base64"),
        });

    

    qrcode.generate(deployLink, {small: true }, (qr) => {
        console.log(qr);
    });

    //https://testnet.tonscan.org/address/kQACwi82x8jaITAtniyEzho5_H1gamQ1xQ20As_1fboIfJ4h

    let scanAddr = 
        'https://testnet.tonscan.org/address/' +
        address.toString({
            testOnly: true,
        })
    
    console.log(scanAddr);

}

deployContract()

