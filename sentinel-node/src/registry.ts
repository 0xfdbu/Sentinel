/**
 * Contract Registry - In-memory storage for registered contracts
 */

import { RegisteredContract } from './types';

export class ContractRegistry {
  private contracts: Map<string, RegisteredContract> = new Map();

  add(contract: RegisteredContract): void {
    this.contracts.set(contract.address, contract);
  }

  get(address: string): RegisteredContract | undefined {
    return this.contracts.get(address.toLowerCase());
  }

  has(address: string): boolean {
    return this.contracts.has(address.toLowerCase());
  }

  getAll(): RegisteredContract[] {
    return Array.from(this.contracts.values());
  }

  remove(address: string): boolean {
    return this.contracts.delete(address.toLowerCase());
  }

  updateLastScanned(address: string): void {
    const contract = this.contracts.get(address.toLowerCase());
    if (contract) {
      contract.lastScanned = Date.now();
    }
  }

  clear(): void {
    this.contracts.clear();
  }
}
