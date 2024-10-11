import { Contract, ContractProvider, Sender, Address, Cell, contractAddress, beginCell, Slice, TupleItemSlice, TupleItemInt, Dictionary } from "@ton/core";
import { MINTER_OP_UPDATE_CODE_AND_DATA, MINTER_OP_UPDATE_CONTENT, MINTER_OP_UPDATE_PRICE, MINTER_OP_UPDATE_PRICE_INC, MINTER_OP_UPDATE_PROXY_WHITELIST } from "./minter/opcodes"
import { encodeOffChainContent } from "../libs/cells";
import { COMMON_OP_STAKE, COMMON_OP_UPDATE_ADMIN } from "./common/opcodes";

export default class Minter implements Contract {

  static initData(
    lastPriceDay: number,
    lastPrice: bigint,
    priceInc: bigint,
    adminAddress: Address,
    content: string,
    jettonWalletCode: Cell
  ): Cell {
    const dataCell = beginCell()
      .storeCoins(0)
      .storeUint(lastPriceDay, 32)
      .storeUint(lastPrice, 64)
      .storeUint(priceInc, 64)
      .endCell()

    const addressCell = beginCell()
      .storeAddress(adminAddress)
      .storeAddress(adminAddress) // pendingAdminAddress
      .storeDict(Dictionary.empty())
      .endCell()
    
    return beginCell()
      .storeRef(dataCell)
      .storeRef(addressCell)
      .storeRef(encodeOffChainContent(content))
      .storeRef(jettonWalletCode)
      .endCell()
  }

  static createForDeploy(code: Cell, data: Cell): Minter {
    const workchain = 0; // deploy to workchain 0
    const address = contractAddress(workchain, { code, data });
    return new Minter(address, { code, data });
  }

  constructor(readonly address: Address, readonly init?: { code: Cell, data: Cell }) {}

  async sendDeploy(provider: ContractProvider, via: Sender) {
    await provider.internal(via, {
      value: "2.0", // send TON to contract for rent
      bounce: false
    });
  }

  async sendValue(provider: ContractProvider, via: Sender, value: string) {
    await provider.internal(via, {
      value, // send TON to contract for rent
    });
  }

  async sendUpdatePriceInc(provider: ContractProvider, via: Sender, priceInc: bigint, value: string) {
    const messageBody = beginCell()
      .storeUint(MINTER_OP_UPDATE_PRICE_INC, 32) // op 
      .storeUint(0, 64) // query id
      .storeUint(priceInc, 64)
      .endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async sendUpdatePrice(provider: ContractProvider, via: Sender, price: bigint, priceInc: bigint, value: string) {
    const messageBody = beginCell()
      .storeUint(MINTER_OP_UPDATE_PRICE, 32) // op 
      .storeUint(0, 64) // query id
      .storeUint(price, 64)
      .storeUint(priceInc, 64)
      .endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async sendUpdateAdmin(provider: ContractProvider, via: Sender, queryId: number, newAdmin: Address, value: string) {
    const messageBody = beginCell()
      .storeUint(COMMON_OP_UPDATE_ADMIN, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeAddress(newAdmin)
      .endCell();
    
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async sendSetProxyWhitelist(provider: ContractProvider, via: Sender, queryId: number, proxyId: number, proxyType: number, proxyAddress: Address, value: string) {
    const messageBody = beginCell()
      .storeUint(MINTER_OP_UPDATE_PROXY_WHITELIST, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeUint(proxyId, 32)
      .storeUint(proxyType, 32)
      .storeAddress(proxyAddress)
      .endCell();
    
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async sendClearProxyWhitelist(provider: ContractProvider, via: Sender, queryId: number, proxyId: number, proxyType: number, value: string) {
    const messageBody = beginCell()
      .storeUint(MINTER_OP_UPDATE_PROXY_WHITELIST, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeUint(proxyId, 32)
      .storeUint(proxyType, 32)
      .storeUint(0, 2)
      .endCell();
    
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async sendStake(provider: ContractProvider, via: Sender, queryId: number, proxyType: number, proxyId: number, tonAmount: bigint, userAddress: Address, responseAddress: Address, value: string) {
    const messageBody = beginCell()
      .storeUint(COMMON_OP_STAKE, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeUint(proxyType, 32)
      .storeUint(proxyId, 32)
      .storeCoins(tonAmount)
      .storeAddress(userAddress)
      .storeAddress(responseAddress)
      .endCell();
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async sendUpdateContent(provider: ContractProvider, via: Sender, queryId: number, content: string, value: string) {
    const messageBody = beginCell()
      .storeUint(MINTER_OP_UPDATE_CONTENT, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeRef(encodeOffChainContent(content))
      .endCell();
    
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async sendUpdateCodeAndData(provider: ContractProvider, via: Sender, queryId: number, code: Cell | undefined, data: Cell | undefined, value: string) {
    let messageBody = beginCell()
      .storeUint(MINTER_OP_UPDATE_CODE_AND_DATA, 32) // op 
      .storeUint(queryId, 64) // query id
    if (code) {
      messageBody = messageBody
        .storeUint(1, 1)
        .storeRef(code)
    } else {
      messageBody = messageBody
        .storeUint(0, 1)
    }
    if (data) {
      messageBody = messageBody
        .storeUint(1, 1)
        .storeRef(data)
    } else {
      messageBody = messageBody
        .storeUint(0, 1)
    }
    
    await provider.internal(via, {
      value,
      body: messageBody.endCell()
    });
  }

  // only send to test emtpy minter
  async sendUpdateTotalSupplyToTestEmptyMinter(provider: ContractProvider, via: Sender, queryId: number, newSupply: bigint, value: string) {
    const messageBody = beginCell()
      .storeUint(0x100001, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeCoins(newSupply)
      .endCell();
    
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async getMinterData(provider: ContractProvider) {
    const { stack } = await provider.get("get_minter_data", []);
    const totalSupply = stack.readBigNumber();
    const lastPriceDay = stack.readBigNumber();
    const lastPrice = stack.readBigNumber();
    const priceInc = stack.readBigNumber();
    const adminAddress = stack.readAddress();
    const pendingAdminAddress = stack.readAddress();
    const proxy_whitelist = stack.readCellOpt();
    return {
      totalSupply,
      lastPriceDay,
      lastPrice,
      priceInc,
      adminAddress,
      pendingAdminAddress,
      proxy_whitelist
    };
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