import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Home from './screens/Home';
import Login from './screens/Login';
import Register from './screens/Register';
import Sidebar from './screens/Sidebar';

const Drawer = createDrawerNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Drawer.Navigator 
        drawerContent={(props) => <Sidebar {...props} />}
        screenOptions={{
          headerShown: false,
          drawerType: 'slide',
          drawerActiveTintColor: '#2563eb',
          drawerInactiveTintColor: '#6b7280',
          drawerStyle: {
            backgroundColor: '#1f2937',
            width: 280,
          },
          drawerItemStyle: {
            marginVertical: 2,
          },
          drawerLabelStyle: {
            fontSize: 16,
            fontWeight: '500',
          },
          overlayColor: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <Drawer.Screen name="Login" component={Login} />
        <Drawer.Screen name="Register" component={Register} />
        <Drawer.Screen name="Home" component={Home} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}