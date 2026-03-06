import { run } from "hardhat";

const CONTRACTS = {
  PolicyEngine: {
    address: "0x62CC29A58404631B7db65CE14E366F63D3B96B16",
    args: []
  },
  AddressBlacklistPolicy: {
    address: "0x12984048eA07BE79850B47154a9fE993b74552F4",
    args: []
  },
  VolumePolicy: {
    address: "0x294D88d76D1c8e4d6b127dC87f1838766310E9d0",
    args: [
      "1000000000000000", // 0.001 ETH min
      "100000000000000000000", // 100 ETH max
      "1000000000000000000000" // 1000 ETH daily
    ]
  },
  FunctionSignaturePolicy: {
    address: "0xfE9dF59f292098962E7C6FA7F2630FaE44E94798",
    args: []
  },
  PolicyConfigurator: {
    address: "0xC9380c3af2C809c2d669ad55cDc9b118264224bF",
    args: ["0x774B96F8d892A1e4482B52b3d255Fa269136A0E9"] // Registry address
  },
  SentinelForwarder: {
    address: "0xdbaB51E9216129487bdfCc4FBf76BA1762242891",
    args: ["0x62CC29A58404631B7db65CE14E366F63D3B96B16"] // PolicyEngine
  }
};

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║              VERIFYING CONTRACTS ON ETHERSCAN              ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();

  for (const [name, { address, args }] of Object.entries(CONTRACTS)) {
    console.log(`Verifying ${name} at ${address}...`);
    try {
      await run("verify:verify", {
        address,
        constructorArguments: args
      });
      console.log(`  ✓ ${name} verified`);
    } catch (e: any) {
      if (e.message.includes("Already Verified")) {
        console.log(`  ✓ ${name} already verified`);
      } else {
        console.log(`  ✗ ${name} failed:`, e.message.slice(0, 100));
      }
    }
    console.log();
  }

  console.log("Verification complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
