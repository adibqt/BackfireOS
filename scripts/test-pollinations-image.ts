import { config } from "dotenv";
config({ path: ".env.local" });

import { generatePollinationsImage, isPollinationsConfigured } from "../lib/pollinations";

async function main() {
  console.log("Pollinations configured:", isPollinationsConfigured());
  if (!isPollinationsConfigured()) {
    console.error("Set POLLINATIONS_API_KEY in .env.local");
    process.exit(1);
  }

  const url = await generatePollinationsImage({
    caption:
      "Salary ashle mone hoy ami crorepati, cash-out charge dekhe mone hoy fukir — bKash agent shop queue",
    visualPrompt:
      "Young Bangladeshi office worker in formal shirt looking shocked at smartphone screen showing a fee, long queue at a small roadside mobile banking agent shop in Dhaka",
  });
  console.log("Result type:", url.startsWith("data:") ? "data URL" : "remote URL");
  console.log("Length:", url.length);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
