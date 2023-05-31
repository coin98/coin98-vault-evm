# Coin98 Vault

## Setup .env
```env
ETHERSCAN_API_KEY=
INFURA_API_KEY=
PRIVATE_KEY=
```

1. Build
```sh
npx hardhat compile
```

2. Test
```sh
npx hardhat test --parallel
```

3. Deploy
```sh
npx hardhat deploy
```

4. Verify
```sh
npx hardhat verify $ADDRESS
```
