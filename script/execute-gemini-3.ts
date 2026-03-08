import { executePrompt } from "../server/system-wrapper/api-gateway";

async function runDiagnostic() {
    console.log("🚀 Initializing Gemini 3 Execution...");

    if (!process.env.GEMINI_API_KEY) {
        console.error("❌ Error: GEMINI_API_KEY is not set in environment.");
        process.exit(1);
    }

    try {
        console.log("📡 Sending test prompt to Gemini 3...");
        const result = await executePrompt({
            taskType: "ai_chat",
            systemPrompt: "You are the Gemini 3 Intelligent Assistant for EOMail.co.",
            userPrompt: "Give a 1-sentence confirmation that you are online and tell us today's mission statement for EOMail.",
            temperature: 0.7,
            maxTokens: 100,
            complexity: "complex"
        });

        console.log("\n✅ Gemini 3 Response Received:");
        console.log("-----------------------------------------");
        console.log(result.content);
        console.log("-----------------------------------------");
        console.log(`\n⚙️  Engine: Gemini 3 (Pro)`);
        console.log(`⏱️  Execution Complete.`);
    } catch (error) {
        console.error("❌ Gemini 3 Execution Failed:", error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

runDiagnostic();
