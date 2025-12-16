import Colors from "@/src/constants/colors";
import { Tabs } from "expo-router";
import { BookOpen, Calendar, House, MessageCircle, UserRound } from 'lucide-react-native';
import { DeviceEventEmitter } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ 
      headerShown: false,
      headerStyle: { backgroundColor: Colors.background},
      headerShadowVisible: false,
      tabBarStyle: {
        backgroundColor: Colors.background,
        borderTopWidth: 0,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: Colors.black,
      }}>

      <Tabs.Screen 
        name="home" 
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (navigation.isFocused()) {
              DeviceEventEmitter.emit("scrollToTopHome");
            }
          },
        })}
        options={{
          title: "Trang chủ",
          tabBarIcon: ({color, size}) => (
          <House size={size} color={color} />
        ) 
        }}/>
      <Tabs.Screen 
        name="knowledge" 
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (navigation.isFocused()) {
              DeviceEventEmitter.emit("scrollToTopKnowledge");
            }
          },
        })}
        options={{
          title: "Tri thức",
          tabBarIcon: ({color, size}) => (
          <BookOpen size={size} color={color} />
        ) 
        }}/>
      
      <Tabs.Screen 
        name="message" 
        options={{
          title: "Tin nhắn",
          tabBarIcon: ({color, size}) => (
          <MessageCircle size={size} color={color} />
        ) 
        }}/>
      
      <Tabs.Screen 
        name="booking" 
        options={{
          title: "Lịch hẹn",
          tabBarIcon: ({color, size}) => (
          <Calendar size={size} color={color} />
        ) 
        }}/>

      <Tabs.Screen 
        name="profile" 
        options={{
          title: "Cá nhân",
          tabBarIcon: ({color, size}) => (
          <UserRound size={size} color={color} />
        ) 
        }}/>

    </Tabs>
  );
}
