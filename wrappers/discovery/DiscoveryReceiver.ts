import { Contract, ContractProvider, Sender, Address, Cell, contractAddress, beginCell, Slice, TupleItemSlice, TupleItemInt, Dictionary } from "@ton/core";

export default class DiscoveryReceiver implements Contract {

  static initData(
    discovery: Address,
    wallet: Address,
    owner: Address
  ): Cell {
    
    return beginCell()
      .storeAddress(discovery)
      .storeAddress(wallet)
      .storeAddress(owner)
      .endCell()
  }

  static createForDeploy(code: Cell, data: Cell): DiscoveryReceiver {
    const workchain = 0; // deploy to workchain 0
    const address = contractAddress(workchain, { code, data });
    return new DiscoveryReceiver(address, { code, data });
  }

  constructor(readonly address: Address, readonly init?: { code: Cell, data: Cell }) {}

  async sendDeploy(provider: ContractProvider, via: Sender) {
    await provider.internal(via, {
      value: "0.2", // send TON to contract for rent
      bounce: false
    });
  }

  async sendQuery(provider: ContractProvider, via: Sender, owner: Address, includeAddress: boolean, value: string) {
    const messageBody = beginCell()
      .storeUint(1, 32) // op 
      .storeUint(0, 64) // query id
      .storeAddress(owner)
      .storeUint(Number(includeAddress), 1)
      .endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async getReceiverData(provider: ContractProvider) {
    const { stack } = await provider.get("get_receiver_data", []);
    const receiver = stack.readAddress();
    const wallet = stack.readAddress();
    const owner = stack.readAddress();
    return {
        receiver,
        wallet,
        owner
    };
  }

}