import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { UTon } from '../wrappers/UTon';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('UTon', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('UTon');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let uTon: SandboxContract<UTon>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        uTon = blockchain.openContract(UTon.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await uTon.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: uTon.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and uTon are ready to use
    });
});
