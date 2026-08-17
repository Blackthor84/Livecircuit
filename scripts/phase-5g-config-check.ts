/** Quick payout config + secondary eligibility check for Phase 5G report */
import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const raw = execSync("npx supabase projects api-keys --project-ref lblhjnzphvthnxulugep", {
    encoding: "utf8",
  });
  const key = JSON.parse(raw).keys.find((k: { name: string }) => k.name === "service_role").api_key;
  const admin = createClient("https://lblhjnzphvthnxulugep.supabase.co", key);
  const { data: config } = await admin.from("monetization_payout_config").select("*").eq("id", "default").single();
  console.log(JSON.stringify(config, null, 2));
}
main();
