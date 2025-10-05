import Colors from "@/src/constants/colors";
import { Tabs } from "expo-router";
import { BookOpen, Calendar, House, MessageCircle, UserRound } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ 
      headerShown: false,
      headerStyle: { backgroundColor: "#f5f5f5"},
      headerShadowVisible: false,
      tabBarStyle: {
        backgroundColor: "#f5f5f5",
        borderTopWidth: 0,
        elevation: 0,
        shadowOpacity: 0
      },
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: Colors.black,
      }}>

      <Tabs.Screen 
        name="home" 
        options={{
          title: "Trang chủ",
          tabBarIcon: ({color, size}) => (
          <House size={size} color={color} />
        ) 
        }}/>
      <Tabs.Screen 
        name="knowledge" 
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
