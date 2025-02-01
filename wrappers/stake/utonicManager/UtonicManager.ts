import { Contract, ContractProvider, Sender, Address, Cell, contractAddress, beginCell, Slice, TupleItemSlice, TupleItemInt, Dictionary } from "@ton/core";
import { UTONIC_MANAGER_OP_REGISTER, UTONIC_MANAGER_OP_SWITCH_OPERATOR_STATUS } from "./utonicManagerOp";
import { STAKE_OP_ADMIN_ACCEPT_ADMIN, STAKE_OP_ADMIN_UPDATE_ADMIN, STAKE_OP_ADMIN_UPDATE_CODE } from "../stakeOp";

export default class UTonicManager implements Contract {

  static initData(
    adminAddress: Address,
    operatorRegisterCode: Cell,
  ): Cell {
    return beginCell()
      .storeAddress(adminAddress)
      .storeAddress(adminAddress)
      .storeRef(operatorRegisterCode)
      .endCell();
  }

  static createForDeploy(code: Cell, data: Cell): UTonicManager {
    const workchain = 0; // deploy to workchain 0
    const address = contractAddress(workchain, { code, data });
    return new UTonicManager(address, { code, data });
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

  async sendRegister(provider: ContractProvider, via: Sender, queryId: number, responseAddress: Address, value: string) {
    const messageBody = beginCell()
      .storeUint(UTONIC_MANAGER_OP_REGISTER, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeAddress(responseAddress)
      .endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async sendSwitchOperatorStatus(provider: ContractProvider, via: Sender, queryId: number, isBaned: boolean, operatorRegisterAddress: Address, responseAddress: Address, value: string) {
    const messageBody = beginCell()
      .storeUint(UTONIC_MANAGER_OP_SWITCH_OPERATOR_STATUS, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeUint(isBaned? 1 : 0, 1)
      .storeAddress(operatorRegisterAddress)
      .storeAddress(responseAddress)
      .endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async sendUpdateCode(provider: ContractProvider, via: Sender, queryId: number, code: Cell, value: string) {
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

  async getUtonicManagerData(provider: ContractProvider) {
    const { stack } = await provider.get("get_utonic_manager_data", []);
    const adminAddress = stack.readAddress();
    const pendingAdminAddress = stack.readAddress();
    const operatorRegisterCode = stack.readCell();
    return {
      adminAddress,
      pendingAdminAddress,
      operatorRegisterCode
    };
  }

  async getOperatorRegisterAddress(provider: ContractProvider, operatorAddress: Address) {
    const { stack } = await provider.get("get_operator_register_address", [
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
}