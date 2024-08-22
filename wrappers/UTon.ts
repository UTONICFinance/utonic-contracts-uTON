import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type UTonConfig = {};

export function uTonConfigToCell(config: UTonConfig): Cell {
    return beginCell().endCell();
}

export class UTon implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new UTon(address);
    }

    static createFromConfig(config: UTonConfig, code: Cell, workchain = 0) {
        const data = uTonConfigToCell(config);
        const init = { code, data };
        return new UTon(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
