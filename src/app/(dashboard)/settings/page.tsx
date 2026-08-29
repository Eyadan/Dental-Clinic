import { getSettingsAction } from "./actions";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const result = await getSettingsAction();

  if (!result.success || !result.data) {
    throw new Error(result.error ?? "Failed to fetch settings");
  }

  return <SettingsClient settings={result.data} />;
}
