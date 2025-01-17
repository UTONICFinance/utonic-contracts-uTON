import { Contract, ContractProvider, Sender, Address, Cell } from "@ton/core";

export default class OperatorRegister implements Contract {

  constructor(readonly address: Address, readonly init?: { code: Cell, data: Cell }) {}

  static createForDeploy(address: Address): OperatorRegister {
    return new OperatorRegister(address);
  }

  async sendValue(provider: ContractProvider, via: Sender, value: string) {
    await provider.internal(via, {
      value, // send TON to contract for rent
    });
  }

  async getOperatorRegisterData(provider: ContractProvider) {
    const { stack } = await provider.get("get_operator_register_data", []);
    
    const status = stack.readBigNumber();
    const operatorAddress = stack.readAddress();
    const utonicManagerAddress = stack.readAddress();
    return {
        status,
        operatorAddress,
        utonicManagerAddress
    };
  }

}