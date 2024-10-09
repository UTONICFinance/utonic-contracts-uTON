import { Contract, ContractProvider, Sender, Address, Cell, contractAddress, beginCell, Slice, TupleItemSlice, TupleItemInt } from "@ton/core";
import { STAKE, UPDATE_PRICE, UPDATE_PRICE_INC } from "../constants/opcodes"
import { DEPOSIT, WITHDRAW_TO_PROXY } from "./proxyOpcodes";

export default class ProxyWhale implements Contract {

  static initData(
    ownerAddress: Address,
    jettonMasterAddress: Address,
    nominatorPool: Address,
  ): Cell {
    return beginCell()
      .storeAddress(ownerAddress)
      .storeAddress(jettonMasterAddress)
      .storeAddress(nominatorPool)
      .storeUint(0, 1)
      .storeCoins(0)
      .endCell();
  }

  static createForDeploy(code: Cell, data: Cell): ProxyWhale {
    const workchain = 0; // deploy to workchain 0
    const address = contractAddress(workchain, { code, data });
    return new ProxyWhale(address, { code, data });
  }

  constructor(readonly address: Address, readonly init?: { code: Cell, data: Cell }) {}

  async sendDeploy(provider: ContractProvider, via: Sender, value: string) {
    await provider.internal(via, {
      value,
      bounce: false
    });
  }

  async sendValue(provider: ContractProvider, via: Sender, value: string) {
    await provider.internal(via, {
      value, // send TON to contract for rent
    });
  }

  async sendDeposit(provider: ContractProvider, via: Sender, queryId: number, value: string) {
    const messageBody = beginCell()
      .storeUint(DEPOSIT, 32) // op 
      .storeUint(queryId, 64) // query id
      .endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async withdrawToProxy(provider: ContractProvider, via: Sender, queryId: number, amount: bigint, responseAddress: Address, value: string) {
    const messageBody = beginCell()
      .storeUint(WITHDRAW_TO_PROXY, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeCoins(amount)
      .storeAddress(responseAddress)
      .endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async withdrawFromProxy(provider: ContractProvider, via: Sender, queryId: number, amount: bigint, responseAddress: Address, value: string) {
    const messageBody = beginCell()
      .storeUint(WITHDRAW_TO_PROXY, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeCoins(amount)
      .storeAddress(responseAddress)
      .endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async getProxyWhaleData(provider: ContractProvider) {
    const { stack } = await provider.get("get_proxy_whale_data", []);
    const ownerAddress = stack.readAddress();
    const jettonMasterAddress = stack.readAddress();
    const nominatorPool = stack.readAddress();
    const enabled = stack.readBigNumber();
    const withdrawCapacity = stack.readBigNumber();
    return {
      ownerAddress,
      jettonMasterAddress,
      nominatorPool,
      enabled,
      withdrawCapacity,
    };
  }

}