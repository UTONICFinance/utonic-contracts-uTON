import { Contract, ContractProvider, Sender, Address, Cell, contractAddress, beginCell, Slice, TupleItemSlice, TupleItemInt, Dictionary } from "@ton/core";
import { STRATEGY_OP_ADMIN_EXTRACT_TOKEN, STRATEGY_OP_INIT_USER_INFO } from "../strategyOp";
import { STAKE_OP_DEPOSIT } from "../../stakeOp";

export default class StrategyTon implements Contract {

  static initData(
    strategyId: number,
    withdrawPendingTime: number,
    utonicManagerAddress: Address,
    tonReceiverAddress: Address,
    adminAddress: Address,
    userStrategyInfoCode: Cell,
    operatorStrategyShareCode: Cell,
    withdrawCode: Cell,
  ): Cell {
    const totalShares = 0;
    const debtToken = 0;
    const dataCell = beginCell()
        .storeUint(strategyId, 32)
        .storeUint(withdrawPendingTime, 64)
        .storeCoins(totalShares)
        .storeCoins(debtToken)
        .endCell();
    const pendingAdminAddress = adminAddress;
    const adminCell = beginCell()
        .storeAddress(adminAddress)
        .storeAddress(pendingAdminAddress)
        .endCell();
    const addressCell = beginCell()
        .storeAddress(utonicManagerAddress)
        .storeAddress(tonReceiverAddress)
        .storeRef(adminCell)
        .endCell();
    const codeCell = beginCell()
        .storeRef(userStrategyInfoCode)
        .storeRef(operatorStrategyShareCode)
        .storeRef(withdrawCode)
        .endCell();
    return beginCell()
        .storeRef(dataCell)
        .storeRef(addressCell)
        .storeRef(codeCell)
        .endCell();
  }

  static createForDeploy(code: Cell, data: Cell): StrategyTon {
    const workchain = 0; // deploy to workchain 0
    const address = contractAddress(workchain, { code, data });
    return new StrategyTon(address, { code, data });
  }

  constructor(readonly address: Address, readonly init?: { code: Cell, data: Cell }) {}

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

  async sendInitUserInfo(provider: ContractProvider, via: Sender, queryId: number, responseAddress: Address, value: string) {
    const messageBody = beginCell()
      .storeUint(STRATEGY_OP_INIT_USER_INFO, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeAddress(responseAddress)
      .endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async sendDeposit(provider: ContractProvider, via: Sender, queryId: number, shares: bigint, responseAddress: Address, value: string) {
    const messageBody = beginCell()
      .storeUint(STAKE_OP_DEPOSIT, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeCoins(shares)
      .storeAddress(responseAddress)
      .endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async sendAdminExtractToken(provider: ContractProvider, via: Sender, queryId: number, amount: bigint, responseAddress: Address, value: string) {
    const messageBody = beginCell()
      .storeUint(STRATEGY_OP_ADMIN_EXTRACT_TOKEN, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeCoins(amount)
      .storeAddress(responseAddress)
      .endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }


  async getStrategyData(provider: ContractProvider) {
    const { stack } = await provider.get("get_strategy_data", []);
    
    const strategyId = stack.readBigNumber()
    const withdrawPendingTime = stack.readBigNumber()
    const totalShares = stack.readBigNumber()
    const debtToken = stack.readBigNumber()
    const utonicManagerAddress = stack.readAddress()
    const adminAddress = stack.readAddress()
    const pendingAdminAddress = stack.readAddress()
    const tonReceiverAddress = stack.readAddress()
    return {
        strategyId,
        withdrawPendingTime,
        totalShares,
        debtToken,
        utonicManagerAddress,
        adminAddress,
        pendingAdminAddress,
        tonReceiverAddress,
    };
  }

  async getUserStrategyInfoAddress(provider: ContractProvider, userAddress: Address) {
    const { stack } = await provider.get("get_user_strategy_info_address", [
        {
          type: 'slice',
          cell: 
              beginCell()
                  .storeAddress(userAddress)
              .endCell()
      } as TupleItemSlice
    ]);
    return stack.readAddress();
  }
  async getOperatorStrategyShareAddress(provider: ContractProvider, operatorAddress: Address) {
    const { stack } = await provider.get("get_operator_strategy_share_address", [
        {
          type: 'slice',
          cell: 
              beginCell()
                  .storeAddress(operatorAddress)
              .endCell()
      } as TupleItemSlice
    ]);
    return stack.readAddress();
  }
  async getStrategyWithdrawAddress(provider: ContractProvider, withdrawId: bigint, userAddress: Address) {
    const { stack } = await provider.get("get_strategy_withdraw_address", [
        {
          type: 'int',
          value: withdrawId
        } as TupleItemInt,
        {
            type: 'slice',
            cell: 
                beginCell()
                    .storeAddress(userAddress)
                .endCell()
          } as TupleItemSlice,
    ]);
    return stack.readAddress();
  }
}