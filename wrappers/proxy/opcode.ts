// inheritate from common
export const PROXY_COMMON_OP_CODE_BASE = 0x1000;

// opcodes
export const PROXY_COMMON_OP_QUERY = PROXY_COMMON_OP_CODE_BASE + 1;
export const PROXY_COMMON_OP_QUERY_ACK = PROXY_COMMON_OP_CODE_BASE + 2;
export const PROXY_COMMON_OP_STAKE = PROXY_COMMON_OP_CODE_BASE + 3;
export const PROXY_COMMON_OP_BURN_NOTIFICATION = PROXY_COMMON_OP_CODE_BASE + 4;

// admin
export const PROXY_COMMON_OP_UPDATE_ADMIN = PROXY_COMMON_OP_CODE_BASE + 5;
export const PROXY_COMMON_OP_ACCEPT_ADMIN = PROXY_COMMON_OP_CODE_BASE + 6;
export const PROXY_COMMON_OP_UPDATE_UTON_RECEIVER = PROXY_COMMON_OP_CODE_BASE + 7;
export const PROXY_COMMON_OP_UPDATE_TON_RECEIVER = PROXY_COMMON_OP_CODE_BASE + 8;
export const PROXY_COMMON_OP_EXTRACT_ASSETS = PROXY_COMMON_OP_CODE_BASE + 9;
export const PROXY_COMMON_OP_UPDATE_CAPACITY = PROXY_COMMON_OP_CODE_BASE + 10;