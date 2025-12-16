import AIChatScreen from "@/src/screens/AIChatScreen";
import { useLocalSearchParams } from "expo-router";

export default function AIChatRoute() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  return <AIChatScreen sessionId={sessionId} />;
}
