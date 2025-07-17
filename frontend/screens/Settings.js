import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  TextInput,
  Alert,
  BackHandler,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { useAppContext } from '../App';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IP_ADDRESS } from '../ip';

const { width } = Dimensions.get('window');

export default function Settings({ navigation }) {
  const { updateCurrentRoute, refreshTrigger, triggerRefresh, handleLogout } = useAppContext();
  const [profileData, setProfileData] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const [animatedValues, setAnimatedValues] = useState({});
  
  // Settings state
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [language, setLanguage] = useState('English');
  const [fontSize, setFontSize] = useState('Medium');
  
  // Animation setup
  useEffect(() => {
    const initialAnimatedValues = {};
    settingSections.forEach(section => {
      initialAnimatedValues[section.id] = new Animated.Value(0);
    });
    setAnimatedValues(initialAnimatedValues);
  }, []);
  
  // Fetch profile data on mount
  useEffect(() => {
    fetchProfile();
    updateCurrentRoute('Settings'); // Update current route when Settings mounts
  }, []);
  
  // Refresh profile when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchProfile();
    }
  }, [refreshTrigger]);
  
  // Set current route when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      updateCurrentRoute('Settings');
    });
    return unsubscribe;
  }, [navigation, updateCurrentRoute]);

  // Handle back button
  useEffect(() => {
    const backAction = () => {
      navigation.navigate('Home');
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [navigation]);

  const fetchProfile = async () => {
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
        setProfileData(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const toggleSection = (sectionId) => {
    // If tapping the same section, collapse it
    if (expandedSection === sectionId) {
      setExpandedSection(null);
      Animated.timing(animatedValues[sectionId], {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      // If another section is expanded, collapse it first
      if (expandedSection) {
        Animated.timing(animatedValues[expandedSection], {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }
      
      // Expand the new section
      setExpandedSection(sectionId);
      Animated.timing(animatedValues[sectionId], {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  const openMenu = () => {
    navigation.openDrawer();
  };

  const saveSettings = async () => {
    try {
      // In a real app, you would save these settings to AsyncStorage or backend
      await AsyncStorage.setItem('settings', JSON.stringify({
        darkMode,
        notifications,
        emailNotifications,
        soundEnabled,
        autoSync,
        language,
        fontSize,
      }));
      
      Alert.alert('Success', 'Settings saved successfully!');
      triggerRefresh(); // Refresh app to apply settings
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  const resetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          onPress: () => {
            setDarkMode(false);
            setNotifications(true);
            setEmailNotifications(true);
            setSoundEnabled(true);
            setAutoSync(true);
            setLanguage('English');
            setFontSize('Medium');
            Alert.alert('Success', 'Settings reset to default!');
          },
          style: 'destructive',
        },
      ]
    );
  };

  const deleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      '⚠️ WARNING: This action cannot be undone!\n\n• All your data will be permanently deleted\n• Your todos, settings, and profile will be lost\n• This data is end-to-end encrypted and cannot be recovered\n• You will need to create a new account to use the app again\n\nAre you absolutely sure you want to delete your account?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Forever',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) {
                Alert.alert('Error', 'Authentication required');
                return;
              }

              const response = await fetch(`${IP_ADDRESS}/api/profile/delete`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              if (response.ok) {
                Alert.alert(
                  'Account Deleted',
                  'Your account has been permanently deleted. Thank you for using our app.',
                  [
                    {
                      text: 'OK',
                      onPress: () => handleLogout(),
                    },
                  ]
                );
              } else {
                const errorData = await response.json();
                Alert.alert('Error', errorData.message || 'Failed to delete account');
              }
            } catch (error) {
              console.error('Delete account error:', error);
              Alert.alert('Error', 'Network error. Please try again.');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const settingSections = [
    {
      id: 'account',
      title: 'Account Settings',
      icon: '👤',
      content: (
        <View style={styles.sectionContent}>
          <TouchableOpacity 
            style={styles.profilePreview}
            onPress={() => navigation.navigate('Profile')}
          >
            {profileData && profileData.profilePhoto ? (
              <Image 
                source={{ uri: profileData.profilePhoto }} 
                style={styles.previewPhoto} 
              />
            ) : (
              <View style={styles.defaultPreviewPhoto}>
                <Text style={styles.defaultPhotoText}>
                  {profileData && profileData.name ? profileData.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
            <View style={styles.previewInfo}>
              <Text style={styles.previewName}>{profileData?.name || 'User'}</Text>
              <Text style={styles.previewEmail}>{profileData?.email || 'user@example.com'}</Text>
            </View>
            <Text style={styles.viewProfileText}>View Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.actionButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.dangerButton]}
            onPress={() => Alert.alert(
              'Logout',
              'Are you sure you want to logout?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Logout',
                  onPress: handleLogout,
                  style: 'destructive',
                },
              ]
            )}
          >
            <Text style={styles.dangerButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      ),
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: '🔔',
      content: (
        <View style={styles.sectionContent}>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
              thumbColor={notifications ? '#2563eb' : '#f3f4f6'}
            />
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Email Notifications</Text>
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
              thumbColor={emailNotifications ? '#2563eb' : '#f3f4f6'}
            />
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Sound Effects</Text>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
              thumbColor={soundEnabled ? '#2563eb' : '#f3f4f6'}
            />
          </View>
        </View>
      ),
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      icon: '🔒',
      content: (
        <View style={styles.sectionContent}>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Auto Sync</Text>
            <Switch
              value={autoSync}
              onValueChange={setAutoSync}
              trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
              thumbColor={autoSync ? '#2563eb' : '#f3f4f6'}
            />
          </View>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => Alert.alert('Coming Soon', 'This feature will be available in the next update.')}
          >
            <Text style={styles.actionButtonText}>Change Password</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => Alert.alert('Privacy Policy', 'Our privacy policy details how we collect, use, and protect your personal information.')}
          >
            <Text style={styles.actionButtonText}>View Privacy Policy</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.dangerButton]}
            onPress={deleteAccount}
          >
            <Text style={styles.dangerButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      ),
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={openMenu} style={styles.menuButton}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          {profileData && profileData.profilePhoto ? (
            <Image 
              source={{ uri: profileData.profilePhoto }} 
              style={styles.profilePhoto} 
              onError={() => console.log('Error loading profile image')}
            />
          ) : (
            <View style={styles.defaultPhoto}>
              <Text style={styles.defaultPhotoText}>
                {profileData && profileData.name ? profileData.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroIconText}>⚙️</Text>
          </View>
          <Text style={styles.heroTitle}>App Settings</Text>
          <Text style={styles.heroSubtitle}>
            Customize your app experience
          </Text>
        </View>

        {/* Settings Sections */}
        <View style={styles.settingsContainer}>
          {settingSections.map((section) => (
            <View key={section.id} style={styles.settingSection}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection(section.id)}
              >
                <View style={styles.sectionTitleContainer}>
                  <Text style={styles.sectionIcon}>{section.icon}</Text>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                </View>
                <Text style={styles.sectionToggleIcon}>
                  {expandedSection === section.id ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>
              <Animated.View
                style={[
                  styles.sectionContentContainer,
                  {
                    maxHeight: animatedValues[section.id]?.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1000],
                    }),
                    opacity: animatedValues[section.id],
                  },
                ]}
              >
                {section.content}
              </Animated.View>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryButton]}
            onPress={saveSettings}
          >
            <Text style={styles.primaryButtonText}>Save Settings</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={resetSettings}
          >
            <Text style={styles.secondaryButtonText}>Reset to Default</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © {new Date().getFullYear()} Todo App. All rights reserved.
          </Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => Alert.alert('Terms of Service', 'Our terms of service outline the rules for using our app.')}>
              <Text style={styles.footerLink}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.footerDivider}>•</Text>
            <TouchableOpacity onPress={() => Alert.alert('Privacy Policy', 'Our privacy policy details how we collect, use, and protect your personal information.')}>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  header: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    fontSize: 24,
    color: '#ffffff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 16,
    flex: 1,
  },
  profileButton: {
    marginLeft: 'auto',
  },
  profilePhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  defaultPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1d4ed8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  defaultPhotoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#2563eb',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroIconText: {
    fontSize: 40,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#e0e7ff',
    textAlign: 'center',
    maxWidth: '80%',
  },
  settingsContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  settingSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  sectionToggleIcon: {
    fontSize: 14,
    color: '#6b7280',
  },
  sectionContentContainer: {
    overflow: 'hidden',
  },
  sectionContent: {
    padding: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: '#4b5563',
  },
  profilePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  previewPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  defaultPreviewPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  previewEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  viewProfileText: {
    fontSize: 14,
    color: '#2563eb',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    overflow: 'hidden',
  },
  segmentedButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedButtonActive: {
    backgroundColor: '#2563eb',
  },
  segmentedButtonText: {
    fontSize: 14,
    color: '#4b5563',
  },
  segmentedButtonTextActive: {
    color: '#ffffff',
  },
  actionButtonsContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  actionButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#f3f4f6',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secondaryButtonText: {
    color: '#4b5563',
  },
  dangerButton: {
    backgroundColor: '#fee2e2',
  },
  dangerButtonText: {
    color: '#dc2626',
  },
  footer: {
    marginTop: 32,
    marginBottom: 24,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerLink: {
    fontSize: 14,
    color: '#2563eb',
  },
  footerDivider: {
    fontSize: 14,
    color: '#6b7280',
    marginHorizontal: 8,
  },
});