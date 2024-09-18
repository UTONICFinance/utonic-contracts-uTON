import { Contract, ContractProvider, Sender, Address, Cell, contractAddress, beginCell, Slice, TupleItemSlice, TupleItemInt, Dictionary } from "@ton/core";
import { COMMON_OP_STAKE } from "../../common/opcodes";
import { PROXYLST_UPDATE_PROXYLST_WALLET } from "./opcodes";

export default class ProxyLSTTon implements Contract {

  static initData(
    proxyType: number,
    proxyId: number,
    lstTonPrice: bigint,
    utonicMinterAddress: Address,
    adminAddress: Address,
    lstTonReceiver: Address
  ): Cell {
    const dataCell = beginCell()
      .storeUint(proxyType, 32)
      .storeUint(proxyId, 32)
      .storeUint(lstTonPrice, 64)
    .endCell();
    const authCell = beginCell()
      .storeAddress(utonicMinterAddress)
      .storeAddress(adminAddress)
    .endCell();
    const receiverCell = beginCell()
      // tmp address, will be replaced with proxyLSTTon wallet by admin
      .storeAddress(lstTonReceiver)
      .storeAddress(lstTonReceiver)
    .endCell();

    return beginCell()
      .storeRef(dataCell)
      .storeRef(authCell)
      .storeRef(receiverCell)
      .endCell()
  }

  static createForDeploy(code: Cell, data: Cell): ProxyLSTTon {
    const workchain = 0; // deploy to workchain 0
    const address = contractAddress(workchain, { code, data });
    return new ProxyLSTTon(address, { code, data });
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

  async sendUpdateLSTWallet(provider: ContractProvider, via: Sender, queryId: number, walletAddress: Address, value: string) {
    const messageBody = beginCell()
      .storeUint(PROXYLST_UPDATE_PROXYLST_WALLET, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeAddress(walletAddress)
      .endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

}