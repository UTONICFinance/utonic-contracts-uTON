import { Contract, ContractProvider, Sender, Address, Cell, contractAddress, beginCell } from "@ton/core";

export default class UTonic implements Contract {

  static createForDeploy(code: Cell, data: Cell): UTonic {
    const workchain = 0; // deploy to workchain 0
    const address = contractAddress(workchain, { code, data });
    return new UTonic(address, { code, data });
  }

  async sendDeploy(provider: ContractProvider, via: Sender) {
    await provider.internal(via, {
      value: "0.1", // send TON to contract for rent
      bounce: false
    });
  }

  constructor(readonly address: Address, readonly init?: { code: Cell, data: Cell }) {}
}