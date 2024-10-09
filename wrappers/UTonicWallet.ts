import { Contract, ContractProvider, Sender, Address, Cell, contractAddress, beginCell, Slice, Dictionary } from "@ton/core";
import { JETTON_OP_BURN, JETTON_OP_TRANSFER } from "./standard/opcodes";

export default class UtonicWallet implements Contract {

  constructor(readonly address: Address, readonly init?: { code: Cell, data: Cell }) {}

  async sendBurn(provider: ContractProvider, via: Sender, queryId: number, utonAmount: bigint, proxyId: number, responseAddress: Address, value: string, fwdValue: string, fwdMsgBody: Cell | undefined) {
    const fwdBody = !fwdMsgBody ? beginCell().endCell() : fwdMsgBody
    const payload = beginCell()
      .storeUint(proxyId, 32)
      .storeCoins(BigInt(Number(fwdValue) * 1e9))
      .storeRef(fwdBody)
      .endCell();
    const customPayload = Dictionary.empty(
      Dictionary.Keys.Int(32), Dictionary.Values.Cell()
    );
    customPayload.set(0, payload)
    
    const messageBody = beginCell()
      .storeUint(JETTON_OP_BURN, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeCoins(utonAmount)
      .storeAddress(responseAddress)
      .storeDict(customPayload)
      .endCell()
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
      .storeUint(JETTON_OP_TRANSFER, 32) // op 
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
    // const withdrawCnt = stack.readBigNumber();
    const userAddress = stack.readAddress();
    const minterAddress = stack.readAddress();
    return {
      balance,
      // withdrawCnt,
      userAddress,
      minterAddress,
    };
  }

}