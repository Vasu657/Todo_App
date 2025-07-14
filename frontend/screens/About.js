import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Animated,
  Dimensions,
  Platform,
  Share,
  Alert,
  BackHandler,
} from 'react-native';
import { useAppContext } from '../App';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IP_ADDRESS } from '../ip';

const { width } = Dimensions.get('window');

export default function About({ navigation }) {
  const { updateCurrentRoute, refreshTrigger } = useAppContext();
  const [expandedSection, setExpandedSection] = useState(null);
  const [animatedValues, setAnimatedValues] = useState({});
  const [appInfo, setAppInfo] = useState({
    version: '1.0.0',
    buildNumber: '100',
    releaseDate: 'May 2024',
  });
  const [developerMode, setDeveloperMode] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [profileData, setProfileData] = useState(null);

  // Animation setup
  useEffect(() => {
    const initialAnimatedValues = {};
    sections.forEach(section => {
      initialAnimatedValues[section.id] = new Animated.Value(0);
    });
    setAnimatedValues(initialAnimatedValues);
  }, []);
  
  // Fetch profile data on mount
  useEffect(() => {
    fetchProfile();
  }, []);
  
  // Refresh profile when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchProfile();
    }
  }, [refreshTrigger]);
  
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

  // Set current route when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      updateCurrentRoute('About');
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

  // Check for developer mode
  useEffect(() => {
    const checkDeveloperMode = async () => {
      try {
        const devMode = await AsyncStorage.getItem('developerMode');
        setDeveloperMode(devMode === 'true');
      } catch (error) {
        console.error('Error checking developer mode:', error);
      }
    };
    
    checkDeveloperMode();
  }, []);

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

  const handleLogoPress = () => {
    setTapCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 7) {
        toggleDeveloperMode();
        return 0;
      }
      return newCount;
    });
  };

  const toggleDeveloperMode = async () => {
    try {
      const newMode = !developerMode;
      await AsyncStorage.setItem('developerMode', newMode.toString());
      setDeveloperMode(newMode);
      Alert.alert(
        'Developer Mode',
        newMode ? 'Developer mode activated!' : 'Developer mode deactivated',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error toggling developer mode:', error);
    }
  };

  const shareApp = async () => {
    try {
      await Share.share({
        message: 'Check out this amazing Todo App! It helps you stay organized and productive.',
        title: 'Todo App',
        url: 'https://todoapp.example.com',
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share the app');
    }
  };

  const openLink = (url) => {
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this URL');
      }
    });
  };

  const sections = [
    {
      id: 'features',
      title: 'Features',
      icon: '✨',
      content: [
        'Task Management: Create, edit, and delete tasks',
        'Due Dates: Set and track deadlines',
        'Task Completion: Mark tasks as complete',
        'User Profiles: Customize your profile with photo and details',
        'Multi-device Sync: Access your tasks from any device',
        'Secure Authentication: Keep your data safe',
        'Dark Mode Support: Easy on the eyes',
        'Offline Support: Work without internet connection',
      ]
    },
    {
      id: 'technology',
      title: 'Technology',
      icon: '🔧',
      content: [
        'Frontend: React Native',
        'Backend: Node.js with Express',
        'Database: MongoDB',
        'Authentication: JWT',
        'State Management: Context API',
        'UI Components: Custom built',
        'Navigation: React Navigation',
        'Storage: AsyncStorage & MongoDB',
      ]
    },
    {
      id: 'team',
      title: 'Development Team',
      icon: '👥',
      content: [
        'Lead Developer: John Doe',
        'UI/UX Designer: Jane Smith',
        'Backend Developer: Alex Johnson',
        'QA Engineer: Sarah Williams',
        'Product Manager: Michael Brown',
      ]
    },
    {
      id: 'privacy',
      title: 'Privacy & Terms',
      icon: '🔒',
      content: [
        'Your data is stored securely',
        'We never share your information with third parties',
        'Tasks are encrypted end-to-end',
        'You can request data deletion at any time',
        'For full terms and privacy policy, visit our website',
      ]
    },
  ];

  // Add developer section if developer mode is enabled
  if (developerMode) {
    sections.push({
      id: 'developer',
      title: 'Developer Options',
      icon: '🛠️',
      content: [
        'API Endpoint: ' + IP_ADDRESS,
        'Build Environment: Development',
        'Debug Mode: Enabled',
        'API Logging: Enabled',
        'Performance Monitoring: Enabled',
      ]
    });
  }

  const openMenu = () => {
    navigation.openDrawer();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={openMenu} style={styles.menuButton}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About Todo App</Text>
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
        <View style={styles.logoContainer}>
          <TouchableOpacity onPress={handleLogoPress}>
            <Image
              source={require('../assets/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text style={styles.appName}>Todo App</Text>
          <Text style={styles.appVersion}>
            Version {appInfo.version} (Build {appInfo.buildNumber})
          </Text>
          <Text style={styles.releaseDate}>Released: {appInfo.releaseDate}</Text>
        </View>

        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>
            Todo App is a powerful task management application designed to help you
            stay organized and boost your productivity. With an intuitive interface
            and robust features, managing your daily tasks has never been easier.
          </Text>
        </View>

        <View style={styles.sectionsContainer}>
          {sections.map((section) => (
            <View key={section.id} style={styles.sectionWrapper}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection(section.id)}
              >
                <View style={styles.sectionTitleContainer}>
                  <Text style={styles.sectionIcon}>{section.icon}</Text>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                </View>
                <Text style={styles.expandIcon}>
                  {expandedSection === section.id ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>

              <Animated.View
                style={[
                  styles.sectionContent,
                  {
                    maxHeight: animatedValues[section.id]?.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 500],
                    }),
                    opacity: animatedValues[section.id],
                  },
                ]}
              >
                {section.content.map((item, index) => (
                  <View key={index} style={styles.contentItem}>
                    <Text style={styles.bulletPoint}>•</Text>
                    <Text style={styles.contentText}>{item}</Text>
                  </View>
                ))}
              </Animated.View>
            </View>
          ))}
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openLink('https://example.com/support')}
          >
            <Text style={styles.actionButtonIcon}>📧</Text>
            <Text style={styles.actionButtonText}>Contact Support</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openLink('https://example.com/feedback')}
          >
            <Text style={styles.actionButtonIcon}>💬</Text>
            <Text style={styles.actionButtonText}>Send Feedback</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={shareApp}
          >
            <Text style={styles.actionButtonIcon}>📤</Text>
            <Text style={styles.actionButtonText}>Share App</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openLink('https://example.com/rate')}
          >
            <Text style={styles.actionButtonIcon}>⭐</Text>
            <Text style={styles.actionButtonText}>Rate App</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © {new Date().getFullYear()} Todo App. All rights reserved.
          </Text>
          <Text style={styles.footerSubtext}>
            Made with ❤️ for productivity enthusiasts
          </Text>
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
    paddingTop: 40,
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
    backgroundColor: '#1e40af',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  defaultPhotoText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 30,
    marginBottom: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  appVersion: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 4,
  },
  releaseDate: {
    fontSize: 14,
    color: '#94a3b8',
  },
  descriptionContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#334155',
    textAlign: 'center',
  },
  sectionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionWrapper: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
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
    backgroundColor: '#ffffff',
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
    color: '#1e293b',
  },
  expandIcon: {
    fontSize: 14,
    color: '#64748b',
  },
  sectionContent: {
    overflow: 'hidden',
    paddingHorizontal: 16,
  },
  contentItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingRight: 8,
  },
  bulletPoint: {
    fontSize: 16,
    color: '#2563eb',
    marginRight: 8,
    fontWeight: 'bold',
  },
  contentText: {
    fontSize: 15,
    color: '#475569',
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  actionButton: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
});