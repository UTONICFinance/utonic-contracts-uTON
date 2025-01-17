import { Contract, ContractProvider, Sender, Address, Cell } from "@ton/core";

export default class OperatorStrategyShare implements Contract {

  constructor(readonly address: Address, readonly init?: { code: Cell, data: Cell }) {}

  async sendValue(provider: ContractProvider, via: Sender, value: string) {
    await provider.internal(via, {
      value, // send TON to contract for rent
    });
  }

  static createForDeploy(address: Address): OperatorStrategyShare {
    return new OperatorStrategyShare(address);
  }

  async getOperatorStrategyShareData(provider: ContractProvider) {
    const { stack } = await provider.get("get_operator_strategy_share_data", []);
    
    const shares = stack.readBigNumber();
    const operatorAddress = stack.readAddress();
    const strategyAddress = stack.readAddress();
    return {
        shares,
        operatorAddress,
        strategyAddress
    };
  }

}