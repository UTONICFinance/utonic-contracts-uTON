import { Contract, ContractProvider, Sender, Address, Cell, contractAddress, beginCell, Slice, TupleItemSlice, TupleItemInt, Dictionary } from "@ton/core";
import { COMMON_OP_STAKE } from "../../common/opcodes";

export default class ProxyWhale2 implements Contract {

  static initData(
    proxyType: number,
    proxyId: number,
    whaleAddress: Address,
    utonicMinterAddress: Address,
    utonReceiver: Address,
    tonReceiver: Address,
    tonAdmin: Address,
  ): Cell {
    const baseCell = beginCell()
      .storeUint(proxyType, 32)
      .storeUint(proxyId, 32)
      .endCell()

    const baseAddressCell = beginCell()
      .storeAddress(whaleAddress)
      .storeAddress(utonicMinterAddress)
      .endCell()
    
    const receiverCell = beginCell()
      .storeAddress(utonReceiver)
      .storeAddress(tonReceiver)
      .endCell()
    
    const adminCell = beginCell()
      .storeAddress(tonAdmin)
      .storeAddress(tonAdmin)
      .endCell()
    
    const addressCell = beginCell()
      .storeRef(baseAddressCell)
      .storeRef(receiverCell)
      .storeRef(adminCell)
      .endCell()

    return beginCell()
      .storeRef(baseCell)
      .storeRef(addressCell)
      .endCell()
  }

  static createForDeploy(code: Cell, data: Cell): ProxyTon {
    const workchain = 0; // deploy to workchain 0
    const address = contractAddress(workchain, { code, data });
    return new ProxyTon(address, { code, data });
  }

  constructor(readonly address: Address, readonly init?: { code: Cell, data: Cell }) {}

  async sendDeploy(provider: ContractProvider, via: Sender) {
    await provider.internal(via, {
      value: "0.1", // send TON to contract for rent
      bounce: false
    });
  }

  async sendValue(provider: ContractProvider, via: Sender, value: string) {
    await provider.internal(via, {
      value, // send TON to contract for rent
    });
  }

  async sendStake(provider: ContractProvider, via: Sender, queryId: number, userAddress: Address, responseAddress: Address, value: string) {
    const messageBody = beginCell()
      .storeUint(COMMON_OP_STAKE, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeAddress(userAddress)
      .storeAddress(responseAddress)
      .endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async getWithdrawAddress(provider: ContractProvider, userAddress: Address, withdrawId: bigint) {
    const { stack } = await provider.get("get_withdraw_address", [
        {
          type: 'slice',
          cell: 
              beginCell()
                  .storeAddress(userAddress)
              .endCell()
        } as TupleItemSlice,
        {
          type: 'int',
          value: withdrawId
        } as TupleItemInt,
    ]);
    return stack.readAddress();
  }
  
}