## utonic restaking

### 1. install ton-keeper

install ton-keeper on your desktop (or phone), we need `Sign in with tonkeeper` when we deploy contracts.

### 2. clone, build and test

node: 18

clone:

```
$ git clone git@github.com:UTONICFinance/utonic-contracts-uTON.git
```

install dependencies:

```
$ cd utonic-contracts-uTON
$ npm install
```

build:

```
$ mkdir build
$ yarn compileminter
$ yarn compilewallet
$ yarn compilewithdraw
$ yarn compileproxylstton
$ yarn compileproxyton
$ yarn compileproxywhale2
$ yarn compileproxywhale3
$ yarn compilediscovery
```

### 3. config file

create a file named `config.ini` and write following content:

```
network=mainnet
words=${24 mnemonic words}

;; fill before deploying proxy
utonic_minter=${address-of-minter}

;; fill before updating content via scripts
content_url=${url}

withdraw_pending_time=259200

;; fill before deploying proxy-lstton
lst_ton_receiver=${lstton-receiver-address}

;; fill before deploying proxy-ton
ton_receiver=${ton-receiver-address}
price_inc=0.0001

;; fill before deploying each contracts!
admin_address=${admin address}

proxy_st_ton_id=1
st_ton_price=1.0478
;; limit in decimal
proxy_st_ton_limit=20000
proxy_ts_ton_id=2
ts_ton_price=1.0404
;; limit in decimal
proxy_ts_ton_limit=20000

;; admin address of proxywhale3
proxy_whale3_admin=${address}
;; uton receiver of proxywhale3
proxy_whale3_uton_receiver=${address}
;; user of proxywhale3
proxy_whale3_whale=${address}
;; limit in decimal
proxy_whale3_limit=1

;; new id, must be greater than 
;; previous id (greatest id is 13 for current mainnet uton-minter)
proxy_whale3_id=
```

### 4. Sign in for deployment

before this section, we should complete previous sections.

```
$ npx blueprint run
```

select following options:

```
-> deployUtonicMinter
-> mainnet
-> TON Connect compatible mobile wallet (example: Tonkeeper)
-> Tonkeeper
```

We copy the link and open it in your chrome, And click button `Sign in with Tonkeeper` and click `connect` button in the pop up window of `Tonkeeper`.

Now we have complete `sign-in`.

If you want to sign in with another wallet, just simply remove `temp/` directory.


### 5. utonic minter

##### 5.1 deploy utonic minter

before this section, we should complete previous sections.

```
$ npx blueprint run
```

Then select as following options:

```
-> deployUtonicMinter
-> mainnet
-> TON Connect compatible mobile wallet (example: Tonkeeper)
-> Tonkeeper
```

and in the last section `Sign in for deployment`, we have already deployed utonic minter in fact, and we may get output like following:

```
Connected to wallet at address: EQCR3siASIbWlXKoUnMs5GoRSXkez084WrkRcDs8GKlMX-Zg
contract address: EQCg5JBj791bkqIMDD5gxHhy1Zou8sCjuHWbJhcKuGJh0Sw_
Counter already deployed
```

in this example, the address we deployed is `EQCg5JBj791bkqIMDD5gxHhy1Zou8sCjuHWbJhcKuGJh0Sw_`.

##### 5.2 update content

fill the `utonic_minter` and `content_url` in `config.ini`:

```
utonic_minter=EQCg5JBj791bkqIMDD5gxHhy1Zou8sCjuHWbJhcKuGJh0Sw_
content_url=abcdefg.net
admin_address=${admin address}
```

then
```
$ npx blueprint run
```
select `updateMinterContent`, and `content-url` will be set if we successfully run the scripts.


### 6. proxy ton

fill the `utonic_minter` parameter in `config.ini`:

```
utonic_minter=EQCg5JBj791bkqIMDD5gxHhy1Zou8sCjuHWbJhcKuGJh0Sw_
admin_address=${admin address}

... other configs

ton_receiver=${receiver of ton}
```

then, run script to deploy strategy ton

```
$ npx blueprint run
```

select following options:
```
deployProxyTon -> 
mainnet ->
TON Connect compatible mobile wallet (example: Tonkeeper) ->
Tonkeeper
```

in this example, the contract address is `EQB13xJhcM8m4CtC-9RtUj7oK_zTZ59jeZIzE5q1F-Ux-gOH`.
**Notice:** after deployment of `proxy ton`, we should config it in `utonic-minter` via `admin-tool`. the `proxyId` is 0, `proxyType` is also 0.
Number of each proxy type can be viewed at the bottom of this document.

### 7. deploy proxyTSTon and proxySTTon

fill fields in `config.ini` like following:

```
utonic_minter=EQCg5JBj791bkqIMDD5gxHhy1Zou8sCjuHWbJhcKuGJh0Sw_
admin_address=${admin address}

... other config

lst_ton_receiver=${receiver address}
proxy_st_ton_id=1
st_ton_price=1.0478
proxy_st_ton_limit=20000
proxy_ts_ton_id=2
ts_ton_price=1.0404
proxy_ts_ton_limit=20000
```

**important:** we configured proxyId for `proxySTTon` and `proxyTSTon`, for same `utonic minter`, each proxy (including `proxyTon`, `proxyLSTTon`, `proxyWhale3`...) must have different `proxyId`.

then, run script to deploy strategy ton

```
$ npx blueprint run
```

for proxy-stton, select `deployProxySTTon`.

for proxy-tston, select `deployProxyTSTon`.

in this example, address of `proxySTTon` is `EQCVv2SCQJC9gYu7_yciGauJjcIl6xu_hpI-qjDIN7gbT0CC`, address of `proxyTSTon` is `EQAYEDGMT1rtkO0idp2Yo6veLsFLDjxGCXaPX2rFH-uSObQy`.

**Notice1:** after deployment of `proxySTTon` and `proxyTSTon`, we should config it in `utonic-minter` via `admin-tool`. both of these 2 contracts have `proxyType` of `1`, and `proxyId` can be viewed in `config.ini`.

**Notice2:** we should set `stton-wallet` for `proxySTTon` and `tston-wallet` for `proxyTSTon` after deployment, via `admin-tool`.


### 8. deploy proxyWhale3

fill parameter in `config.ini` like following:

```
utonic_minter=EQCg5JBj791bkqIMDD5gxHhy1Zou8sCjuHWbJhcKuGJh0Sw_
admin_address=${admin address}

... other config

proxy_whale3_admin=${admin address}
proxy_whale3_uton_receiver=${uton receiver}
proxy_whale3_whale=${user}
proxy_whale3_limit=1

;; each proxy must have different id
proxy_whale3_id=3
```

then, run script to deploy strategy ton

```
$ npx blueprint run
```

select `deployProxyWhale3`.

in this example, address of `proxyWhale3` is `EQDTxBgdC_efgKIiCNA1hQYzqnpKGnox6Txwc3EB-SlQHq8m`.

**Notice:** after deployment of `proxyWhale3`, we should config it in `utonic-minter` via `admin-tool`. `proxyType` of `4`, and `proxyId` can be viewed in `config.ini`.

### 9. proxy type

```
export const TYPE_PROXY_TON = 0;
export const TYPE_PROXY_LSTTON = 1;
export const TYPE_PROXY_WHALE3 = 4;
```
