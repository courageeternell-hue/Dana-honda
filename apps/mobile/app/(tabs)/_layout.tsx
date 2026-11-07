import { Tabs, Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { AppIcon } from "@/components/AppIcon";
import { LiquidPressable } from "@/components/LiquidPressable";

const primary = "#E60012";

export default function TabLayout() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F4F5F7" }}>
        <ActivityIndicator color={primary} size="large" />
      </View>
    );
  }

  if (!session || !profile) return <Redirect href="/login" />;

  const tabButton = (props: any) => (
    <LiquidPressable
      onPress={props.onPress}
      onLongPress={props.onLongPress}
      accessibilityRole="button"
      accessibilityState={props.accessibilityState}
      accessibilityLabel={props.accessibilityLabel}
      testID={props.testID}
      style={props.style}
    >
      {props.children}
    </LiquidPressable>
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: primary,
        tabBarInactiveTintColor: "#9292A3",
        tabBarStyle: {
          height: 90,
          paddingTop: 6,
          paddingBottom: 12,
          borderTopWidth: 0,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          backgroundColor: "#FFFFFF",
          elevation: 12,
          shadowColor: "#172033",
          shadowOpacity: 0.08,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: -4 },
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "800" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home Page",
          tabBarIcon: ({ focused }) => <AppIcon name="home" size={21} active={focused} />,
          tabBarButton: tabButton,
        }}
      />
      <Tabs.Screen
        name="prospek"
        options={{
          title: "Prospek",
          tabBarIcon: ({ focused }) => <AppIcon name="people" size={21} active={focused} />,
          tabBarButton: tabButton,
        }}
      />
      <Tabs.Screen
        name="penjualan"
        options={{
          title: "Penjualan",
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: 29,
                marginTop: -27,
                backgroundColor: focused ? primary : "#FFF0F1",
                borderWidth: 4,
                borderColor: "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
                elevation: 8,
                shadowColor: "#172033",
                shadowOpacity: 0.16,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
              }}
            >
              <Ionicons name="trending-up" size={26} color={focused ? "#FFFFFF" : primary} />
            </View>
          ),
          tabBarButton: tabButton,
        }}
      />
      <Tabs.Screen
        name="spk"
        options={{
          title: "SPK",
          tabBarIcon: ({ focused }) => <AppIcon name="document-text" size={21} active={focused} />,
          tabBarButton: tabButton,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: "Profil",
          tabBarIcon: ({ focused }) => <AppIcon name="person" size={21} active={focused} />,
          tabBarButton: tabButton,
        }}
      />
    </Tabs>
  );
}
