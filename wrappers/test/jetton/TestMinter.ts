import { Contract, ContractProvider, Sender, Address, Cell, contractAddress, beginCell, Slice, TupleItemSlice, TupleItemInt, Dictionary } from "@ton/core";
import { encodeOffChainContent } from "../../../libs/cells";
import { COMMON_OP_STAKE } from "../../common/opcodes";
import { ADMIN_MINT } from "./opcode";

export default class TestMinter implements Contract {

  static initData(
    adminAddress: Address,
    content: string,
    jettonWalletCode: Cell
  ): Cell {
    return beginCell()
      .storeCoins(0)
      .storeAddress(adminAddress)
      .storeRef(encodeOffChainContent(content))
      .storeRef(jettonWalletCode)
      .endCell()
  }

  static createForDeploy(code: Cell, data: Cell): TestMinter {
    const workchain = 0; // deploy to workchain 0
    const address = contractAddress(workchain, { code, data });
    return new TestMinter(address, { code, data });
  }

  constructor(readonly address: Address, readonly init?: { code: Cell, data: Cell }) {}

  async sendDeploy(provider: ContractProvider, via: Sender) {
    await provider.internal(via, {
      value: "0.1", // send TON to contract for rent
      bounce: false
    });
  }

  async sendValue(provider: ContractProvider, via: Sender, value: string) {
    await provider.internal(via, {
      value, // send TON to contract for rent
    });
  }

  async sendAdminMint(provider: ContractProvider, via: Sender, queryId: number, jettonAmount: bigint, recipient: Address, value: string) {
    const messageBody = beginCell()
      .storeUint(ADMIN_MINT, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeCoins(jettonAmount)
      .storeAddress(recipient)
      .endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async getWalletAddress(provider: ContractProvider, userAddress: Address) {
    const { stack } = await provider.get("get_wallet_address", [
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

}