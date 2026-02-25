import { Tabs } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { colors } from "@/components/theme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      gcTime: 60_000,
      retry: 1,
    },
  },
});

export default function RedirectLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          },
          tabBarActiveTintColor: colors.foreground,
          tabBarInactiveTintColor: colors.mutedForeground,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Noten",
            tabBarIcon: ({ color }) => <FontAwesome size={20} name="book" color={color} />,
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: "NFC",
            tabBarIcon: ({ color }) => <FontAwesome size={20} name="rss" color={color} />,
          }}
        />
        <Tabs.Screen
          name="tree"
          options={{
            title: "Baum",
            tabBarIcon: ({ color }) => <FontAwesome size={20} name="sitemap" color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Einstellungen",
            tabBarIcon: ({ color }) => <FontAwesome size={20} name="cog" color={color} />,
          }}
        />
        <Tabs.Screen
          name="note/[id]"
          options={{
            href: null,
            title: "Notenblatt",
          }}
        />
      </Tabs>
    </QueryClientProvider>
  );
}
