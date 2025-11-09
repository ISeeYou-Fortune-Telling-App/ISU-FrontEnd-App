import messaging from '@react-native-firebase/messaging';
import { Redirect } from "expo-router";
import 'expo-router/entry';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('📩 Message handled in the background!', remoteMessage);
});

export default function Index() {
  return <Redirect href="/auth" />;
}
