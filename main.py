#!/usr/bin/env python3
"""
Superbridge Auto Bridge - Script utama
"""

import asyncio
import sys
from bridge import SimpleBridge
from config import BRIDGE_AMOUNT, DELAY_SECONDS
from colorama import init, Fore, Style

# Initialize colorama
init(autoreset=True)

def print_header():
    """Print header aplikasi"""
    print(f"{Fore.CYAN}")
    print("=" * 60)
    print("🌉 SUPERBRIDGE AUTO BRIDGE")
    print("   Bridge ETH ke Multiple L2 Networks")
    print("=" * 60)
    print(f"{Style.RESET_ALL}")

def print_menu():
    """Print menu pilihan"""
    print(f"\n{Fore.YELLOW}📋 PILIHAN:{Style.RESET_ALL}")
    print("1. Bridge ke semua networks (auto)")
    print("2. Bridge ke network tertentu")
    print("3. Cek balance semua networks")
    print("4. Keluar")

async def main():
    """Main function"""
    
    print_header()
    
    try:
        # Initialize bridge
        bridge = SimpleBridge()
        
        while True:
            print_menu()
            choice = input(f"\n{Fore.GREEN}Pilih menu (1-4): {Style.RESET_ALL}")
            
            if choice == "1":
                # Auto bridge ke semua networks
                print(f"\n🚀 MODE: Auto Bridge ke Semua Networks")
                
                # Input amount
                amount_input = input(f"Amount ETH per network (default: {BRIDGE_AMOUNT}): ").strip()
                amount = float(amount_input) if amount_input else BRIDGE_AMOUNT
                
                # Input delay
                delay_input = input(f"Delay antar bridge dalam detik (default: {DELAY_SECONDS}): ").strip()
                delay = int(delay_input) if delay_input else DELAY_SECONDS
                
                # Konfirmasi
                print(f"\n📋 KONFIRMASI:")
                print(f"   Amount per network: {amount} ETH")
                print(f"   Delay: {delay} detik")
                
                confirm = input(f"\nLanjutkan? (y/n): ").strip().lower()
                if confirm == 'y':
                    await bridge.bridge_all_networks(amount, delay)
                else:
                    print("❌ Bridge dibatalkan")
            
            elif choice == "2":
                # Bridge ke network tertentu
                print(f"\n🎯 MODE: Bridge ke Network Tertentu")
                print("Networks yang tersedia:")
                print("- optimism")
                print("- base") 
                print("- unichain")
                print("- inkchain")
                
                network = input("Pilih network: ").strip().lower()
                amount_input = input(f"Amount ETH (default: {BRIDGE_AMOUNT}): ").strip()
                amount = float(amount_input) if amount_input else BRIDGE_AMOUNT
                
                await bridge.bridge_to_network(network, amount)
            
            elif choice == "3":
                # Cek balance
                bridge.show_balances()
            
            elif choice == "4":
                # Keluar
                print(f"{Fore.GREEN}👋 Terima kasih telah menggunakan Superbridge Auto Bridge!{Style.RESET_ALL}")
                break
            
            else:
                print(f"{Fore.RED}❌ Pilihan tidak valid!{Style.RESET_ALL}")
            
            # Pause sebelum kembali ke menu
            input(f"\n{Fore.CYAN}Tekan Enter untuk kembali ke menu...{Style.RESET_ALL}")
    
    except KeyboardInterrupt:
        print(f"\n{Fore.YELLOW}⚠️  Program dihentikan oleh user{Style.RESET_ALL}")
    except Exception as e:
        print(f"\n{Fore.RED}❌ Error: {str(e)}{Style.RESET_ALL}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
