import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function Sidebar({ navigation, state }) {
  const [activeItem, setActiveItem] = useState(state?.index || 0);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('token');
            navigation.navigate('Login');
          },
        },
      ],
    );
  };

  const menuItems = [
    {
      id: 'home',
      title: 'Home',
      icon: '🏠',
      onPress: () => {
        setActiveItem(0);
        navigation.navigate('Home');
      }
    },
    {
      id: 'calendar',
      title: 'Calendar',
      icon: '📅',
      onPress: () => {
        Alert.alert('Coming Soon', 'Calendar feature will be available soon!');
      }
    },
    {
      id: 'completed',
      title: 'Completed',
      icon: '✅',
      onPress: () => {
        Alert.alert('Coming Soon', 'Completed todos view will be available soon!');
      }
    },
    {
      id: 'profile',
      title: 'Profile',
      icon: '👤',
      onPress: () => {
        Alert.alert('Coming Soon', 'Profile page will be available soon!');
      }
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: '⚙️',
      onPress: () => {
        Alert.alert('Coming Soon', 'Settings page will be available soon!');
      }
    },
    {
      id: 'about',
      title: 'About',
      icon: 'ℹ️',
      onPress: () => {
        Alert.alert('About', 'Todo App v1.0\nBuilt with React Native');
      }
    }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Todo App</Text>
        <Text style={styles.subtitle}>Organize your tasks</Text>
      </View>
      
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.menuItem,
              activeItem === index && styles.activeMenuItem
            ]}
            onPress={() => {
              setActiveItem(index);
              item.onPress();
            }}
          >
            <View style={styles.menuItemContent}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={[
                styles.menuText,
                activeItem === index && styles.activeMenuText
              ]}>
                {item.title}
              </Text>
            </View>
            {activeItem === index && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f2937',
  },
  header: {
    paddingTop: 40,
    paddingHorizontal: 24,
    paddingBottom: 32,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  menuContainer: {
    flex: 1,
    paddingTop: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: 12,
    position: 'relative',
  },
  activeMenuItem: {
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  menuText: {
    fontSize: 16,
    color: '#d1d5db',
    fontWeight: '500',
  },
  activeMenuText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    right: 16,
    width: 6,
    height: 6,
    backgroundColor: '#ffffff',
    borderRadius: 3,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#dc2626',
    borderRadius: 12,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  logoutText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
});