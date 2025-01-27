import * as fs from "fs";
import { Cell } from "@ton/core";
import { printTransactionFees, SandboxContract, TreasuryContract } from "@ton/sandbox";

import { MyBlockchain } from "../lib/blockchain";
import '@ton/test-utils';
import StrategyTon from "../../wrappers/stake/strategy/strategyTon/StrategyTon";
import UTonicManager from "../../wrappers/stake/utonicManager/UtonicManager";
import UtonicManager from "../../wrappers/stake/utonicManager/UtonicManager";
import UserStrategyInfo from "../../wrappers/stake/strategy/userStrategyInfo/UserStrategyInfo";
import { USER_STRATEGY_INFO_STATUS_DELEGATE_DONE, USER_STRATEGY_INFO_STATUS_NO_DELEGATE } from "../../wrappers/stake/strategy/userStrategyInfo/UserStrategyInfoStatus";
import OperatorRegister from "../../wrappers/stake/utonicManager/operatorRegister/OperatorRegister";
import { OPERATOR_REGISTER_STATUS_BANED, OPERATOR_REGISTER_STATUS_NORMAL } from "../../wrappers/stake/utonicManager/operatorRegister/OperatorRegisterStatus";
import OperatorStrategyShare from "../../wrappers/stake/strategy/operatorStrategyShare/OperatorStrategyShare";
import { exitCode } from "process";
import { STAKE_ERR_INSUFFICIENT_BALANCE, STAKE_ERR_INSUFFICIENT_SHARES, STAKE_ERR_INSUFFICIENT_VALUE, STAKE_ERR_INVALID_STATUS, STAKE_ERR_UNAUTHORIZED, STAKE_ERR_WRONG_CALLER } from "../../wrappers/stake/stakeErr";
import { UTONIC_MANAGER_OP_SWITCH_OPERATOR_STATUS } from "../../wrappers/stake/utonicManager/utonicManagerOp";
import { STAKE_OP_BURN, STAKE_OP_WITHDRAW } from "../../wrappers/stake/stakeOp";
import StrategyWithdraw from "../../wrappers/stake/strategy/strategyWithdraw/StrategyWithdraw";
import { WITHDRAW_ERR_FINISHED, WITHDRAW_ERR_TIME_NOT_EXPIRED } from "../../wrappers/stake/strategy/strategyWithdraw/strategyWithdrawErr";
import { STRATEGY_OP_ADMIN_EXTRACT_TOKEN } from "../../wrappers/stake/strategy/strategyOp";

describe("utonic manager tests", () => {
  let blockchain: MyBlockchain;
  let admin: SandboxContract<TreasuryContract>;
  let tonReceiver: SandboxContract<TreasuryContract>;
  let user1: SandboxContract<TreasuryContract>;
  let user2: SandboxContract<TreasuryContract>;
  let userResponse1: SandboxContract<TreasuryContract>;
  let userResponse2: SandboxContract<TreasuryContract>;
  let operator: SandboxContract<TreasuryContract>;
  let operatorResponse: SandboxContract<TreasuryContract>;
  let strategyTonContract: SandboxContract<StrategyTon>;
  let utonicManagerContract: SandboxContract<UTonicManager>;

  let startTime: number;

  const withdrawPendingTime = 3 * 24 * 60 * 60;

  beforeEach(async () =>  {

    blockchain = await MyBlockchain.create();
    startTime = Math.floor(new Date().getTime() / 1000);
    blockchain.setNowTime(startTime);
    admin = await blockchain.treasury("admin");
    tonReceiver = await blockchain.treasury("tonReceiver");
    user1 = await blockchain.treasury("user1");
    user2 = await blockchain.treasury("user2");
    userResponse1 = await blockchain.treasury("userResponse1");
    userResponse2 = await blockchain.treasury("userResponse2");
    operator = await blockchain.treasury("operator");
    operatorResponse = await blockchain.treasury("operatorResponse");

    const strategyTonCode = Cell.fromBoc(fs.readFileSync("build/strategy_ton.cell"))[0]; 
    const utonicManagerCode = Cell.fromBoc(fs.readFileSync("build/utonic_manager.cell"))[0];
    const operatorRegisterCode = Cell.fromBoc(fs.readFileSync("build/operator_register.cell"))[0];
    const operatorStrategyShareCode = Cell.fromBoc(fs.readFileSync("build/operator_strategy_share.cell"))[0];
    const userStrategyInfoCode = Cell.fromBoc(fs.readFileSync("build/user_strategy_info.cell"))[0];
    const strategyWithdrawCode = Cell.fromBoc(fs.readFileSync("build/strategy_withdraw.cell"))[0];

    const utonicManager = UtonicManager.createForDeploy(
        utonicManagerCode,
        UtonicManager.initData(
            admin.address,
            operatorRegisterCode
        )
    )

    utonicManagerContract = blockchain.openContract(utonicManager)
    await utonicManagerContract.sendDeploy(admin.getSender(), "0.1");
   
    const strategyTon = StrategyTon.createForDeploy(
        strategyTonCode,
        StrategyTon.initData(
            1, withdrawPendingTime, utonicManagerContract.address,tonReceiver.address, admin.address,
            userStrategyInfoCode, operatorStrategyShareCode, strategyWithdrawCode
        ),
    )

    strategyTonContract = blockchain.openContract(strategyTon)
    await strategyTonContract.sendDeploy(admin.getSender(), "0.1")

  }),

  it("strategy ton delegate", async () => {
    // user1 deposit
    let userDepositRes1 = await strategyTonContract.sendDeposit(
        user1.getSender(), 9, BigInt(1e9), userResponse1.address, "2.0"
    );
    let userInfoAddress1 = await strategyTonContract.getUserStrategyInfoAddress(user1.address)
    let userInfo1 = UserStrategyInfo.createForDeploy(userInfoAddress1)
    let userInfoContract1 = blockchain.openContract(userInfo1)
    let userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(0n);
    expect(userInfoData1.shares).toBe(BigInt(1e9));
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_NO_DELEGATE));
    // user1 delegate before operator register
    let userDelegateRes1 = await userInfoContract1.sendDelegate(
        user1.getSender(), 3, operator.address, userResponse1.address, "0.5"
    );
    userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(0n);
    expect(userInfoData1.shares).toBe(BigInt(1e9));
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_NO_DELEGATE));

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
    userDelegateRes1 = await userInfoContract1.sendDelegate(
        user1.getSender(), 3, operator.address, userResponse1.address, "0.5"
    );
    // printTransactionFees(userDelegateRes1.transactions)
    userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(0n);
    expect(userInfoData1.shares).toBe(BigInt(1e9));
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_DELEGATE_DONE));

    let operatorStrategyShareAddress = await strategyTonContract.getOperatorStrategyShareAddress(operator.address)
    let operatorStrategyShare = OperatorStrategyShare.createForDeploy(operatorStrategyShareAddress)
    let operatorStrategyShareContract = blockchain.openContract(operatorStrategyShare)
    let operatorStrategyShareData = await operatorStrategyShareContract.getOperatorStrategyShareData()
    expect(operatorStrategyShareData.operatorAddress.toString()).toBe(operator.address.toString())
    expect(operatorStrategyShareData.strategyAddress.toString()).toBe(strategyTonContract.address.toString())
    expect(operatorStrategyShareData.shares).toBe(BigInt(1e9))

    // user1 undelegate
    userDelegateRes1 = await userInfoContract1.sendUndelegate(
        user1.getSender(), 1, userResponse1.address, "0.5"
    );
    userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_NO_DELEGATE));
    operatorStrategyShareData = await operatorStrategyShareContract.getOperatorStrategyShareData()
    expect(operatorStrategyShareData.shares).toBe(0n)

    // user2 try to ban operator
    let fakeAdminBanRes = await utonicManagerContract.sendSwitchOperatorStatus(
        user2.getSender(), 1, true, operator.address, userResponse2.address, "0.1"
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

    // user1 delegate
    userDelegateRes1 = await userInfoContract1.sendDelegate(
        user1.getSender(), 3, operator.address, userResponse1.address, "0.5"
    );
    // printTransactionFees(userDelegateRes1.transactions)
    userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(0n);
    expect(userInfoData1.shares).toBe(BigInt(1e9));
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_DELEGATE_DONE));

    operatorStrategyShareData = await operatorStrategyShareContract.getOperatorStrategyShareData()
    expect(operatorStrategyShareData.shares).toBe(BigInt(1e9))

    // user1 undelegate
    userDelegateRes1 = await userInfoContract1.sendUndelegate(
        user1.getSender(), 1, userResponse1.address, "0.5"
    );
    userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_NO_DELEGATE));
    operatorStrategyShareData = await operatorStrategyShareContract.getOperatorStrategyShareData()
    expect(operatorStrategyShareData.shares).toBe(0n)
    
    // admin ban operator
    let adminBanRes = await utonicManagerContract.sendSwitchOperatorStatus(
        admin.getSender(), 1, true, operator.address, admin.address, "0.5"
    )
    operatorRegisterData = await operatorRegisterContract.getOperatorRegisterData()
    expect(operatorRegisterData.status).toBe(BigInt(OPERATOR_REGISTER_STATUS_BANED))
    
    // user1 delegate when operator is baned
    userDelegateRes1 = await userInfoContract1.sendDelegate(
        user1.getSender(), 3, operator.address, userResponse1.address, "0.5"
    );
    userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(0n);
    expect(userInfoData1.shares).toBe(BigInt(1e9));
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_NO_DELEGATE));

    operatorStrategyShareData = await operatorStrategyShareContract.getOperatorStrategyShareData()
    expect(operatorStrategyShareData.shares).toBe(0n)

    operatorRegisterData = await operatorRegisterContract.getOperatorRegisterData()
    expect(operatorRegisterData.status).toBe(BigInt(OPERATOR_REGISTER_STATUS_BANED))
    
    // user2 try to un-ban operator
    let fakeAdminUnbanRes = await utonicManagerContract.sendSwitchOperatorStatus(
        user2.getSender(), 1, false, operator.address, userResponse2.address, "0.1"
    )
    expect(fakeAdminUnbanRes.transactions).toHaveTransaction(
        {
            op: UTONIC_MANAGER_OP_SWITCH_OPERATOR_STATUS,
            to: utonicManagerContract.address,
            exitCode: STAKE_ERR_UNAUTHORIZED,
        }
    )
    operatorRegisterData = await operatorRegisterContract.getOperatorRegisterData()
    expect(operatorRegisterData.operatorAddress.toString()).toBe(operator.address.toString())
    expect(operatorRegisterData.utonicManagerAddress.toString()).toBe(utonicManagerContract.address.toString())
    expect(operatorRegisterData.status).toBe(BigInt(OPERATOR_REGISTER_STATUS_BANED))

    // user1 delegate when operator is baned
    userDelegateRes1 = await userInfoContract1.sendDelegate(
        user1.getSender(), 3, operator.address, userResponse1.address, "0.5"
    );
    userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(0n);
    expect(userInfoData1.shares).toBe(BigInt(1e9));
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_NO_DELEGATE));

    operatorStrategyShareData = await operatorStrategyShareContract.getOperatorStrategyShareData()
    expect(operatorStrategyShareData.shares).toBe(0n)

    operatorRegisterData = await operatorRegisterContract.getOperatorRegisterData()
    expect(operatorRegisterData.status).toBe(BigInt(OPERATOR_REGISTER_STATUS_BANED))
    
    // admin unban operator
    let adminUnbanRes = await utonicManagerContract.sendSwitchOperatorStatus(
        admin.getSender(), 1, false, operator.address, admin.address, "0.5"
    )
    operatorRegisterData = await operatorRegisterContract.getOperatorRegisterData()
    expect(operatorRegisterData.status).toBe(BigInt(OPERATOR_REGISTER_STATUS_NORMAL))
    
    // user1 delegate when operator is baned
    userDelegateRes1 = await userInfoContract1.sendDelegate(
        user1.getSender(), 1, operator.address, userResponse1.address, "0.5"
    );
    userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(0n);
    expect(userInfoData1.shares).toBe(BigInt(1e9));
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_DELEGATE_DONE));

    operatorStrategyShareData = await operatorStrategyShareContract.getOperatorStrategyShareData()
    expect(operatorStrategyShareData.shares).toBe(BigInt(1e9))

    operatorRegisterData = await operatorRegisterContract.getOperatorRegisterData()
    expect(operatorRegisterData.status).toBe(BigInt(OPERATOR_REGISTER_STATUS_NORMAL))
    
  });

  it("strategy ton undelegate", async () => {
    // user1 deposit
    let userDepositRes1 = await strategyTonContract.sendDeposit(
        user1.getSender(), 9, BigInt(1e9), userResponse1.address, "2.0"
    );
    let userInfoAddress1 = await strategyTonContract.getUserStrategyInfoAddress(user1.address)
    let userInfo1 = UserStrategyInfo.createForDeploy(userInfoAddress1)
    let userInfoContract1 = blockchain.openContract(userInfo1)
    let userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(0n);
    expect(userInfoData1.shares).toBe(BigInt(1e9));
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_NO_DELEGATE));
    // user1 undelegate when no delegate
    let userUndelegateRes1 = await userInfoContract1.sendUndelegate(
        user1.getSender(), 3, userResponse1.address, "0.5"
    );
    expect(userUndelegateRes1.transactions).toHaveTransaction({
        to: userInfoContract1.address,
        exitCode: STAKE_ERR_INVALID_STATUS
    })
    userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(0n);
    expect(userInfoData1.shares).toBe(BigInt(1e9));
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_NO_DELEGATE));

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
        user1.getSender(), 1, operator.address, userResponse1.address, "0.5"
    );
    userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(0n);
    expect(userInfoData1.shares).toBe(BigInt(1e9));
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_DELEGATE_DONE));

    let operatorStrategyShareAddress = await strategyTonContract.getOperatorStrategyShareAddress(operator.address)
    let operatorStrategyShare = OperatorStrategyShare.createForDeploy(operatorStrategyShareAddress)
    let operatorStrategyShareContract = blockchain.openContract(operatorStrategyShare)
    let operatorStrategyShareData = await operatorStrategyShareContract.getOperatorStrategyShareData()
    expect(operatorStrategyShareData.operatorAddress.toString()).toBe(operator.address.toString())
    expect(operatorStrategyShareData.strategyAddress.toString()).toBe(strategyTonContract.address.toString())
    expect(operatorStrategyShareData.shares).toBe(BigInt(1e9))

    // user1 undelegate
    userUndelegateRes1 = await userInfoContract1.sendUndelegate(
        user1.getSender(), 1, userResponse1.address, "0.5"
    );
    // printTransactionFees(userDelegateRes1.transactions)
    userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(0n);
    expect(userInfoData1.shares).toBe(BigInt(1e9));
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_NO_DELEGATE));
    operatorStrategyShareData = await operatorStrategyShareContract.getOperatorStrategyShareData()
    expect(operatorStrategyShareData.operatorAddress.toString()).toBe(operator.address.toString())
    expect(operatorStrategyShareData.strategyAddress.toString()).toBe(strategyTonContract.address.toString())
    expect(operatorStrategyShareData.shares).toBe(0n)

    // user1 delegate
    userDelegateRes1 = await userInfoContract1.sendDelegate(
        user1.getSender(), 1, operator.address, userResponse1.address, "0.5"
    );
    userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(0n);
    expect(userInfoData1.shares).toBe(BigInt(1e9));
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_DELEGATE_DONE));
    operatorStrategyShareData = await operatorStrategyShareContract.getOperatorStrategyShareData()
    expect(operatorStrategyShareData.shares).toBe(BigInt(1e9))

    // user2 try to ban operator
    let fakeAdminBanRes = await utonicManagerContract.sendSwitchOperatorStatus(
        user2.getSender(), 1, true, operator.address, userResponse2.address, "0.1"
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

    // user1 undelegate
    userUndelegateRes1 = await userInfoContract1.sendUndelegate(
        user1.getSender(), 1, userResponse1.address, "0.5"
    );
    // printTransactionFees(userDelegateRes1.transactions)
    userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(0n);
    expect(userInfoData1.shares).toBe(BigInt(1e9));
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_NO_DELEGATE));

    operatorStrategyShareData = await operatorStrategyShareContract.getOperatorStrategyShareData()
    expect(operatorStrategyShareData.shares).toBe(0n)

    // user1 delegate
    userDelegateRes1 = await userInfoContract1.sendDelegate(
        user1.getSender(), 1, operator.address, userResponse1.address, "0.5"
    );
    userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_DELEGATE_DONE));
    operatorStrategyShareData = await operatorStrategyShareContract.getOperatorStrategyShareData()
    expect(operatorStrategyShareData.shares).toBe(BigInt(1e9))
    
    // admin ban operator
    let adminBanRes = await utonicManagerContract.sendSwitchOperatorStatus(
        admin.getSender(), 1, true, operator.address, admin.address, "0.5"
    )
    operatorRegisterData = await operatorRegisterContract.getOperatorRegisterData()
    expect(operatorRegisterData.status).toBe(BigInt(OPERATOR_REGISTER_STATUS_BANED))
    
    // user1 undelegate when operator is baned
    userUndelegateRes1 = await userInfoContract1.sendUndelegate(
        user1.getSender(), 1, userResponse1.address, "0.5"
    );
    userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(0n);
    expect(userInfoData1.shares).toBe(BigInt(1e9));
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_DELEGATE_DONE));

    operatorStrategyShareData = await operatorStrategyShareContract.getOperatorStrategyShareData()
    expect(operatorStrategyShareData.shares).toBe(BigInt(1e9))

    operatorRegisterData = await operatorRegisterContract.getOperatorRegisterData()
    expect(operatorRegisterData.status).toBe(BigInt(OPERATOR_REGISTER_STATUS_BANED))
    
    // user2 try to un-ban operator
    let fakeAdminUnbanRes = await utonicManagerContract.sendSwitchOperatorStatus(
        user2.getSender(), 1, false, operator.address, userResponse2.address, "0.1"
    )
    expect(fakeAdminUnbanRes.transactions).toHaveTransaction(
        {
            op: UTONIC_MANAGER_OP_SWITCH_OPERATOR_STATUS,
            to: utonicManagerContract.address,
            exitCode: STAKE_ERR_UNAUTHORIZED,
        }
    )
    operatorRegisterData = await operatorRegisterContract.getOperatorRegisterData()
    expect(operatorRegisterData.operatorAddress.toString()).toBe(operator.address.toString())
    expect(operatorRegisterData.utonicManagerAddress.toString()).toBe(utonicManagerContract.address.toString())
    expect(operatorRegisterData.status).toBe(BigInt(OPERATOR_REGISTER_STATUS_BANED))

    // user1 undelegate when operator is baned
    userUndelegateRes1 = await userInfoContract1.sendUndelegate(
        user1.getSender(), 1, userResponse1.address, "0.5"
    );
    userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(0n);
    expect(userInfoData1.shares).toBe(BigInt(1e9));
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_DELEGATE_DONE));

    operatorStrategyShareData = await operatorStrategyShareContract.getOperatorStrategyShareData()
    expect(operatorStrategyShareData.shares).toBe(BigInt(1e9))

    operatorRegisterData = await operatorRegisterContract.getOperatorRegisterData()
    expect(operatorRegisterData.status).toBe(BigInt(OPERATOR_REGISTER_STATUS_BANED))
    
    // admin unban operator
    let adminUnbanRes = await utonicManagerContract.sendSwitchOperatorStatus(
        admin.getSender(), 1, false, operator.address, admin.address, "0.5"
    )
    operatorRegisterData = await operatorRegisterContract.getOperatorRegisterData()
    expect(operatorRegisterData.status).toBe(BigInt(OPERATOR_REGISTER_STATUS_NORMAL))
    
    // user1 undelegate when operator is unbaned
    userUndelegateRes1 = await userInfoContract1.sendUndelegate(
        user1.getSender(), 1, userResponse1.address, "0.5"
    );
    userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(0n);
    expect(userInfoData1.shares).toBe(BigInt(1e9));
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_NO_DELEGATE));

    operatorStrategyShareData = await operatorStrategyShareContract.getOperatorStrategyShareData()
    expect(operatorStrategyShareData.shares).toBe(0n)

    operatorRegisterData = await operatorRegisterContract.getOperatorRegisterData()
    expect(operatorRegisterData.status).toBe(BigInt(OPERATOR_REGISTER_STATUS_NORMAL))
    
  });

  it("operator reregister: strategy ton delegate", async () => {
    // user1 deposit
    let userDepositRes1 = await strategyTonContract.sendDeposit(
        user1.getSender(), 9, BigInt(1e9), userResponse1.address, "2.0"
    );
    let userInfoAddress1 = await strategyTonContract.getUserStrategyInfoAddress(user1.address)
    let userInfo1 = UserStrategyInfo.createForDeploy(userInfoAddress1)
    let userInfoContract1 = blockchain.openContract(userInfo1)
    let userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(0n);
    expect(userInfoData1.shares).toBe(BigInt(1e9));
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_NO_DELEGATE));

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
        user1.getSender(), 1, operator.address, userResponse1.address, "0.5"
    );
    userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(0n);
    expect(userInfoData1.shares).toBe(BigInt(1e9));
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_DELEGATE_DONE));

    let operatorStrategyShareAddress = await strategyTonContract.getOperatorStrategyShareAddress(operator.address)
    let operatorStrategyShare = OperatorStrategyShare.createForDeploy(operatorStrategyShareAddress)
    let operatorStrategyShareContract = blockchain.openContract(operatorStrategyShare)
    let operatorStrategyShareData = await operatorStrategyShareContract.getOperatorStrategyShareData()
    expect(operatorStrategyShareData.operatorAddress.toString()).toBe(operator.address.toString())
    expect(operatorStrategyShareData.strategyAddress.toString()).toBe(strategyTonContract.address.toString())
    expect(operatorStrategyShareData.shares).toBe(BigInt(1e9))

    // user1 undelegate
    let userUndelegateRes1 = await userInfoContract1.sendUndelegate(
        user1.getSender(), 1, userResponse1.address, "0.5"
    );
    userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_NO_DELEGATE));
    operatorStrategyShareData = await operatorStrategyShareContract.getOperatorStrategyShareData()
    expect(operatorStrategyShareData.shares).toBe(0n)
    operatorRegisterData = await operatorRegisterContract.getOperatorRegisterData()
    expect(operatorRegisterData.operatorAddress.toString()).toBe(operator.address.toString())
    expect(operatorRegisterData.utonicManagerAddress.toString()).toBe(utonicManagerContract.address.toString())
    expect(operatorRegisterData.status).toBe(BigInt(OPERATOR_REGISTER_STATUS_NORMAL))

    // admin ban operator
    let adminBanRes = await utonicManagerContract.sendSwitchOperatorStatus(
        admin.getSender(), 1, true, operator.address, admin.address, "0.5"
    )
    operatorRegisterData = await operatorRegisterContract.getOperatorRegisterData()
    expect(operatorRegisterData.status).toBe(BigInt(OPERATOR_REGISTER_STATUS_BANED))

    // operator re-register
    operatorRegisterRes = await utonicManagerContract.sendRegister(
        operator.getSender(), 1, operatorResponse.address, "0.1"
    )
    expect(operatorRegisterRes.transactions).toHaveTransaction({
        from: utonicManagerContract.address,
        to: operatorRegister.address,
        exitCode: STAKE_ERR_INVALID_STATUS
    })

    // user1 delegate when operator is baned
    userDelegateRes1 = await userInfoContract1.sendDelegate(
        user1.getSender(), 1, operator.address, userResponse1.address, "0.5"
    );
    userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(0n);
    expect(userInfoData1.shares).toBe(BigInt(1e9));
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_NO_DELEGATE));

  });

  it("operator reregister: strategy ton undelegate", async () => {
    // user1 deposit
    let userDepositRes1 = await strategyTonContract.sendDeposit(
        user1.getSender(), 9, BigInt(1e9), userResponse1.address, "2.0"
    );
    let userInfoAddress1 = await strategyTonContract.getUserStrategyInfoAddress(user1.address)
    let userInfo1 = UserStrategyInfo.createForDeploy(userInfoAddress1)
    let userInfoContract1 = blockchain.openContract(userInfo1)
    let userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(0n);
    expect(userInfoData1.shares).toBe(BigInt(1e9));
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_NO_DELEGATE));
    
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
        user1.getSender(), 1, operator.address, userResponse1.address, "0.5"
    );
    userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(0n);
    expect(userInfoData1.shares).toBe(BigInt(1e9));
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_DELEGATE_DONE));

    let operatorStrategyShareAddress = await strategyTonContract.getOperatorStrategyShareAddress(operator.address)
    let operatorStrategyShare = OperatorStrategyShare.createForDeploy(operatorStrategyShareAddress)
    let operatorStrategyShareContract = blockchain.openContract(operatorStrategyShare)
    let operatorStrategyShareData = await operatorStrategyShareContract.getOperatorStrategyShareData()
    expect(operatorStrategyShareData.operatorAddress.toString()).toBe(operator.address.toString())
    expect(operatorStrategyShareData.strategyAddress.toString()).toBe(strategyTonContract.address.toString())
    expect(operatorStrategyShareData.shares).toBe(BigInt(1e9))

    // admin ban operator
    let adminBanRes = await utonicManagerContract.sendSwitchOperatorStatus(
        admin.getSender(), 1, true, operator.address, admin.address, "0.5"
    )
    operatorRegisterData = await operatorRegisterContract.getOperatorRegisterData()
    expect(operatorRegisterData.status).toBe(BigInt(OPERATOR_REGISTER_STATUS_BANED))
    
    // operator re-register
    operatorRegisterRes = await utonicManagerContract.sendRegister(
        operator.getSender(), 1, operatorResponse.address, "0.1"
    )
    expect(operatorRegisterRes.transactions).toHaveTransaction({
        from: utonicManagerContract.address,
        to: operatorRegister.address,
        exitCode: STAKE_ERR_INVALID_STATUS
    })

    // user1 undelegate when operator is baned
    let userUndelegateRes1 = await userInfoContract1.sendUndelegate(
        user1.getSender(), 1, userResponse1.address, "0.5"
    );
    userInfoData1 = await userInfoContract1.getUserStrategyInfoData()
    expect(userInfoData1.withdrawCnt).toBe(0n);
    expect(userInfoData1.shares).toBe(BigInt(1e9));
    expect(userInfoData1.status).toBe(BigInt(USER_STRATEGY_INFO_STATUS_DELEGATE_DONE));

    operatorStrategyShareData = await operatorStrategyShareContract.getOperatorStrategyShareData()
    expect(operatorStrategyShareData.shares).toBe(BigInt(1e9))

    operatorRegisterData = await operatorRegisterContract.getOperatorRegisterData()
    expect(operatorRegisterData.status).toBe(BigInt(OPERATOR_REGISTER_STATUS_BANED))

  });
});