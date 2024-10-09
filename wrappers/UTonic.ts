import { Contract, ContractProvider, Sender, Address, Cell, contractAddress, beginCell, Slice, TupleItemSlice, TupleItemInt, Dictionary } from "@ton/core";
import { MINTER_OP_UPDATE_PRICE, MINTER_OP_UPDATE_PRICE_INC, MINTER_OP_UPDATE_PROXY_WHITELIST } from "./constants/opcodes"
import { encodeOffChainContent } from "../libs/cells";

export default class UTonic implements Contract {

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
      .storeDict(Dictionary.empty())
      .endCell()
    
    return beginCell()
      .storeRef(dataCell)
      .storeRef(addressCell)
      .storeRef(encodeOffChainContent(content))
      .storeRef(jettonWalletCode)
      .endCell()
  }

  static createForDeploy(code: Cell, data: Cell): UTonic {
    const workchain = 0; // deploy to workchain 0
    const address = contractAddress(workchain, { code, data });
    return new UTonic(address, { code, data });
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

  async sendSetProxyWhaleWhitelist(provider: ContractProvider, via: Sender, queryId: number, proxyId: number, proxyType: number, proxyAddress: Address, value: string) {
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

  async sendClearProxyWhaleWhitelist(provider: ContractProvider, via: Sender, queryId: number, proxyId: number, value: string) {
    const messageBody = beginCell()
      .storeUint(MINTER_OP_UPDATE_PROXY_WHITELIST, 32) // op 
      .storeUint(queryId, 64) // query id
      .storeUint(proxyId, 32)
      .storeUint(0, 32)
      .storeUint(0, 2)
      .endCell();
    
    await provider.internal(via, {
      value,
      body: messageBody
    });
  }

  async sendStake(provider: ContractProvider, via: Sender, queryId: number, value: string) {
    const messageBody = beginCell()
      .storeUint(STAKE, 32) // op 
      .storeUint(queryId, 64) // query id
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
    const proxy_whitelist = stack.readCellOpt();
    return {
      totalSupply,
      lastPriceDay,
      lastPrice,
      priceInc,
      adminAddress,
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
  
  async getWithdrawAddress(provider: ContractProvider, userAddress: Address, withdrawId: bigint) {
    const { stack } = await provider.get("get_withdraw_address", [
        {
          type: 'slice',
          cell: 
              beginCell()
                  .storeAddress(userAddress)
              .endCell()
        } as TupleItemSlice,
        {
          type: 'int',
          value: withdrawId
        } as TupleItemInt,
    ]);
    return stack.readAddress();
  }

  async getProxyWhaleAddress(provider: ContractProvider, userAddress: Address, nominatorPool: Address) {
    const { stack } = await provider.get("get_proxy_whale_address", [
        {
          type: 'slice',
          cell: 
              beginCell()
                  .storeAddress(userAddress)
              .endCell()
        } as TupleItemSlice,
        {
          type: 'slice',
          cell: 
              beginCell()
                  .storeAddress(nominatorPool)
              .endCell()
        } as TupleItemSlice,
    ]);
    return stack.readAddress();
  }
}