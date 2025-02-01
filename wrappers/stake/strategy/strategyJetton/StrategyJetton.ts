import { Contract, ContractProvider, Sender, Address, Cell, contractAddress, beginCell, Slice, TupleItemSlice, TupleItemInt, Dictionary } from "@ton/core";
import { STRATEGY_OP_ADMIN_CANCEL_USER_PENDING, STRATEGY_OP_ADMIN_DELEGATE_ACK, STRATEGY_OP_ADMIN_EXTRACT_TOKEN, STRATEGY_OP_ADMIN_UNDELEGATE_ACK, STRATEGY_OP_ADMIN_UPDATE_OPERATOR_SHARE, STRATEGY_OP_ADMIN_UPDATE_WITHDRAW_PENDING_TIME, STRATEGY_OP_INIT_USER_INFO } from "../strategyOp";
import { STRATEGY_JETTON_OP_ADMIN_UPDATE_STRATEGY_JETTON_WALLET } from "./StrategyJettonOp";
import { STAKE_OP_ADMIN_ACCEPT_ADMIN, STAKE_OP_ADMIN_UPDATE_ADMIN, STAKE_OP_ADMIN_UPDATE_CODE } from "../../stakeOp";

export default class StrategyJetton implements Contract {

  static initData(
    strategyId: number,
    withdrawPendingTime: number,
    capacity: bigint,
    utonicManagerAddress: Address,
    jettonReceiverAddress: Address,
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
        .storeCoins(capacity)
        .storeCoins(totalShares)
        .endCell();
    const pendingAdminAddress = adminAddress;
    const adminDataExtraCell = beginCell()
        .storeCoins(debtToken)
        .storeAddress(adminAddress)
        .storeAddress(pendingAdminAddress)
        .endCell();
    const adminDataCell = beginCell()
        .storeAddress(utonicManagerAddress)
        .storeAddress(jettonReceiverAddress)
        .storeUint(0, 2)
        .storeRef(adminDataExtraCell)
        .endCell();
    const codeCell = beginCell()
        .storeRef(userStrategyInfoCode)
        .storeRef(operatorStrategyShareCode)
        .storeRef(withdrawCode)
        .endCell();
    return beginCell()
        .storeRef(dataCell)
        .storeRef(adminDataCell)
        .storeRef(codeCell)
        .endCell();
  }

  static createForDeploy(code: Cell, data: Cell): StrategyJetton {
    const workchain = 0; // deploy to workchain 0
    const address = contractAddress(workchain, { code, data });
    return new StrategyJetton(address, { code, data });
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

  async sendAdminUpdateStrategyJettonWallet(provider: ContractProvider, via: Sender, queryId: number, strategyJettonWallet: Address, value: string) {
    const messageBody = beginCell()
      .storeUint(STRATEGY_JETTON_OP_ADMIN_UPDATE_STRATEGY_JETTON_WALLET, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeAddress(strategyJettonWallet)
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

  async sendAdminCancelUserPending(provider: ContractProvider, via: Sender, queryId: number, userStrategyInfoAddress: Address, value: string) {
    const messageBody = beginCell()
      .storeUint(STRATEGY_OP_ADMIN_CANCEL_USER_PENDING, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeAddress(userStrategyInfoAddress)
      .endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async sendAdminDelegateAck(provider: ContractProvider, via: Sender, queryId: number, userStrategyInfoAddress: Address, responseAddress: Address, value: string) {
    const messageBody = beginCell()
      .storeUint(STRATEGY_OP_ADMIN_DELEGATE_ACK, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeAddress(userStrategyInfoAddress)
      .storeAddress(responseAddress)
      .endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async sendAdminUndelegateAck(provider: ContractProvider, via: Sender, queryId: number, userStrategyInfoAddress: Address, responseAddress: Address, value: string) {
    const messageBody = beginCell()
      .storeUint(STRATEGY_OP_ADMIN_UNDELEGATE_ACK, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeAddress(userStrategyInfoAddress)
      .storeAddress(responseAddress)
      .endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async sendAdminUpdateOperatorShare(provider: ContractProvider, via: Sender, queryId: number, operatorStrategyShareAddress: Address, delta: bigint, value: string) {
    const messageBody = beginCell()
      .storeUint(STRATEGY_OP_ADMIN_UPDATE_OPERATOR_SHARE, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeUint(delta > 0n ? 1 : 0, 1)
      .storeCoins(delta > 0n? delta : -delta)
      .storeAddress(operatorStrategyShareAddress)
      .endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async sendAdminUpdateAdmin(provider: ContractProvider, via: Sender, queryId: number, pendingAdminAddress: Address, value: string) {
    const messageBody = beginCell()
      .storeUint(STAKE_OP_ADMIN_UPDATE_ADMIN, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeAddress(pendingAdminAddress)
      .endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async sendAdminUpdateCode(provider: ContractProvider, via: Sender, queryId: number, code: Cell, value: string) {
    const messageBody = beginCell()
      .storeUint(STAKE_OP_ADMIN_UPDATE_CODE, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeRef(code)
      .endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async sendAdminAcceptAdmin(provider: ContractProvider, via: Sender, queryId: number, value: string) {
    const messageBody = beginCell()
      .storeUint(STAKE_OP_ADMIN_ACCEPT_ADMIN, 32) // op 
      .storeUint(queryId, 64) // query id
      .endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }
  
  async getStrategyData(provider: ContractProvider) {
    const { stack } = await provider.get("get_strategy_data", []);
    
    const strategyId = stack.readBigNumber();
    const withdrawPendingTime = stack.readBigNumber();
    const capacity = stack.readBigNumber();
    const totalShares = stack.readBigNumber();
    const debtToken = stack.readBigNumber();
    const utonicManagerAddress = stack.readAddress();
    const jettonReceiverAddress = stack.readAddress();
    const strategyJettonWallet = stack.readAddressOpt();
    const adminAddress = stack.readAddress();
    const pendingAdminAddress = stack.readAddress();
    return {
        strategyId,
        withdrawPendingTime,
        capacity,
        totalShares,
        debtToken,
        utonicManagerAddress,
        jettonReceiverAddress,
        strategyJettonWallet,
        adminAddress,
        pendingAdminAddress,
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