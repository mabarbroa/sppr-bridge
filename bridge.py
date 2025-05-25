"""
Main bridge functionality
"""

import asyncio
import time
from web3 import Web3
from eth_account import Account
from colorama import init, Fore, Style
from config import NETWORKS, BRIDGE_ABI, PRIVATE_KEY

# Initialize colorama
init(autoreset=True)

class SimpleBridge:
    def __init__(self, private_key=None):
        """Initialize bridge dengan private key"""
        
        self.private_key = private_key or PRIVATE_KEY
        if not self.private_key:
            raise ValueError("❌ Private key tidak ditemukan! Set PRIVATE_KEY di .env")
        
        # Setup account
        self.account = Account.from_key(self.private_key)
        self.address = self.account.address
        
        # Setup Web3 connections
        self.w3_connections = {}
        for network, config in NETWORKS.items():
            try:
                self.w3_connections[network] = Web3(Web3.HTTPProvider(config['rpc']))
                print(f"✅ Terhubung ke {config['name']}")
            except Exception as e:
                print(f"❌ Gagal terhubung ke {config['name']}: {str(e)}")
        
        print(f"💰 Wallet: {self.address}")
    
    def get_balance(self, network):
        """Get ETH balance"""
        try:
            w3 = self.w3_connections[network]
            balance_wei = w3.eth.get_balance(self.address)
            return w3.from_wei(balance_wei, 'ether')
        except:
            return 0.0
    
    def show_balances(self):
        """Tampilkan balance semua network"""
        print(f"\n{Fore.CYAN}💰 BALANCE WALLET:{Style.RESET_ALL}")
        print("-" * 40)
        
        for network, config in NETWORKS.items():
            balance = self.get_balance(network)
            print(f"{config['name']:<15}: {balance:.6f} ETH")
        
        print("-" * 40)
    
    async def bridge_to_network(self, target_network, amount):
        """Bridge ETH ke network tertentu"""
        
        if target_network not in NETWORKS or 'bridge_contract' not in NETWORKS[target_network]:
            print(f"❌ Network {target_network} tidak didukung")
            return None
        
        try:
            # Gunakan Ethereum sebagai source
            w3 = self.w3_connections['ethereum']
            target_config = NETWORKS[target_network]
            
            print(f"\n🌉 Bridge {amount} ETH ke {target_config['name']}...")
            
            # Cek balance
            balance = self.get_balance('ethereum')
            if balance < amount:
                print(f"❌ Balance tidak cukup! Tersedia: {balance:.6f} ETH")
                return None
            
            # Setup contract
            contract_address = target_config['bridge_contract']
            contract = w3.eth.contract(address=contract_address, abi=BRIDGE_ABI)
            
            # Build transaction
            amount_wei = w3.to_wei(amount, 'ether')
            
            transaction = contract.functions.depositTransaction(
                self.address,  # _to
                200000,        # _gasLimit
                b''           # _data
            ).build_transaction({
                'from': self.address,
                'value': amount_wei,
                'gas': 300000,
                'gasPrice': w3.eth.gas_price,
                'nonce': w3.eth.get_transaction_count(self.address)
            })
            
            # Sign dan send
            signed_txn = w3.eth.account.sign_transaction(transaction, self.private_key)
            tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            print(f"✅ Bridge berhasil! TX: {tx_hash.hex()}")
            print(f"🔗 https://etherscan.io/tx/{tx_hash.hex()}")
            
            return tx_hash.hex()
            
        except Exception as e:
            print(f"❌ Error bridge ke {target_network}: {str(e)}")
            return None
    
    async def bridge_all_networks(self, amount, delay=30):
        """Bridge ke semua network yang didukung"""
        
        # Network yang didukung untuk bridge
        target_networks = ['optimism', 'base', 'unichain', 'inkchain']
        available_networks = [net for net in target_networks if net in NETWORKS and 'bridge_contract' in NETWORKS[net]]
        
        print(f"\n🚀 MULAI AUTO BRIDGE")
        print(f"💰 Amount per network: {amount} ETH")
        print(f"⏱️  Delay antar bridge: {delay} detik")
        print(f"🎯 Target networks: {len(available_networks)}")
        
        # Cek total balance yang dibutuhkan
        total_needed = amount * len(available_networks)
        current_balance = self.get_balance('ethereum')
        
        if current_balance < total_needed:
            print(f"❌ Balance tidak cukup!")
            print(f"   Dibutuhkan: {total_needed:.6f} ETH")
            print(f"   Tersedia: {current_balance:.6f} ETH")
            return
        
        # Tampilkan balance awal
        self.show_balances()
        
        # Mulai bridge
        results = {}
        for i, network in enumerate(available_networks):
            print(f"\n📍 [{i+1}/{len(available_networks)}] Bridge ke {NETWORKS[network]['name']}")
            
            result = await self.bridge_to_network(network, amount)
            results[network] = result
            
            # Delay kecuali bridge terakhir
            if i < len(available_networks) - 1:
                print(f"⏳ Menunggu {delay} detik...")
                await asyncio.sleep(delay)
        
        # Tampilkan hasil
        self.show_bridge_results(results)
        
        # Tampilkan balance akhir
        print(f"\n{Fore.CYAN}💰 BALANCE SETELAH BRIDGE:{Style.RESET_ALL}")
        self.show_balances()
    
    def show_bridge_results(self, results):
        """Tampilkan hasil bridge"""
        print(f"\n{Fore.YELLOW}📊 HASIL BRIDGE:{Style.RESET_ALL}")
        print("=" * 50)
        
        success_count = 0
        for network, tx_hash in results.items():
            network_name = NETWORKS[network]['name']
            if tx_hash:
                print(f"✅ {network_name:<12}: Berhasil")
                success_count += 1
            else:
                print(f"❌ {network_name:<12}: Gagal")
        
        print("=" * 50)
        print(f"📈 Total: {len(results)} | Berhasil: {success_count} | Gagal: {len(results) - success_count}")
        
        if success_count == len(results):
            print(f"{Fore.GREEN}🎉 Semua bridge berhasil!{Style.RESET_ALL}")
        elif success_count > 0:
            print(f"{Fore.YELLOW}⚠️  Beberapa bridge berhasil{Style.RESET_ALL}")
        else:
            print(f"{Fore.RED}❌ Semua bridge gagal{Style.RESET_ALL}")
