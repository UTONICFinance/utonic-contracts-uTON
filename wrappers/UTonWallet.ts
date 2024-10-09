import { Contract, ContractProvider, Sender, Address, Cell, contractAddress, beginCell, Slice, Dictionary } from "@ton/core";
import { BURN, TRANSFER } from "./constants/opcodes"

export default class UTonWallet implements Contract {

  constructor(readonly address: Address, readonly init?: { code: Cell, data: Cell }) {}

  async sendBurn(provider: ContractProvider, via: Sender, queryId: number, utonAmount: bigint, responseAddress: Address, value: string) {
    const messageBody = beginCell()
      .storeUint(BURN, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeCoins(utonAmount)
      .storeAddress(responseAddress)
      .endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async sendToken(
    provider: ContractProvider, 
    via: Sender, 
    queryId: number, 
    utonAmount: bigint, 
    toUserAddress: Address, 
    responseAddress: Address, 
    value: string, 
    extraValue: bigint=0n, 
    extraSlice: Slice|undefined=undefined
  ) {
    let msg = beginCell()
      .storeUint(TRANSFER, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeCoins(utonAmount)
      .storeAddress(toUserAddress)
      .storeAddress(responseAddress)
      .storeDict(Dictionary.empty());
    if (extraValue > 0n) {
      msg = msg.storeCoins(extraValue)
        .storeSlice(extraSlice as Slice);
    } else {
      msg = msg.storeCoins(0)
        .storeUint(0, 1);
    }
    const messageBody = msg.endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async getWalletData(provider: ContractProvider) {
    const { stack } = await provider.get("get_wallet_data", []);
    const balance = stack.readBigNumber();
    const withdrawCnt = stack.readBigNumber();
    const userAddress = stack.readAddress();
    const minterAddress = stack.readAddress();
    return {
      balance,
      withdrawCnt,
      userAddress,
      minterAddress,
    };
  }

}