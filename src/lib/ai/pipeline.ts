import { spawn } from "child_process";
import path from "path";

const STEPS = [
  {
    name: "Hunt",
    script: "0-hunt.ts",
    description: "Hunt for Steam links and insert into database",
  },
  {
    name: "Enhance",
    script: "1-enhance.ts",
    description: "Enhance games with Steam API data",
  },
  {
    name: "Process",
    script: "2-process.ts",
    description: "Generate embeddings and semantic descriptions",
  },
];

const runStep = (step: (typeof STEPS)[0], stepIndex: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, step.script);

    console.log(`\n🚀 Step ${stepIndex + 1}/${STEPS.length}: ${step.name}`);
    console.log(`📝 ${step.description}`);
    console.log(`⏳ Running: ${step.script}\n`);

    const child = spawn("pnpx", ["tsx", scriptPath], {
      stdio: "inherit",
      cwd: process.cwd(),
    });

    child.on("close", (code) => {
      if (code === 0) {
        console.log(`✅ ${step.name} completed successfully\n`);
        resolve();
      } else {
        console.error(`❌ ${step.name} failed with exit code ${code}\n`);
        reject(new Error(`Step ${step.name} failed`));
      }
    });

    child.on("error", (error) => {
      console.error(`❌ Error running ${step.name}:`, error);
      reject(error);
    });
  });
};

const runPipeline = async () => {
  console.log("🎯 Starting Indiefindr Data Pipeline");
  console.log("=".repeat(50));

  const startTime = Date.now();

  try {
    for (let i = 0; i < STEPS.length; i++) {
      const step = STEPS[i];
      await runStep(step, i);
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log("🎉 Pipeline completed successfully!");
    console.log(`⏱️  Total time: ${duration} seconds`);
    console.log("\n📊 Database status:");
    console.log("   • Games hunted, enhanced, and processed");
    console.log("   • Ready for new search system!");
  } catch (error) {
    console.error("\n💥 Pipeline failed:", error);
    process.exit(1);
  }
};

// Only run if this script is executed directly
if (require.main === module) {
  runPipeline().catch(console.error);
}
