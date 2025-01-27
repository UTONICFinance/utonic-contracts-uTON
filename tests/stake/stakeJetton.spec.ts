import * as fs from "fs";
import { Address, Cell } from "@ton/core";
import { printTransactionFees, SandboxContract, TreasuryContract } from "@ton/sandbox";

import { MyBlockchain } from "../lib/blockchain";
import '@ton/test-utils';
import UTonicManager from "../../wrappers/stake/utonicManager/UtonicManager";
import UtonicManager from "../../wrappers/stake/utonicManager/UtonicManager";
import UserStrategyInfo from "../../wrappers/stake/strategy/userStrategyInfo/UserStrategyInfo";
import { USER_STRATEGY_INFO_STATUS_DELEGATE_DONE, USER_STRATEGY_INFO_STATUS_NO_DELEGATE } from "../../wrappers/stake/strategy/userStrategyInfo/UserStrategyInfoStatus";
import OperatorRegister from "../../wrappers/stake/utonicManager/operatorRegister/OperatorRegister";
import { OPERATOR_REGISTER_STATUS_BANED, OPERATOR_REGISTER_STATUS_NORMAL } from "../../wrappers/stake/utonicManager/operatorRegister/OperatorRegisterStatus";
import OperatorStrategyShare from "../../wrappers/stake/strategy/operatorStrategyShare/OperatorStrategyShare";
import { exitCode } from "process";
import { STAKE_ERR_INSUFFICIENT_BALANCE, STAKE_ERR_INSUFFICIENT_SHARES, STAKE_ERR_INSUFFICIENT_VALUE, STAKE_ERR_INSUFFICIENT_WITHDRAW_CAPACITY, STAKE_ERR_INVALID_STATUS, STAKE_ERR_UNAUTHORIZED, STAKE_ERR_WRONG_CALLER } from "../../wrappers/stake/stakeErr";
import { UTONIC_MANAGER_OP_SWITCH_OPERATOR_STATUS } from "../../wrappers/stake/utonicManager/utonicManagerOp";
import { STAKE_OP_BURN, STAKE_OP_WITHDRAW } from "../../wrappers/stake/stakeOp";
import StrategyWithdraw from "../../wrappers/stake/strategy/strategyWithdraw/StrategyWithdraw";
import { WITHDRAW_ERR_FINISHED, WITHDRAW_ERR_TIME_NOT_EXPIRED } from "../../wrappers/stake/strategy/strategyWithdraw/strategyWithdrawErr";
import StrategyJetton from "../../wrappers/stake/strategy/strategyJetton/StrategyJetton";
import TestMinter from "../../wrappers/test/jetton/TestMinter";
import TestJettonWallet from "../../wrappers/test/jetton/TestJettonWallet";
import { STRATEGY_ERR_CAPACITY_NOT_ENOUGH } from "../../wrappers/stake/strategy/strategyErr";
import { STRATEGY_OP_ADMIN_EXTRACT_TOKEN } from "../../wrappers/stake/strategy/strategyOp";

describe("ton stake tests", () => {
  let blockchain: MyBlockchain;
  let admin: SandboxContract<TreasuryContract>;
  let jettonReceiverAddress: SandboxContract<TreasuryContract>;
  let user1: SandboxContract<TreasuryContract>;
  let user2: SandboxContract<TreasuryContract>;
  let userResponse1: SandboxContract<TreasuryContract>;
  let userResponse2: SandboxContract<TreasuryContract>;
  let operator: SandboxContract<TreasuryContract>;
  let operatorResponse: SandboxContract<TreasuryContract>;
  let strategyJettonContract: SandboxContract<StrategyJetton>;
  let utonicManagerContract: SandboxContract<UTonicManager>;
  let jettonMinterContract: SandboxContract<TestMinter>;
  let strategyJettonWalletAddress: Address

  let startTime: number;

  const withdrawPendingTime = 3 * 24 * 60 * 60;

  beforeEach(async () =>  {

    blockchain = await MyBlockchain.create();
    startTime = Math.floor(new Date().getTime() / 1000);
    blockchain.setNowTime(startTime);
    admin = await blockchain.treasury("admin");
    jettonReceiverAddress = await blockchain.treasury("jettonReceiverAddress");
    user1 = await blockchain.treasury("user1");
    user2 = await blockchain.treasury("user2");
    userResponse1 = await blockchain.treasury("userResponse1");
    userResponse2 = await blockchain.treasury("userResponse2");
    operator = await blockchain.treasury("operator");
    operatorResponse = await blockchain.treasury("operatorResponse");

    const strategyJettonCode = Cell.fromBoc(fs.readFileSync("build/strategy_jetton.cell"))[0]; 
    const utonicManagerCode = Cell.fromBoc(fs.readFileSync("build/utonic_manager.cell"))[0];
    const operatorRegisterCode = Cell.fromBoc(fs.readFileSync("build/operator_register.cell"))[0];
    const operatorStrategyShareCode = Cell.fromBoc(fs.readFileSync("build/operator_strategy_share.cell"))[0];
    const userStrategyInfoCode = Cell.fromBoc(fs.readFileSync("build/user_strategy_info.cell"))[0];
    const strategyWithdrawCode = Cell.fromBoc(fs.readFileSync("build/strategy_withdraw.cell"))[0];
    const testJettonMinterCode = Cell.fromBoc(fs.readFileSync("build/test_jetton_minter.cell"))[0];
    const testJettonWalletCode = Cell.fromBoc(fs.readFileSync("build/test_jetton_wallet.cell"))[0];

    const utonicManager = UtonicManager.createForDeploy(
        utonicManagerCode,
        UtonicManager.initData(
            admin.address,
            operatorRegisterCode
        )
    )

    utonicManagerContract = blockchain.openContract(utonicManager)
    await utonicManagerContract.sendDeploy(admin.getSender(), "0.1");

    const jettonMinter = TestMinter.createForDeploy(
        testJettonMinterCode,
        TestMinter.initData(
            admin.address,
            "test minter",
            testJettonWalletCode,
        )
    )

    jettonMinterContract = blockchain.openContract(jettonMinter)
    await jettonMinterContract.sendDeploy(admin.getSender(), "0.1");

    const strategyJetton = StrategyJetton.createForDeploy(
        strategyJettonCode,
        StrategyJetton.initData(
            2, withdrawPendingTime, BigInt(3.3*1e9), utonicManagerContract.address,
            jettonReceiverAddress.address, admin.address,
            userStrategyInfoCode, operatorStrategyShareCode, strategyWithdrawCode
        ),
    )

    strategyJettonContract = blockchain.openContract(strategyJetton)
    await strategyJettonContract.sendDeploy(admin.getSender(), "0.1")

    strategyJettonWalletAddress = await jettonMinterContract.getWalletAddress(strategyJettonContract.address)
  }),

  it("stake", async () => {
    // mint jetton
    await jettonMinterContract.sendAdminMint(admin.getSender(), 1, BigInt(100*1e9), user1.address, "0.3");
    await jettonMinterContract.sendAdminMint(admin.getSender(), 1, BigInt(100*1e9), user2.address, "0.3");
    await jettonMinterContract.sendAdminMint(admin.getSender(), 1, BigInt(10000*1e9), admin.address, "0.3");
    const userJettonWalletAddress1 = await jettonMinterContract.getWalletAddress(user1.address)
    const userJettonWalletContract1 = blockchain.openContract(
        new TestJettonWallet(userJettonWalletAddress1)
    )
    const userJettonWalletAddress2 = await jettonMinterContract.getWalletAddress(user2.address)
    const userJettonWalletContract2 = blockchain.openContract(
        new TestJettonWallet(userJettonWalletAddress2)
    )
    const adminJettonWalletAddress = await jettonMinterContract.getWalletAddress(admin.address)
    const adminJettonWalletContract = blockchain.openContract(
        new TestJettonWallet(adminJettonWalletAddress)
    )
    const strategyJettonWalletContract = blockchain.openContract(
        new TestJettonWallet(strategyJettonWalletAddress)
    )
    let userJettonWalletData1 = await userJettonWalletContract1.getWalletData()
    let userJettonWalletData2 = await userJettonWalletContract2.getWalletData()
    expect(userJettonWalletData1.balance).toBe(BigInt(100*1e9))
    expect(userJettonWalletData2.balance).toBe(BigInt(100*1e9))

    // user1 init
    let userInitRes1 = await strategyJettonContract.sendInitUserInfo(
        user1.getSender(), 1, userResponse1.address, "0.1"
    )
    let userInfoAddress1 = await strategyJettonContract.getUserStrategyInfoAddress(user1.address)
    let userInfo1 = UserStrategyInfo.createForDeploy(userInfoAddress1)
    let userInfoContract1 = blockchain.openContract(userInfo1)
    let userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(0n);
    expect(userInfoData1.shares).toBe(0n);
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_NO_DELEGATE));
    // user2 try to update wallet of strategy
    let user2UpdateWallet = await strategyJettonContract.sendAdminUpdateStrategyJettonWallet(
        user2.getSender(), 1, 
        await jettonMinterContract.getWalletAddress(userResponse2.address),
        "0.2"
    )
    expect(user2UpdateWallet.transactions).toHaveTransaction(
        {
            to: strategyJettonContract.address,
            exitCode: STAKE_ERR_UNAUTHORIZED,
        }
    )
    let strategyJettonData = await strategyJettonContract.getStrategyData()
    expect(strategyJettonData.strategyJettonWallet).toBeNull()
    
    // user2 deposit before admin set strategy jetton wallet
    let userDepositRes2 = await userJettonWalletContract2.sendTransfer(user2.getSender(), 1, BigInt(1.5*1e9), userResponse2.address, userResponse2.address, "1.0", "0.5")
    strategyJettonData = await strategyJettonContract.getStrategyData()
    expect(strategyJettonData.totalShares).toBe(0n)
    expect(strategyJettonData.capacity).toBe(BigInt(3.3*1e9))
    
    // admin update wallet of strategy
    await strategyJettonContract.sendAdminUpdateStrategyJettonWallet(
        admin.getSender(), 1, 
        strategyJettonWalletAddress,
        "0.2"
    )
    strategyJettonData = await strategyJettonContract.getStrategyData()
    expect(strategyJettonData.strategyJettonWallet?.toString()).toBe(strategyJettonWalletAddress.toString())

    // user2 deposit 
    userDepositRes2 = await userJettonWalletContract2.sendTransfer(
        user2.getSender(), 1, BigInt(1.5*1e9), 
        strategyJettonContract.address, 
        userResponse2.address, 
        "1.0", "0.5"
    )
    strategyJettonData = await strategyJettonContract.getStrategyData()
    expect(strategyJettonData.totalShares).toBe(BigInt(1.5*1e9))
    expect(strategyJettonData.capacity).toBe(BigInt(1.8*1e9))

    const jettonReceiverWalletContract = blockchain.openContract(
        new TestJettonWallet(await jettonMinterContract.getWalletAddress(jettonReceiverAddress.address))
    )
    let jettonReceiverWalletData = await jettonReceiverWalletContract.getWalletData()
    expect(jettonReceiverWalletData.balance).toBe(BigInt(1.5*1e9))
    let strategyJettonWalletData = await strategyJettonWalletContract.getWalletData()
    expect(strategyJettonWalletData.balance).toBe(0n)

    let userInfoAddress2 = await strategyJettonContract.getUserStrategyInfoAddress(user2.address)
    let userInfo2 = UserStrategyInfo.createForDeploy(userInfoAddress2)
    let userInfoContract2 = blockchain.openContract(userInfo2)
    let userInfoData2 = await userInfoContract2.getUserStrategyInfoData()
    expect(userInfoData2.withdrawCnt).toBe(0n);
    expect(userInfoData2.shares).toBe(BigInt(1.5*1e9));
    expect(userInfoData2.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_NO_DELEGATE));

    // operator register
    let operatorRegisterRes = await utonicManagerContract.sendRegister(
        operator.getSender(), 2, operatorResponse.address, "0.1"
    )
    // printTransactionFees(operatorRegisterRes.transactions)
    let operatorRegisterAddress = await utonicManagerContract.getOperatorRegisterAddress(operator.address)
    let operatorRegister = OperatorRegister.createForDeploy(operatorRegisterAddress)
    let operatorRegisterContract = blockchain.openContract(operatorRegister)
    let operatorRegisterData = await operatorRegisterContract.getOperatorRegisterData()
    expect(operatorRegisterData.operatorAddress.toString()).toBe(operator.address.toString())
    expect(operatorRegisterData.utonicManagerAddress.toString()).toBe(utonicManagerContract.address.toString())
    expect(operatorRegisterData.status).toBe(BigInt(OPERATOR_REGISTER_STATUS_NORMAL))
    // user1 delegate
    let userDelegateRes1 = await userInfoContract1.sendDelegate(
        user1.getSender(), 3, operator.address, userResponse1.address, "0.5"
    );
    userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(0n);
    expect(userInfoData1.shares).toBe(0n);
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_DELEGATE_DONE));
    // user2 delegate
    let userDelegateRes2 = await userInfoContract2.sendDelegate(
        user2.getSender(), 6, operator.address, userResponse2.address, "0.5"
    );
    // printTransactionFees(userDelegateRes2.transactions)
    userInfoData2 = await userInfoContract2.getUserStrategyInfoData()
    expect(userInfoData2.withdrawCnt).toBe(0n);
    expect(userInfoData2.shares).toBe(BigInt(1.5*1e9));
    expect(userInfoData2.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_DELEGATE_DONE));
    // user1 deposit over capacity
    let userDepositRes1 = await userJettonWalletContract1.sendTransfer(
        user1.getSender(), 11, BigInt(2.1*1e9), 
        strategyJettonContract.address, 
        userResponse1.address, 
        "1.0", "0.5"
    )
    expect(userDepositRes1.transactions).toHaveTransaction(
        {
            from: strategyJettonWalletAddress,
            to: strategyJettonContract.address,
            exitCode: STRATEGY_ERR_CAPACITY_NOT_ENOUGH
        }
    )
    // user1 deposit 
    userDepositRes1 = await userJettonWalletContract1.sendTransfer(
        user1.getSender(), 8, BigInt(1.6*1e9), 
        strategyJettonContract.address, 
        userResponse1.address, 
        "1.0", "0.5"
    )
    strategyJettonData = await strategyJettonContract.getStrategyData()
    expect(strategyJettonData.totalShares).toBe(BigInt(3.1*1e9))
    expect(strategyJettonData.capacity).toBe(BigInt(0.2*1e9))

    jettonReceiverWalletData = await jettonReceiverWalletContract.getWalletData()
    expect(jettonReceiverWalletData.balance).toBe(BigInt(3.1*1e9))
    strategyJettonWalletData = await strategyJettonWalletContract.getWalletData()
    expect(strategyJettonWalletData.balance).toBe(BigInt(2.1*1e9))

    // printTransactionFees(userDepositRes1.transactions)
    userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(0n);
    expect(userInfoData1.shares).toBe(BigInt(1.6*1e9));
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_DELEGATE_DONE));
    
    let operatorStrategyShareAddress = await strategyJettonContract.getOperatorStrategyShareAddress(operator.address)
    let operatorStrategyShare = OperatorStrategyShare.createForDeploy(operatorStrategyShareAddress)
    let operatorStrategyShareContract = blockchain.openContract(operatorStrategyShare)
    let operatorStrategyShareData = await operatorStrategyShareContract.getOperatorStrategyShareData()
    expect(operatorStrategyShareData.operatorAddress.toString()).toBe(operator.address.toString())
    expect(operatorStrategyShareData.strategyAddress.toString()).toBe(strategyJettonContract.address.toString())
    expect(operatorStrategyShareData.shares).toBe(BigInt(3.1*1e9))
    // user1 burn before undelegate
    let userBurnRes1 = await userInfoContract1.sendBurn(
        user1.getSender(), 6, BigInt(0.5*1e9), userResponse1.address, "0.2"
    )
    expect(userBurnRes1.transactions).toHaveTransaction({
        to: userInfoContract1.address,
        exitCode: STAKE_ERR_INVALID_STATUS,
    })
    // user1 try to ban operator
    let fakeAdminBanRes = await utonicManagerContract.sendSwitchOperatorStatus(
        user1.getSender(), 1, true, operatorRegister.address, userResponse1.address, "0.1"
    )
    expect(fakeAdminBanRes.transactions).toHaveTransaction(
        {
            op: UTONIC_MANAGER_OP_SWITCH_OPERATOR_STATUS,
            to: utonicManagerContract.address,
            exitCode: STAKE_ERR_UNAUTHORIZED,
        }
    )
    operatorRegisterData = await operatorRegisterContract.getOperatorRegisterData()
    expect(operatorRegisterData.operatorAddress.toString()).toBe(operator.address.toString())
    expect(operatorRegisterData.utonicManagerAddress.toString()).toBe(utonicManagerContract.address.toString())
    expect(operatorRegisterData.status).toBe(BigInt(OPERATOR_REGISTER_STATUS_NORMAL))
    // user2 undelegate user1
    let userUndelegate2_1 = await userInfoContract1.sendUndelegate(
        user2.getSender(), 9, userResponse2.address, "0.2"
    )
    expect(userUndelegate2_1.transactions).toHaveTransaction(
        {
            to: userInfoContract1.address,
            exitCode: STAKE_ERR_WRONG_CALLER
        }
    )
    userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(0n);
    expect(userInfoData1.shares).toBe(BigInt(1.6*1e9));
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_DELEGATE_DONE));

    // user1 undelegate
    let userUndelegate1 = await userInfoContract1.sendUndelegate(
        user1.getSender(), 9, userResponse1.address, "0.2"
    )
    userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(0n);
    expect(userInfoData1.shares).toBe(BigInt(1.6*1e9));
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_NO_DELEGATE));
    operatorStrategyShareData = await operatorStrategyShareContract.getOperatorStrategyShareData()
    expect(operatorStrategyShareData.operatorAddress.toString()).toBe(operator.address.toString())
    expect(operatorStrategyShareData.strategyAddress.toString()).toBe(strategyJettonContract.address.toString())
    expect(operatorStrategyShareData.shares).toBe(BigInt(1.5*1e9))
    // user2 burn from user1
    let user2Burn1Res = await userInfoContract1.sendBurn(
        user2.getSender(), 9, BigInt(0.5*1e9), userResponse1.address, "0.2"
    )
    expect(user2Burn1Res.transactions).toHaveTransaction({
        op: STAKE_OP_BURN,
        to: userInfoContract1.address,
        exitCode: STAKE_ERR_WRONG_CALLER,
    })
    userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(0n);
    expect(userInfoData1.shares).toBe(BigInt(1.6*1e9));
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_NO_DELEGATE));

    // user1 burn too much
    let userBurnTooMuchRes1 = await userInfoContract1.sendBurn(
        user1.getSender(), 1, BigInt(1.61*1e9), userResponse1.address, "0.2"
    )
    expect(userBurnTooMuchRes1.transactions).toHaveTransaction({
        op: STAKE_OP_BURN,
        to: userInfoContract1.address,
        exitCode: STAKE_ERR_INSUFFICIENT_SHARES,
    })
    userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(0n);
    expect(userInfoData1.shares).toBe(BigInt(1.6*1e9));
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_NO_DELEGATE));

    // user1 burn
    let userBurnTimestamp1 = startTime + 1000;
    let currentTimestamp = userBurnTimestamp1;
    blockchain.setNowTime(currentTimestamp)
    userBurnRes1 = await userInfoContract1.sendBurn(
        user1.getSender(), 1, BigInt(0.5*1e9), userResponse1.address, "0.2"
    )
    userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(1n);
    expect(userInfoData1.shares).toBe(BigInt(1.1*1e9));
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_NO_DELEGATE));

    const userWithdrawAddress1_1 = await strategyJettonContract.getStrategyWithdrawAddress(1n, user1.address);
    const userWithdraw1_1 = StrategyWithdraw.createForDeploy(userWithdrawAddress1_1)
    const userWithdrawContract1_1 = blockchain.openContract(userWithdraw1_1)
    let userWithdrawData1_1 = await userWithdrawContract1_1.getStrategyWithdrawData()
    expect(userWithdrawData1_1.burnTimestamp).toBe(BigInt(currentTimestamp))
    expect(userWithdrawData1_1.earliestWithdrawTimestamp).toBe(BigInt(currentTimestamp + withdrawPendingTime))
    expect(userWithdrawData1_1.finished).toBe(0n)
    expect(userWithdrawData1_1.ownerAddress.toString()).toBe(user1.address.toString())
    expect(userWithdrawData1_1.strategy_address.toString()).toBe(strategyJettonContract.address.toString())
    expect(userWithdrawData1_1.shares).toBe(BigInt(0.5*1e9))
    expect(userWithdrawData1_1.withdrawId).toBe(1n)

    let adminBanRes = await utonicManagerContract.sendSwitchOperatorStatus(
        admin.getSender(), 16, true, operator.address, admin.address, "0.1"
    )
    operatorRegisterData = await operatorRegisterContract.getOperatorRegisterData()
    expect(operatorRegisterData.operatorAddress.toString()).toBe(operator.address.toString())
    expect(operatorRegisterData.utonicManagerAddress.toString()).toBe(utonicManagerContract.address.toString())
    expect(operatorRegisterData.status).toBe(BigInt(OPERATOR_REGISTER_STATUS_BANED))

    // user2 try to undelegate but fail
    let userUndelegate2 = await userInfoContract2.sendUndelegate(
        user2.getSender(), 1, userResponse2.address, "0.2"
    )
    // printTransactionFees(userUndelegate2.transactions)
    userInfoData2 = await userInfoContract2.getUserStrategyInfoData()
    expect(userInfoData2.withdrawCnt).toBe(0n);
    expect(userInfoData2.shares).toBe(BigInt(1.5*1e9));
    expect(userInfoData2.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_DELEGATE_DONE));

    // user1 withdraw before withdraw pending time
    currentTimestamp += 10;
    blockchain.setNowTime(currentTimestamp);
    let userWithdrawRes1_1 = await userWithdrawContract1_1.sendWithdraw(user1.getSender(), 1, user1.address, userResponse1.address, "0.2");
    // printTransactionFees(userWithdrawRes1_1.transactions)
    expect(userWithdrawRes1_1.transactions).toHaveTransaction(
        {
            to: userWithdrawContract1_1.address,
            op: STAKE_OP_WITHDRAW,
            exitCode: WITHDRAW_ERR_TIME_NOT_EXPIRED
        }
    )
    userWithdrawData1_1 = await userWithdrawContract1_1.getStrategyWithdrawData()
    expect(userWithdrawData1_1.finished).toBe(0n)
    expect(userWithdrawData1_1.ownerAddress.toString()).toBe(user1.address.toString())
    expect(userWithdrawData1_1.strategy_address.toString()).toBe(strategyJettonContract.address.toString())
    expect(userWithdrawData1_1.shares).toBe(BigInt(0.5*1e9))
    expect(userWithdrawData1_1.withdrawId).toBe(1n)

    currentTimestamp = userBurnTimestamp1 + withdrawPendingTime + 1;
    blockchain.setNowTime(currentTimestamp);
    // user1 withdraw but not enough value
    userWithdrawRes1_1 = await userWithdrawContract1_1.sendWithdraw(
        user1.getSender(), 1, user1.address, userResponse1.address, "0.1"
    )
    expect(userWithdrawRes1_1.transactions).toHaveTransaction(
        {
            // from: userWithdrawContract1_1.address,
            to: userWithdrawContract1_1.address,
            exitCode: STAKE_ERR_INSUFFICIENT_VALUE
        }
    )
    // send enough token to strategy contract
    await adminJettonWalletContract.sendTransfer(admin.getSender(), 6, BigInt(10*1e9), strategyJettonContract.address, admin.address, "0.2", "0")

    // user2 withdraw user1 but fail
    let user2WithdrawRes1_1 = await userWithdrawContract1_1.sendWithdraw(
        user2.getSender(), 1, user2.address, userResponse1.address, "0.5"
    )
    expect(user2WithdrawRes1_1.transactions).toHaveTransaction(
        {
            to: userWithdrawContract1_1.address,
            exitCode: STAKE_ERR_WRONG_CALLER
        }
    )
    const userJettonDataBeforeWithdraw1_1 = await userJettonWalletContract1.getWalletData()
    // user1 withdraw success
    userWithdrawRes1_1 = await userWithdrawContract1_1.sendWithdraw(
        user1.getSender(), 8, user1.address, userResponse1.address, "0.5"
    )
    // check withdraw success
    const userJettonDataAfterWithdraw1_1 = await userJettonWalletContract1.getWalletData()
    expect(userJettonDataAfterWithdraw1_1.balance-userJettonDataBeforeWithdraw1_1.balance).toBe(BigInt(0.5*1e9))
   
    userWithdrawData1_1 = await userWithdrawContract1_1.getStrategyWithdrawData()
    expect(userWithdrawData1_1.finished).toBe(1n)
    expect(userWithdrawData1_1.ownerAddress.toString()).toBe(user1.address.toString())
    expect(userWithdrawData1_1.strategy_address.toString()).toBe(strategyJettonContract.address.toString())
    expect(userWithdrawData1_1.shares).toBe(BigInt(0.5*1e9))
    expect(userWithdrawData1_1.withdrawId).toBe(1n)

    // user1 withdraw again but fail
    userWithdrawRes1_1 = await userWithdrawContract1_1.sendWithdraw(
        user1.getSender(), 1, user1.address, userResponse1.address, "0.5"
    )
    const userJettonDataAfterWithdrawAgain1_1 = await userJettonWalletContract1.getWalletData()
    // check withdraw fail
    expect(userJettonDataAfterWithdrawAgain1_1.balance-userJettonDataAfterWithdraw1_1.balance).toBe(0n)
    expect(userWithdrawRes1_1.transactions).toHaveTransaction(
        {
            to: userWithdrawContract1_1.address,
            exitCode: WITHDRAW_ERR_FINISHED
        }
    )
    userWithdrawData1_1 = await userWithdrawContract1_1.getStrategyWithdrawData()
    expect(userWithdrawData1_1.finished).toBe(1n)
    expect(userWithdrawData1_1.ownerAddress.toString()).toBe(user1.address.toString())
    expect(userWithdrawData1_1.strategy_address.toString()).toBe(strategyJettonContract.address.toString())
    expect(userWithdrawData1_1.shares).toBe(BigInt(0.5*1e9))
    expect(userWithdrawData1_1.withdrawId).toBe(1n)
  });

  it("admin extract", async () => {
    // mint jetton
    await jettonMinterContract.sendAdminMint(admin.getSender(), 1, BigInt(10000*1e9), admin.address, "0.3");
    await jettonMinterContract.sendAdminMint(admin.getSender(), 1, 0n, jettonReceiverAddress.address, "0.3");

    const adminJettonWalletAddress = await jettonMinterContract.getWalletAddress(admin.address)
    const adminJettonWalletContract = blockchain.openContract(
        new TestJettonWallet(adminJettonWalletAddress)
    )
    const strategyJettonWalletContract = blockchain.openContract(
        new TestJettonWallet(strategyJettonWalletAddress)
    )
    
    // admin update wallet of strategy
    await strategyJettonContract.sendAdminUpdateStrategyJettonWallet(
        admin.getSender(), 1, 
        strategyJettonWalletAddress,
        "0.2"
    )

    // send enough token to strategy contract
    await adminJettonWalletContract.sendTransfer(admin.getSender(), 6, BigInt(10*1e9), strategyJettonContract.address, admin.address, "0.2", "0")
    let strategyJettonWalletData = await strategyJettonWalletContract.getWalletData()
    expect(strategyJettonWalletData.balance).toBe(BigInt(10*1e9))

    // some one else want to extract
    let userExtract1 = await strategyJettonContract.sendAdminExtractToken(user1.getSender(), 1, BigInt(1e9), userResponse1.address, "0.1");
    expect(userExtract1.transactions).toHaveTransaction({
        to: strategyJettonContract.address,
        op: STRATEGY_OP_ADMIN_EXTRACT_TOKEN,
        exitCode: STAKE_ERR_UNAUTHORIZED
    })
    strategyJettonWalletData = await strategyJettonWalletContract.getWalletData()
    expect(strategyJettonWalletData.balance).toBe(BigInt(10*1e9))
    
    const jettonReceiverWalletContract = blockchain.openContract(
        new TestJettonWallet(await jettonMinterContract.getWalletAddress(jettonReceiverAddress.address))
    )

    let jettonReceiverWalletData = await jettonReceiverWalletContract.getWalletData()
    expect(jettonReceiverWalletData.balance).toBe(0n)

    // admin extract
    let adminExtract = await strategyJettonContract.sendAdminExtractToken(admin.getSender(), 1, BigInt(1e9), admin.address, "0.1");
    strategyJettonWalletData = await strategyJettonWalletContract.getWalletData()
    expect(strategyJettonWalletData.balance).toBe(BigInt(9*1e9))
    jettonReceiverWalletData = await jettonReceiverWalletContract.getWalletData()
    expect(jettonReceiverWalletData.balance).toBe(BigInt(1*1e9))

  });
});