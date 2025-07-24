import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated, Dimensions, Image } from 'react-native';
import { useAppContext } from '../App';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IP_ADDRESS } from '../ip';

const { width } = Dimensions.get('window');

export default function Sidebar({ navigation, state }) {
  const { handleLogout, currentRoute, refreshTrigger } = useAppContext();
  const [activeItem, setActiveItem] = useState(0);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${IP_ADDRESS}/api/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error fetching user profile in sidebar:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchUserProfile();
    }
  }, [refreshTrigger]);

  useEffect(() => {
    const routeToIndex = {
      'Home': 0,
      'Calendar': 1,
      'Profile': 2,
      'Settings': 3,
      'Help': 4,
      'About': 5,
    };
    
    const newActiveIndex = routeToIndex[currentRoute] !== undefined ? routeToIndex[currentRoute] : 0;
    setActiveItem(newActiveIndex);
  }, [currentRoute]);

  useEffect(() => {
    if (state && state.routes && state.index !== undefined) {
      const currentRouteFromState = state.routes[state.index];
      const routeName = currentRouteFromState.name;
      
      const routeToIndex = {
        'Home': 0,
        'Calendar': 1,
        'Profile': 2,
        'Settings': 3,
        'Help': 4,
        'About': 5,
      };
      
      const newActiveIndex = routeToIndex[routeName] !== undefined ? routeToIndex[routeName] : 0;
      setActiveItem(newActiveIndex);
    }
  }, [state]);

  const handleLogoutPress = async () => {
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
            await handleLogout();
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
        navigation.navigate('Home');
      }
    },
    {
      id: 'calendar',
      title: 'Calendar',
      icon: '📅',
      onPress: () => {
        navigation.navigate('Calendar');
      }
    },

    {
      id: 'profile',
      title: 'Profile',
      icon: '👤',
      onPress: () => {
        navigation.navigate('Profile');
      }
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: '⚙️',
      onPress: () => {
        navigation.navigate('Settings');
      }
    },
    {
      id: 'help',
      title: 'Help & Support',
      icon: '❓',
      onPress: () => {
        navigation.navigate('Help');
      }
    },
    {
      id: 'about',
      title: 'About',
      icon: 'ℹ️',
      onPress: () => {
        navigation.navigate('About');
      }
    }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.appInfo}>
          <Text style={styles.appName}>Todo App</Text>
          <Text style={styles.appVersion}>v1.0</Text>
        </View>
        
        <View style={styles.userSection}>
          <TouchableOpacity 
            style={styles.userProfileContainer}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={styles.profileImageContainer}>
              {userProfile?.profilePhoto ? (
                <Image
                  source={{ uri: userProfile.profilePhoto }}
                  style={styles.profileImage}
                  onError={() => {}}
                />
              ) : (
                <View style={styles.defaultProfileImage}>
                  <Text style={styles.defaultProfileText}>
                    {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </View>
              )}
              <View style={styles.onlineIndicator} />
            </View>
            
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {loading ? 'Loading...' : (userProfile?.name || 'User')}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>
                {loading ? 'Please wait...' : (userProfile?.email || 'user@example.com')}
              </Text>
              {userProfile?.id && (
                <Text style={styles.userId}>
                  ID: #{userProfile.id}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.menuItem,
              activeItem === index && styles.activeMenuItem
            ]}
            onPress={item.onPress}
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
        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>Stay organized, stay productive</Text>
        </View>
        
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogoutPress}>
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
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  appName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  appVersion: {
    fontSize: 12,
    color: '#9ca3af',
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontWeight: '500',
  },
  userSection: {
    marginTop: 8,
  },
  userProfileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  defaultProfileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  defaultProfileText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    backgroundColor: '#10b981',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#111827',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '400',
  },
  userId: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '400',
    marginTop: 2,
  },
  menuContainer: {
    flex: 1,
    paddingTop: 16,
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
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  footerInfo: {
    marginBottom: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
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