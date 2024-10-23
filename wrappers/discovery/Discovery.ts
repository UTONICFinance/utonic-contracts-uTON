import { Contract, ContractProvider, Sender, Address, Cell, contractAddress, beginCell, Slice, TupleItemSlice, TupleItemInt, Dictionary } from "@ton/core";

export default class Discovery implements Contract {

  static initData(
    minter: Address,
    walletCode: Cell
  ): Cell {
    
    return beginCell()
      .storeAddress(minter)
      .storeRef(walletCode)
      .endCell()
  }

  static createForDeploy(code: Cell, data: Cell): Discovery {
    const workchain = 0; // deploy to workchain 0
    const address = contractAddress(workchain, { code, data });
    return new Discovery(address, { code, data });
  }

  constructor(readonly address: Address, readonly init?: { code: Cell, data: Cell }) {}

  async sendDeploy(provider: ContractProvider, via: Sender) {
    await provider.internal(via, {
      value: "0.2", // send TON to contract for rent
      bounce: false
    });
  }

  async getDiscoveryData(provider: ContractProvider) {
    const { stack } = await provider.get("get_discovery_data", []);
    const minter = stack.readAddress();
    const walletCode = stack.readCell();
    return {
      minter,
      walletCode
    };
  }

}