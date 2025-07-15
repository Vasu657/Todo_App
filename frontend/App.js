import React, { createContext, useContext, useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Home from './screens/Home';
import Login from './screens/Login';
import Register from './screens/Register';
import Profile from './screens/Profile';
import About from './screens/About';
import Help from './screens/Help';
import Settings from './screens/Settings';
import Calendar from './screens/Calendar';
import Sidebar from './screens/Sidebar';

const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

const AppContext = createContext();

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

const AppProvider = ({ children }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentRoute, setCurrentRoute] = useState('Home');

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const updateCurrentRoute = (routeName) => {
    setCurrentRoute(routeName);
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      setIsAuthenticated(!!token);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (token) => {
    try {
      await AsyncStorage.setItem('token', token);
      setIsAuthenticated(true);
      triggerRefresh();
    } catch (error) {
      console.error('Error storing token:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.clear();
      setIsAuthenticated(false);
      triggerRefresh();
    } catch (error) {
      console.error('Error during logout:', error);
      try {
        await AsyncStorage.removeItem('token');
        setIsAuthenticated(false);
        triggerRefresh();
      } catch (fallbackError) {
        console.error('Fallback logout error:', fallbackError);
      }
    }
  };

  const value = {
    refreshTrigger,
    triggerRefresh,
    isAuthenticated,
    isLoading,
    handleLogin,
    handleLogout,
    checkAuthStatus,
    currentRoute,
    updateCurrentRoute
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={Login} />
    <Stack.Screen name="Register" component={Register} />
  </Stack.Navigator>
);

const MainDrawer = () => {
  const { updateCurrentRoute } = useAppContext();

  const handleNavigationStateChange = (state) => {
    if (state && state.routes && state.index !== undefined) {
      const currentRoute = state.routes[state.index];
      updateCurrentRoute(currentRoute.name);
    }
  };

  return (
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
      initialRouteName="Home"
      screenListeners={{
        state: (e) => handleNavigationStateChange(e.data.state),
      }}
    >
      <Drawer.Screen name="Home" component={Home} />
      <Drawer.Screen name="Calendar" component={Calendar} />
      <Drawer.Screen name="Profile" component={Profile} />
      <Drawer.Screen name="Settings" component={Settings} />
      <Drawer.Screen name="Help" component={Help} />
      <Drawer.Screen name="About" component={About} />
    </Drawer.Navigator>
  );
};

const LoadingScreen = () => (
  <View style={loadingStyles.container}>
    <ActivityIndicator size="large" color="#2563eb" />
    <Text style={loadingStyles.text}>Loading Todo App...</Text>
  </View>
);

const AppContent = () => {
  const { isAuthenticated, isLoading } = useAppContext();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainDrawer /> : <AuthStack />}
    </NavigationContainer>
  );
};

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
});

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}