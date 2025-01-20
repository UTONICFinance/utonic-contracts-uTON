import { Contract, ContractProvider, Sender, Address, Cell, contractAddress, beginCell, Slice, TupleItemSlice, TupleItemInt, Dictionary } from "@ton/core";
import { STRATEGY_OP_INIT_USER_INFO } from "../strategyOp";
import { STAKE_OP_DEPOSIT, STAKE_OP_WITHDRAW } from "../../stakeOp";

export default class StrategyWithdraw implements Contract {

  static createForDeploy(address: Address): StrategyWithdraw {
    return new StrategyWithdraw(address);
  }

  constructor(readonly address: Address, readonly init?: { code: Cell, data: Cell }) {}

  async sendValue(provider: ContractProvider, via: Sender, value: string) {
    await provider.internal(via, {
      value, // send TON to contract for rent
    });
  }

  async sendWithdraw(provider: ContractProvider, via: Sender, queryId: number, recipientAddress: Address, responseAddress: Address, value: string) {
    const messageBody = beginCell()
      .storeUint(STAKE_OP_WITHDRAW, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeAddress(recipientAddress)
      .storeAddress(responseAddress)
      .endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async getStrategyWithdrawData(provider: ContractProvider) {
    const { stack } = await provider.get("get_strategy_withdraw_data", []);
    
    const shares = stack.readBigNumber()
    const withdrawId = stack.readBigNumber()
    const burnTimestamp = stack.readBigNumber()
    const earliestWithdrawTimestamp = stack.readBigNumber()
    const finished = stack.readBigNumber()
    const ownerAddress = stack.readAddress()
    const strategy_address = stack.readAddress()
    return {
        shares,
        withdrawId,
        burnTimestamp,
        earliestWithdrawTimestamp,
        finished,
        ownerAddress,
        strategy_address,
    };
  }
}