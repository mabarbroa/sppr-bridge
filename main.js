const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class SuperbridgeBot {
    constructor(config) {
        this.config = {
            headless: process.env.HEADLESS === 'true' || config.headless || true,
            fromChain: process.env.FROM_CHAIN || config.fromChain || 'Ethereum',
            toChain: process.env.TO_CHAIN || config.toChain || 'Arbitrum',
            token: process.env.TOKEN || config.token || 'ETH',
            minAmount: parseFloat(process.env.MIN_AMOUNT) || config.minAmount || 0.01,
            maxAmount: parseFloat(process.env.MAX_AMOUNT) || config.maxAmount || 0.02,
            delay: parseInt(process.env.DELAY) || config.delay || 3600000,
            retryDelay: parseInt(process.env.RETRY_DELAY) || config.retryDelay || 300000,
            maxRetries: parseInt(process.env.MAX_RETRIES) || config.maxRetries || 3,
        };
        
        this.browser = null;
        this.page = null;
        this.isRunning = false;
        this.logFile = path.join(__dirname, 'logs', 'superbridge.log');
        
        // Ensure logs directory exists
        if (!fs.existsSync(path.dirname(this.logFile))) {
            fs.mkdirSync(path.dirname(this.logFile), { recursive: true });
        }
        
        this.log(`Bot initialized with config: ${JSON.stringify(this.config, null, 2)}`);
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        console.log(logMessage);
        fs.appendFileSync(this.logFile, logMessage + '\n');
    }

    async init() {
        try {
            this.log('Initializing Superbridge Bot...');
            
            this.browser = await puppeteer.launch({
                headless: this.config.headless || false,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu'
                ]
            });

            this.page = await this.browser.newPage();
            await this.page.setViewport({ width: 1366, height: 768 });
            
            // Set user agent
            await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            
            this.log('Bot initialized successfully');
            return true;
        } catch (error) {
            this.log(`Error initializing bot: ${error.message}`);
            return false;
        }
    }

    async navigateToSuperbridge() {
        try {
            this.log('Navigating to Superbridge...');
            await this.page.goto('https://superbridge.app/', { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            
            // Wait for page to load
            await this.page.waitForTimeout(3000);
            this.log('Successfully loaded Superbridge');
            return true;
        } catch (error) {
            this.log(`Error navigating to Superbridge: ${error.message}`);
            return false;
        }
    }

    async connectWallet() {
        try {
            this.log('Attempting to connect wallet...');
            
            // Look for connect wallet button
            const connectButton = await this.page.$('button[data-testid="connect-wallet"], button:contains("Connect"), button:contains("Connect Wallet")');
            
            if (connectButton) {
                await connectButton.click();
                await this.page.waitForTimeout(2000);
                
                // Select MetaMask or preferred wallet
                const metamaskButton = await this.page.$('button:contains("MetaMask"), [data-testid="metamask"]');
                if (metamaskButton) {
                    await metamaskButton.click();
                    await this.page.waitForTimeout(3000);
                }
                
                this.log('Wallet connection initiated');
                return true;
            }
            
            this.log('Connect wallet button not found');
            return false;
        } catch (error) {
            this.log(`Error connecting wallet: ${error.message}`);
            return false;
        }
    }

    async selectBridgeRoute() {
        try {
            this.log('Selecting bridge route...');
            
            // Select from chain
            const fromChainSelector = await this.page.$('[data-testid="from-chain"], .from-chain-selector');
            if (fromChainSelector) {
                await fromChainSelector.click();
                await this.page.waitForTimeout(1000);
                
                // Select specific chain (e.g., Ethereum)
                const fromChain = await this.page.$(`[data-value="${this.config.fromChain}"], button:contains("${this.config.fromChain}")`);
                if (fromChain) {
                    await fromChain.click();
                }
            }
            
            // Select to chain
            const toChainSelector = await this.page.$('[data-testid="to-chain"], .to-chain-selector');
            if (toChainSelector) {
                await toChainSelector.click();
                await this.page.waitForTimeout(1000);
                
                // Select specific chain (e.g., Arbitrum)
                const toChain = await this.page.$(`[data-value="${this.config.toChain}"], button:contains("${this.config.toChain}")`);
                if (toChain) {
                    await toChain.click();
                }
            }
            
            this.log(`Bridge route selected: ${this.config.fromChain} -> ${this.config.toChain}`);
            return true;
        } catch (error) {
            this.log(`Error selecting bridge route: ${error.message}`);
            return false;
        }
    }

    async selectToken() {
        try {
            this.log('Selecting token...');
            
            // Click token selector
            const tokenSelector = await this.page.$('[data-testid="token-selector"], .token-selector');
            if (tokenSelector) {
                await tokenSelector.click();
                await this.page.waitForTimeout(1000);
                
                // Search for token
                const searchInput = await this.page.$('input[placeholder*="Search"], input[data-testid="token-search"]');
                if (searchInput) {
                    await searchInput.type(this.config.token);
                    await this.page.waitForTimeout(1000);
                }
                
                // Select token from list
                const tokenOption = await this.page.$(`button:contains("${this.config.token}"), [data-token="${this.config.token}"]`);
                if (tokenOption) {
                    await tokenOption.click();
                }
            }
            
            this.log(`Token selected: ${this.config.token}`);
            return true;
        } catch (error) {
            this.log(`Error selecting token: ${error.message}`);
            return false;
        }
    }

    generateRandomAmount() {
        const min = this.config.minAmount || 0.01;
        const max = this.config.maxAmount || 0.02;
        const randomAmount = Math.random() * (max - min) + min;
        
        // Round to 6 decimal places to avoid floating point issues
        return Math.round(randomAmount * 1000000) / 1000000;
    }

    async enterAmount() {
        try {
            const amount = this.generateRandomAmount();
            this.log(`Entering random amount: ${amount} (range: ${this.config.minAmount}-${this.config.maxAmount})`);
            
            // Find amount input
            const amountInput = await this.page.$('input[data-testid="amount"], input[placeholder*="Amount"], input[type="number"]');
            if (amountInput) {
                await amountInput.click({ clickCount: 3 }); // Select all
                await amountInput.type(amount.toString());
                await this.page.waitForTimeout(2000);
            }
            
            this.log(`Amount ${amount} entered successfully`);
            return true;
        } catch (error) {
            this.log(`Error entering amount: ${error.message}`);
            return false;
        }
    }

    async executeBridge() {
        try {
            this.log('Executing bridge transaction...');
            
            // Click bridge/swap button
            const bridgeButton = await this.page.$('button[data-testid="bridge"], button:contains("Bridge"), button:contains("Start Bridge")');
            if (bridgeButton) {
                // Check if button is enabled
                const isDisabled = await bridgeButton.evaluate(el => el.disabled);
                if (isDisabled) {
                    this.log('Bridge button is disabled, checking requirements...');
                    return false;
                }
                
                await bridgeButton.click();
                await this.page.waitForTimeout(3000);
                
                // Confirm transaction if needed
                const confirmButton = await this.page.$('button:contains("Confirm"), button:contains("Submit")');
                if (confirmButton) {
                    await confirmButton.click();
                    await this.page.waitForTimeout(2000);
                }
                
                this.log('Bridge transaction initiated');
                return true;
            }
            
            this.log('Bridge button not found');
            return false;
        } catch (error) {
            this.log(`Error executing bridge: ${error.message}`);
            return false;
        }
    }

    async waitForTransactionConfirmation() {
        try {
            this.log('Waiting for transaction confirmation...');
            
            // Wait for success message or transaction hash
            await this.page.waitForSelector(
                '.success-message, [data-testid="success"], .transaction-success',
                { timeout: 120000 }
            );
            
            // Try to get transaction hash
            const txHash = await this.page.$eval(
                'a[href*="etherscan"], a[href*="arbiscan"], .tx-hash',
                el => el.textContent || el.href
            ).catch(() => null);
            
            this.log(`Transaction confirmed! ${txHash ? 'TX: ' + txHash : ''}`);
            return true;
        } catch (error) {
            this.log(`Error waiting for confirmation: ${error.message}`);
            return false;
        }
    }

    async performBridge() {
        try {
            this.log('='.repeat(50));
            this.log('🌉 Starting new bridge cycle...');
            this.log(`⚙️  Configuration: ${this.config.fromChain} → ${this.config.toChain} (${this.config.token})`);
            this.log(`💰 Random Amount Range: ${this.config.minAmount} - ${this.config.maxAmount}`);
            this.log('='.repeat(50));
            
            const steps = [
                () => this.navigateToSuperbridge(),
                () => this.connectWallet(),
                () => this.selectBridgeRoute(),
                () => this.selectToken(),
                () => this.enterAmount(),
                () => this.executeBridge(),
                () => this.waitForTransactionConfirmation()
            ];
            
            for (let i = 0; i < steps.length; i++) {
                this.log(`📍 Step ${i + 1}/${steps.length}: ${steps[i].name || 'Executing step'}`);
                const success = await steps[i]();
                if (!success) {
                    this.log(`❌ Bridge process failed at step ${i + 1}`);
                    return false;
                }
                await this.page.waitForTimeout(2000);
            }
            
            this.log('✅ Bridge completed successfully!');
            this.log('='.repeat(50));
            return true;
        } catch (error) {
            this.log(`❌ Error in bridge process: ${error.message}`);
            return false;
        }
    }

    async startBot() {
        if (this.isRunning) {
            this.log('Bot is already running');
            return;
        }
        
        this.isRunning = true;
        this.log('Starting Superbridge Auto Bot...');
        
        const initialized = await this.init();
        if (!initialized) {
            this.log('Failed to initialize bot');
            this.isRunning = false;
            return;
        }
        
        while (this.isRunning) {
            try {
                const success = await this.performBridge();
                
                if (success) {
                    this.log(`Bridge completed. Waiting ${this.config.delay / 1000} seconds before next run...`);
                } else {
                    this.log(`Bridge failed. Retrying in ${this.config.retryDelay / 1000} seconds...`);
                    await this.page.waitForTimeout(this.config.retryDelay);
                    continue;
                }
                
                await this.page.waitForTimeout(this.config.delay);
            } catch (error) {
                this.log(`Error in bot loop: ${error.message}`);
                await this.page.waitForTimeout(this.config.retryDelay);
            }
        }
    }

    async stopBot() {
        this.log('Stopping bot...');
        this.isRunning = false;
        
        if (this.browser) {
            await this.browser.close();
        }
        
        this.log('Bot stopped');
    }
}

// Default configuration (can be overridden by environment variables)
const defaultConfig = {
    headless: true,
    fromChain: 'Ethereum',
    toChain: 'Arbitrum', 
    token: 'ETH',
    minAmount: 0.01,
    maxAmount: 0.02,
    delay: 3600000, // 1 hour
    retryDelay: 300000, // 5 minutes
    maxRetries: 3,
};

// Main execution
async function main() {
    console.log('🚀 Starting Superbridge Auto Bot...');
    console.log('📊 Random Amount Range: 0.01 - 0.02 ETH');
    
    const bot = new SuperbridgeBot(defaultConfig);
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\nReceived SIGINT. Shutting down gracefully...');
        await bot.stopBot();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        console.log('\nReceived SIGTERM. Shutting down gracefully...');
        await bot.stopBot();
        process.exit(0);
    });
    
    await bot.startBot();
}

// Export for use as module
module.exports = SuperbridgeBot;

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}
