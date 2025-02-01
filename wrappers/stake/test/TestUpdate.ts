import { Contract, ContractProvider, Sender, Address, Cell, beginCell} from "@ton/core";

export default class TestUpdate implements Contract {

  static createForDeploy(address: Address): TestUpdate {
    return new TestUpdate(address);
  }

  constructor(readonly address: Address, readonly init?: { code: Cell, data: Cell }) {}

  async sendValue(provider: ContractProvider, via: Sender, value: string) {
    await provider.internal(via, {
      value, // send TON to contract for rent
    });
  }

  async sendOp1(provider: ContractProvider, via: Sender, queryId: number, recipient: Address, value: string) {
    const messageBody = beginCell()
      .storeUint(1, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeAddress(recipient)
      .endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

}