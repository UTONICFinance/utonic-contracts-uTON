import { Contract, ContractProvider, Sender, Address, Cell, contractAddress, beginCell, Slice, TupleItemSlice, TupleItemInt, Dictionary } from "@ton/core";
import { STRATEGY_OP_ADMIN_UPDATE_WITHDRAW_PENDING_TIME, STRATEGY_OP_INIT_USER_INFO } from "../strategyOp";
import { STAKE_OP_BURN, STAKE_OP_DELEGATE, STAKE_OP_UNDELEGATE } from "../../stakeOp";

export default class UserStrategyInfo implements Contract {

  constructor(readonly address: Address, readonly init?: { code: Cell, data: Cell }) {}

  static createForDeploy(address: Address): UserStrategyInfo {
    return new UserStrategyInfo(address);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: string) {
    await provider.internal(via, {
      value, // send TON to contract for rent
      bounce: false
    });
  }

  async sendValue(provider: ContractProvider, via: Sender, value: string) {
    await provider.internal(via, {
      value, // send TON to contract for rent
    });
  }

  async sendDelegate(provider: ContractProvider, via: Sender, queryId: number, operatorAddress: Address, responseAddress: Address, value: string) {
    const messageBody = beginCell()
      .storeUint(STAKE_OP_DELEGATE, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeAddress(operatorAddress)
      .storeAddress(responseAddress)
      .endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async sendUndelegate(provider: ContractProvider, via: Sender, queryId: number, responseAddress: Address, value: string) {
    const messageBody = beginCell()
      .storeUint(STAKE_OP_UNDELEGATE, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeAddress(responseAddress)
      .endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async sendBurn(provider: ContractProvider, via: Sender, queryId: number, shares: bigint, responseAddress: Address, value: string) {
    const messageBody = beginCell()
      .storeUint(STAKE_OP_BURN, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeCoins(shares)
      .storeAddress(responseAddress)
      .endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }
  async getUserStrategyInfoData(provider: ContractProvider) {
    const { stack } = await provider.get("get_user_strategy_info_data", []);
    const shares = stack.readBigNumber()
    const status = stack.readBigNumber()
    const withdrawCnt = stack.readBigNumber()
    const userAddress = stack.readAddress()
    const strategyAddress = stack.readAddress()
    const operatorAddress = stack.readAddress()
    return {
        shares, 
        status,
        withdrawCnt,
        userAddress, 
        strategyAddress, 
        operatorAddress
    }
  }
}