# view interfaces

### 1. uTon minter

##### 1.1 get_minter_data

Get whole data of uTon minter contract.

No input parameter.

Returns
```
total_supply, last_price_day, last_price, price_inc, admin_address, pending_admin_address, proxy_whitelist, content, jetton_wallet_code
```

##### 1.2 get_jetton_data

Get some meta data of jetton.

No input parameter, follows standard jetton view interface "get_jetton_data".

Returns
```
total_supply, -1, admin_address, content, jetton_wallet_code
```


##### 1.3 get_wallet_address

Get user's uTon wallet address. Follows standard jetton view interface.

Call the interface via following pseudo code
```
minter.get_wallet_address(user_address)
```

And returns calculated user's uTon wallet address.


### 2. uTon wallet

##### 2.1 get_wallet_data

Get some data of a uTon wallet (in jetton interface).

No input parameter, follows standard jetton view interface "get_wallet_data"

Returns

```
    balance, 
    owner_address, 
    jetton_master_address, 
    jetton_wallet_code
```

##### 2.2 get_complete_wallet_data

Get whole data of a uTon wallet contract.

No input parameter.

Returns

```
        balance, 
        withdraw_cnt,
        owner_address, 
        jetton_master_address, 
        jetton_wallet_code
```

The "withdraw_cnt" above is times of user calling "burn" interface.