import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen 
        name="home" 
        options={{
          title: "Trang chủ"
        }}/>
      <Tabs.Screen 
        name="knowledge" 
        options={{
          title: "Tri thức"
        }}/>
      
      <Tabs.Screen 
        name="message" 
        options={{
          title: "Tin nhắn"
        }}/>
      
      <Tabs.Screen 
        name="booking" 
        options={{
          title: "Lịch hẹn"
        }}/>

      <Tabs.Screen 
        name="profile" 
        options={{
          title: "Cá nhân"
        }}/>

    </Tabs>
  );
}
