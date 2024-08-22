import { toNano } from '@ton/core';
import { UTon } from '../wrappers/UTon';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const uTon = provider.open(UTon.createFromConfig({}, await compile('UTon')));

    await uTon.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(uTon.address);

    // run methods on `uTon`
}
