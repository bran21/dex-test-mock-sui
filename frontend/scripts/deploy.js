const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const LOG_FILE = path.join(__dirname, "deploy.log");

function log(message) {
    console.log(message);
    fs.appendFileSync(LOG_FILE, message + "\n");
}

const PACKAGE_PATH = path.join(__dirname, "../../move_dex");
const CONFIG_PATH = path.join(__dirname, "../src/config.ts");

// Initialize log
fs.writeFileSync(LOG_FILE, "Starting deployment...\n");

function runCommand(command) {
    try {
        log(`Running: ${command}`);
        const output = execSync(command, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
        // Attempt to find JSON in output. It might be surrounded by build logs.
        // We look for the first '{' that starts a valid JSON object? 
        // Or better: The output of --json is usually the last thing.
        // Let's try to parse the whole thing first, if fail, try to find the start of JSON.
        try {
            return JSON.parse(output);
        } catch (e) {
            // Find the first line that starts with '{'
            const lines = output.split('\n');
            let jsonString = "";
            let started = false;
            for (const line of lines) {
                if (line.trim().startsWith('{') || line.trim().startsWith('[')) {
                    started = true;
                }
                if (started) {
                    jsonString += line + "\n";
                }
            }
            if (jsonString) {
                return JSON.parse(jsonString);
            }
            throw e;
        }
    } catch (e) {
        log(`Command failed: ${command}`);
        if (e.stderr) log(`Stderr: ${e.stderr.toString()}`);
        if (e.stdout) log(`Stdout: ${e.stdout.toString()}`);
        throw e;
    }
}

async function main() {
    log("Deploying Move Dex...");

    // Clean up Published.toml to allow re-publishing
    const publishedTomlPath = path.join(PACKAGE_PATH, "Published.toml");
    if (fs.existsSync(publishedTomlPath)) {
        fs.unlinkSync(publishedTomlPath);
        log("Deleted Published.toml");
    }

    // 1. Publish Package
    log("Publishing package...");
    let publishJson;
    try {
        publishJson = runCommand(`sui client publish --gas-budget 200000000 --json "${PACKAGE_PATH}"`);
    } catch (e) {
        log("Publish step failed.");
        throw e;
    }

    if (publishJson.effects.status.status !== "success") {
        throw new Error("Publish failed");
    }

    const packageId = publishJson.objectChanges.find(
        (c) => c.type === "published"
    )?.packageId;

    if (!packageId) {
        throw new Error("Could not find published package ID");
    }
    log(`Package Published: ${packageId}`);

    // Wait slightly
    await new Promise(r => setTimeout(r, 2000));

    // 2. Find Treasury Cap
    const treasuryCap = publishJson.objectChanges.find(
        (c) => c.type === "created" && c.objectType.includes("::faucet_coin::FAUCET_COIN") && c.objectType.includes("TreasuryCap")
    );

    const treasuryCapId = treasuryCap?.objectId;
    if (!treasuryCapId) {
        throw new Error("Could not find TreasuryCap ID");
    }
    log(`Treasury Cap found: ${treasuryCapId}`);

    const activeAddressJson = runCommand("sui client active-address --json");
    const activeAddress = typeof activeAddressJson === "string" ? activeAddressJson : activeAddressJson.activeAddress;
    log(`Active Address: ${activeAddress}`);

    // 3a. Mint Faucet Coin
    log("Minting Faucet Coin...");
    const mintJson = runCommand(`sui client call --package ${packageId} --module faucet_coin --function mint --args ${treasuryCapId} 1000000000 ${activeAddress} --gas-budget 200000000 --json`);

    if (mintJson.effects.status.status !== "success") throw new Error("Mint failed");

    const mintedCoin = mintJson.objectChanges.find(
        (c) => c.type === "created" && c.objectType.includes("::faucet_coin::FAUCET_COIN") && c.objectType.includes("::coin::Coin")
    );
    const coinBId = mintedCoin?.objectId;
    if (!coinBId) throw new Error("Could not find minted coin");
    log(`Minted Coin: ${coinBId}`);

    // 3b. Create Pool
    // Get gas coin for Coin A

    // Query coins
    let coinsJson = runCommand(`sui client gas --json`);
    log(`Gas Coins Raw: ${JSON.stringify(coinsJson)}`);
    if (!Array.isArray(coinsJson)) coinsJson = [coinsJson]; // Handle single object return edge case?
    coinsJson = coinsJson.filter(c => Number(c.mistBalance) > 0);
    coinsJson.sort((a, b) => Number(b.mistBalance) - Number(a.mistBalance));

    let primaryCoin = coinsJson[0];
    const totalBalance = coinsJson.reduce((acc, c) => acc + Number(c.mistBalance), 0);

    if (totalBalance < 1100000000) {
        throw new Error(`Insufficient SUI balance. Have ${totalBalance} MIST, need > 1.1 SUI.`);
    }

    if (Number(primaryCoin.mistBalance) < 1100000000) {
        log("Primary coin too small. Merging coins...");
        const otherCoins = coinsJson.slice(1).map(c => c.gasCoinId);

        // Merge in chunks of 50
        while (otherCoins.length > 0) {
            const chunk = otherCoins.splice(0, 50);
            const mergeArgs = chunk.map(id => `--coin-to-merge ${id}`).join(" ");
            log(`Merging ${chunk.length} coins...`);
            runCommand(`sui client merge-coin --primary-coin ${primaryCoin.gasCoinId} ${mergeArgs} --gas-budget 50000000 --json`);
        }

        // Refresh primary coin
        coinsJson = runCommand(`sui client gas --json`);
        log(`Gas Coins Raw: ${JSON.stringify(coinsJson)}`); // logging again to be sure
        if (!Array.isArray(coinsJson)) coinsJson = [coinsJson];
        coinsJson = coinsJson.filter(c => Number(c.mistBalance) > 0);
        coinsJson.sort((a, b) => Number(b.mistBalance) - Number(a.mistBalance));
        primaryCoin = coinsJson[0];
        log(`New Primary Balance: ${Number(primaryCoin.mistBalance)}`);
    }

    const gasCoinId = primaryCoin.gasCoinId;
    log(`Using Gas Coin for split: ${gasCoinId}`);

    // Split Coin
    // Using call to split.
    log("Splitting SUI coin...");
    // Arguments: coin object, amounts array
    // Note: To pass vector<u64>, we use bracket syntax in CLI? `"[1000000000]"`
    // Also, 0x2::coin::split takes `&mut Coin`.
    const splitJson = runCommand(`sui client call --package 0x2 --module coin --function split --type-args 0x2::sui::SUI --args ${gasCoinId} "[1000000000]" --gas-budget 50000000 --json`);

    if (splitJson.effects.status.status !== "success") throw new Error("Split failed");

    const splitCoin = splitJson.objectChanges.find(
        (c) => c.type === "created" && c.objectType.startsWith("0x2::coin::Coin<0x2::sui::SUI>")
    );
    const coinAId = splitCoin?.objectId;
    if (!coinAId) throw new Error("Could not split SUI coin");
    log(`Split Coin (SUI): ${coinAId}`);

    // Create Pool call
    log("Creating Pool...");
    const createPoolJson = runCommand(`sui client call --package ${packageId} --module amm --function create_pool --type-args 0x2::sui::SUI ${packageId}::faucet_coin::FAUCET_COIN --args ${coinAId} ${coinBId} --gas-budget 200000000 --json`);

    if (createPoolJson.effects.status.status !== "success") throw new Error("Pool creation failed");

    const poolId = createPoolJson.objectChanges.find(
        (c) => c.type === "created" && c.objectType.includes("::amm::Pool")
    )?.objectId;

    log(`Pool Created: ${poolId}`);

    // Update Config
    let configContent = fs.readFileSync(CONFIG_PATH, "utf-8");
    configContent = configContent.replace(/export const PACKAGE_ID = ".*";/, `export const PACKAGE_ID = "${packageId}";`);
    configContent = configContent.replace(/export const POOL_ID = ".*";/, `export const POOL_ID = "${poolId}";`);
    configContent = configContent.replace(/export const CUSTOM_TOKEN_TYPE = ".*";/, `export const CUSTOM_TOKEN_TYPE = "${packageId}::faucet_coin::FAUCET_COIN";`);

    fs.writeFileSync(CONFIG_PATH, configContent);
    log("Config updated!");
}

main().catch(e => {
    log(`FATAL ERROR: ${e.message}`);
    log(e.stack);
    process.exit(1);
});
