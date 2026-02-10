import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const PACKAGE_PATH = path.join(__dirname, "../../move_dex");
const CONFIG_PATH = path.join(__dirname, "../src/config.ts");

function runCommand(command: string): any {
    try {
        const output = execSync(command, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }); // ignore stderr to avoid noise
        return JSON.parse(output);
    } catch (e: any) {
        console.error(`Command failed: ${command}`);
        throw e;
    }
}

async function main() {
    console.log("Deploying Move Dex...");

    // 1. Publish Package
    console.log("Publishing package...");
    // standard output for publish includes "objectChanges"
    const publishJson = runCommand(`sui client publish --gas-budget 100000000 --json "${PACKAGE_PATH}" --skip-fetch-latest-git-deps`);

    if (publishJson.effects.status.status !== "success") {
        throw new Error("Publish failed");
    }

    const packageId = publishJson.objectChanges.find(
        (c: any) => c.type === "published"
    )?.packageId;

    if (!packageId) {
        throw new Error("Could not find published package ID");
    }
    console.log(`Package Published: ${packageId}`);

    // Wait slightly
    await new Promise(r => setTimeout(r, 2000));

    // 2. Find Treasury Cap
    // Look for created object with type TreasuryCap
    const treasuryCap = publishJson.objectChanges.find(
        (c: any) => c.type === "created" && c.objectType.includes("::faucet_coin::FAUCET_COIN") && c.objectType.includes("TreasuryCap")
    );

    const treasuryCapId = treasuryCap?.objectId;
    if (!treasuryCapId) {
        throw new Error("Could not find TreasuryCap ID");
    }
    console.log(`Treasury Cap found: ${treasuryCapId}`);

    // 3. Create Pool (Mint + Create)
    // We can't easily do a PTB via CLI in one go without complex json construction. 
    // We will do 2 calls: separate mint and create.

    const activeAddress = JSON.parse(execSync("sui client active-address --json", { encoding: "utf-8" })).activeAddress;
    console.log(`Active Address: ${activeAddress}`);

    // 3a. Mint Faucet Coin
    console.log("Minting Faucet Coin...");
    const mintJson = runCommand(`sui client call --package ${packageId} --module faucet_coin --function mint --args ${treasuryCapId} 1000000000 ${activeAddress} --gas-budget 100000000 --json`);

    if (mintJson.effects.status.status !== "success") throw new Error("Mint failed");

    // Find the minted coin object ID
    // It's a created object of type Coin<FAUCET_COIN>
    const mintedCoin = mintJson.objectChanges.find(
        (c: any) => c.type === "created" && c.objectType.includes("::faucet_coin::FAUCET_COIN") && c.objectType.includes("::coin::Coin")
    );
    const coinBId = mintedCoin?.objectId;
    if (!coinBId) throw new Error("Could not find minted coin");

    // 3b. Create Pool
    console.log("Creating Pool...");
    // Split SUI for Coin A
    // We need a SUI coin with specific amount? `create_pool` takes Coin<T>. 
    // If we pass a large coin, it uses the whole thing? 
    // `create_pool` implementation: `let amt_a = coin::value(&coin_a); ... transfer::share_object(pool)`
    // It consumes the coin. So we MUST split a specific amount first.

    // Split 1 SUI
    const splitJson = runCommand(`sui client call --package 0x2 --module coin --function split --type-args 0x2::sui::SUI --args gas 1000000000 --gas-budget 10000000 --json`);
    const splitCoin = splitJson.objectChanges.find(
        (c: any) => c.type === "created" && c.objectType.startsWith("0x2::coin::Coin<0x2::sui::SUI>")
    );
    const coinAId = splitCoin?.objectId;
    if (!coinAId) throw new Error("Could not split SUI coin");

    // Create Pool call
    const createPoolJson = runCommand(`sui client call --package ${packageId} --module amm --function create_pool --type-args 0x2::sui::SUI ${packageId}::faucet_coin::FAUCET_COIN --args ${coinAId} ${coinBId} --gas-budget 1000000000 --json`);

    if (createPoolJson.effects.status.status !== "success") throw new Error("Pool creation failed");

    const poolId = createPoolJson.objectChanges.find(
        (c: any) => c.type === "created" && c.objectType.includes("::amm::Pool")
    )?.objectId;

    console.log(`Pool Created: ${poolId}`);

    // Update Config
    let configContent = fs.readFileSync(CONFIG_PATH, "utf-8");
    configContent = configContent.replace(/export const PACKAGE_ID = ".*";/, `export const PACKAGE_ID = "${packageId}";`);
    configContent = configContent.replace(/export const POOL_ID = ".*";/, `export const POOL_ID = "${poolId}";`);
    configContent = configContent.replace(/export const CUSTOM_TOKEN_TYPE = ".*";/, `export const CUSTOM_TOKEN_TYPE = "${packageId}::faucet_coin::FAUCET_COIN";`);

    fs.writeFileSync(CONFIG_PATH, configContent);
    console.log("Config updated!");
}

main().catch(console.error);
