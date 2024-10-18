import { Contract, ContractProvider, Sender, Address, Cell, contractAddress, beginCell, Slice, TupleItemSlice, TupleItemInt, Dictionary } from "@ton/core";
import { COMMON_OP_STAKE } from "../../common/opcodes";
import { PROXY_TON_OP_UPDATE_WITHDRAW_PENDING_TIME } from "./opcodes";

export default class ProxyTon implements Contract {

  static initData(
    proxyType: number,
    proxyId: number,
    pendingTime: number,
    debtTon: bigint,
    utonicMinterAddress: Address,
    tonReceiver: Address,
    adminAddress: Address,
    withdrawCode: Cell
  ): Cell {
    const dataCell = beginCell()
      .storeUint(proxyType, 32)
      .storeUint(proxyId, 32)
      .storeUint(pendingTime, 64)
      .storeCoins(debtTon)
      .endCell()

    const addressCell = beginCell()
      .storeAddress(utonicMinterAddress)
      .storeAddress(tonReceiver)
      // .storeDict(Dictionary.empty())
      .endCell()
    
    const adminCell = beginCell()
      .storeAddress(adminAddress)
      .storeAddress(adminAddress)
      // .storeDict(Dictionary.empty())
      .endCell()

    return beginCell()
      .storeRef(dataCell)
      .storeRef(addressCell)
      .storeRef(adminCell)
      .storeRef(withdrawCode)
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
      value: "0.2", // send TON to contract for rent
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

  async sendUpdatePendingTime(provider: ContractProvider, via: Sender, queryId: number, pendingTime: number, value: string) {
    const messageBody = beginCell()
      .storeUint(PROXY_TON_OP_UPDATE_WITHDRAW_PENDING_TIME, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeUint(pendingTime, 64)
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