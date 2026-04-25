-include .env

.PHONY: install build test deploy-testnet

install:
	forge install vectorized/solady --no-git
	forge install foundry-rs/forge-std --no-git

build:
	forge build

test:
	forge test -vvv

gas:
	forge test --gas-report

deploy-testnet:
	forge script script/Deploy.s.sol:DeployKopiLoyalty \
		--rpc-url monad_testnet \
		--broadcast \
		--verify \
		-vvvv

# Local anvil simulation
anvil-deploy:
	forge script script/Deploy.s.sol:DeployKopiLoyalty \
		--rpc-url http://localhost:8545 \
		--broadcast \
		-vvvv
