import { Contract, ContractProvider, Sender, Address, Cell, contractAddress, beginCell, Slice, Dictionary } from "@ton/core";
import { BURN, TRANSFER, WITHDRAW } from "./constants/opcodes"

export default class Withdraw implements Contract {

  constructor(readonly address: Address, readonly init?: { code: Cell, data: Cell }) {}

  async sendWithdraw(provider: ContractProvider, via: Sender, queryId: number, recipientAddress: Address, responseAddress: Address, value: string) {
    const messageBody = beginCell()
      .storeUint(WITHDRAW, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeAddress(recipientAddress)
      .storeAddress(responseAddress)
      .endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async getWithdrawData(provider: ContractProvider) {
    const { stack } = await provider.get("get_withdraw_data", []);
    const withdrawId = stack.readBigNumber();
    const utonAmount = stack.readBigNumber();
    const tonAmount = stack.readBigNumber();
    const burnTimestamp = stack.readBigNumber();
    const price = stack.readBigNumber();
    const finished = stack.readBigNumber();
    const ownerAddress = stack.readAddress();
    const jettonMasterAddress = stack.readAddress();
    return {
        withdrawId,
        utonAmount,
        tonAmount,
        burnTimestamp,
        price,
        finished,
        ownerAddress,
        jettonMasterAddress
    };
  }

}