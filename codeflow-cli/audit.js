import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

function logPass(msg) { console.log(`${GREEN}[PASS]${RESET} ${msg}`); }
function logFail(msg) { console.log(`${RED}[FAIL]${RESET} ${msg}`); }
function logInfo(msg) { console.log(`${BLUE}[INFO]${RESET} ${msg}`); }

async function runAudit() {
    logInfo("🚀 Starting Hook Reality Check...");

    const projectRoot = process.cwd();

    // --- TEST 1: Code Grep for Missing Providers ---
    logInfo("Checking source code for OpenAI and Claude implementation...");

    // We look for the actual function calls or string literals in the source
    try {
        const grepResult = execSync('grep -r "openai" . && grep -r "claude" .', { encoding: 'utf-8' });
        if (grepResult.length > 0) {
            logPass("Found references to 'openai' and 'claude' in source code.");
        } else {
            logFail("Source code scan returned empty. Providers might still be missing.");
        }
    } catch (e) {
        logFail("Grep failed. OpenAI/Claude implementation likely missing.");
    }

    // --- TEST 2: Compliance Keywords Check ---
    logInfo("Checking for Compliance (GDPR/HIPAA) logic...");
    try {
        const complianceResult = execSync('grep -r "GDPR" . || grep -r "HIPAA" .', { encoding: 'utf-8' });
        logPass("Found Compliance keywords in code.");
    } catch (e) {
        console.log(`${RED}[WARNING]${RESET} Still no 'GDPR' or 'HIPAA' keywords found. Compliance claims may be overstated.`);
    }

    // --- TEST 3: Configuration Cascade ---
    logInfo("Testing Configuration Cascade (Global vs Project)...");

    // 1. Setup Mock Configs
    const globalDir = path.join(os.homedir(), '.codeflow-hook');
    if (!fs.existsSync(globalDir)) fs.mkdirSync(globalDir, { recursive: true });

    const globalConfigPath = path.join(globalDir, 'config.json');
    const localConfigPath = path.join(projectRoot, '.codeflowrc.json');

    // Save originals if they exist
    const backupGlobal = fs.existsSync(globalConfigPath) ? fs.readFileSync(globalConfigPath) : null;
    const backupLocal = fs.existsSync(localConfigPath) ? fs.readFileSync(localConfigPath) : null;

    try {
        // Write Test Configs
        fs.writeFileSync(globalConfigPath, JSON.stringify({ provider: "gemini", test_val: "GLOBAL" }));
        fs.writeFileSync(localConfigPath, JSON.stringify({ provider: "openai", test_val: "PROJECT" }));

        // We assume there is a file that exports loadConfig.
        // We will try to import it dynamically.
        // NOTE: Adjust the path below to point to your actual config.js location
        const configModulePath = '../cli-tool/src/utils/config.js'; // Fixed path to actual config.js location

        if (fs.existsSync(configModulePath)) {
            const { loadConfig } = await import(configModulePath);
            const config = await loadConfig();

            if (config.provider === "openai" && config.test_val === "PROJECT") {
                logPass("Project config successfully overrode Global config.");
            } else if (config.provider === "gemini") {
                logFail("Config loaded Global value. Cascade logic is NOT working.");
            } else {
                logFail(`Config loaded unexpected values: ${JSON.stringify(config)}`);
            }
        } else {
            logFail(`Could not find config.js at ${configModulePath}. Cannot test cascade logic programmatically.`);
        }

    } catch (e) {
        logFail(`Config Test Error: ${e.message}`);
    } finally {
        // Cleanup: Restore files
        if (backupGlobal) fs.writeFileSync(globalConfigPath, backupGlobal);
        if (backupLocal) fs.writeFileSync(localConfigPath, backupLocal);
        else if (fs.existsSync(localConfigPath)) fs.unlinkSync(localConfigPath);
    }
}

runAudit();
