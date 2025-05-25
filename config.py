"""
Konfigurasi networks dan contracts
"""

import os
from dotenv import load_dotenv

load_dotenv()

# Network configurations
NETWORKS = {
    'ethereum': {
        'name': 'Ethereum',
        'rpc': os.getenv('ETHEREUM_RPC', 'https://eth.llamarpc.com'),
        'chain_id': 1
    },
    'optimism': {
        'name': 'OP Mainnet',
        'rpc': os.getenv('OPTIMISM_RPC', 'https://mainnet.optimism.io'),
        'chain_id': 10,
        'bridge_contract': '0x99C9fc46f92E8a1c0deC1b1747d010903E884bE1'
    },
    'base': {
        'name': 'Base',
        'rpc': os.getenv('BASE_RPC', 'https://mainnet.base.org'),
        'chain_id': 8453,
        'bridge_contract': '0x3154Cf16ccdb4C6d922629664174b904d80F2C35'
    },
    'unichain': {
        'name': 'Unichain',
        'rpc': 'https://rpc.unichain.org',
        'chain_id': 1301,
        'bridge_contract': '0x...' # Update dengan contract yang benar
    },
    'inkchain': {
        'name': 'Inkchain',
        'rpc': 'https://rpc-gel.inkonchain.com',
        'chain_id': 57073,
        'bridge_contract': '0x...' # Update dengan contract yang benar
    }
}

# Bridge contract ABI (simplified)
BRIDGE_ABI = [
    {
        "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_gasLimit", "type": "uint64"},
            {"name": "_data", "type": "bytes"}
        ],
        "name": "depositTransaction",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    }
]

# Settings
BRIDGE_AMOUNT = float(os.getenv('BRIDGE_AMOUNT', 0.01))
DELAY_SECONDS = int(os.getenv('DELAY_SECONDS', 30))
PRIVATE_KEY = os.getenv('PRIVATE_KEY')
