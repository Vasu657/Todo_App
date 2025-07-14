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
  Alert,
  BackHandler,
  Platform,
} from 'react-native';
import { useAppContext } from '../App';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IP_ADDRESS } from '../ip';

const { width } = Dimensions.get('window');

export default function Help({ navigation }) {
  const { updateCurrentRoute, refreshTrigger } = useAppContext();
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [animatedValues, setAnimatedValues] = useState({});
  const [profileData, setProfileData] = useState(null);

  // Animation setup
  useEffect(() => {
    const initialAnimatedValues = {};
    faqs.forEach(faq => {
      initialAnimatedValues[faq.id] = new Animated.Value(0);
    });
    setAnimatedValues(initialAnimatedValues);
  }, []);
  
  // Fetch profile data on mount
  useEffect(() => {
    fetchProfile();
    updateCurrentRoute('Help'); // Update current route when Help mounts
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
      updateCurrentRoute('Help');
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

  const toggleFaq = (faqId) => {
    // If tapping the same FAQ, collapse it
    if (expandedFaq === faqId) {
      setExpandedFaq(null);
      Animated.timing(animatedValues[faqId], {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      // If another FAQ is expanded, collapse it first
      if (expandedFaq) {
        Animated.timing(animatedValues[expandedFaq], {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }
      
      // Expand the new FAQ
      setExpandedFaq(faqId);
      Animated.timing(animatedValues[faqId], {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
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

  const openMenu = () => {
    navigation.openDrawer();
  };

  const faqs = [
    {
      id: 'faq1',
      question: 'How do I create a new task?',
      answer: 'To create a new task, go to the Home screen and tap the "+" button at the bottom of the screen. Enter the task title and optionally set a due date, then tap "Add Task".'
    },
    {
      id: 'faq2',
      question: 'How do I mark a task as completed?',
      answer: 'To mark a task as completed, simply tap the checkbox next to the task. The task will be marked as completed and will show a strikethrough text.'
    },
    {
      id: 'faq3',
      question: 'Can I edit a task after creating it?',
      answer: 'Yes, you can edit a task by tapping on it to open the task details. Then tap the "Edit" button to modify the task title or due date.'
    },
    {
      id: 'faq4',
      question: 'How do I delete a task?',
      answer: 'To delete a task, open the task details by tapping on it, then tap the "Delete" button. You can also swipe left on a task in the list and tap the delete icon.'
    },
    {
      id: 'faq5',
      question: 'How do I change my profile picture?',
      answer: 'Go to the Profile screen by tapping on your profile icon or selecting Profile from the menu. Then tap on your profile picture or the edit button to upload a new photo.'
    },
    {
      id: 'faq6',
      question: 'Is my data synchronized across devices?',
      answer: 'Yes, all your tasks and profile information are stored in the cloud and synchronized across all your devices when you sign in with the same account.'
    },
    {
      id: 'faq7',
      question: 'How do I reset my password?',
      answer: 'If you forgot your password, go to the Login screen and tap "Forgot Password". Follow the instructions sent to your email to reset your password.'
    },
    {
      id: 'faq8',
      question: 'Can I set recurring tasks?',
      answer: 'Recurring tasks functionality is coming soon in our next update. Stay tuned for this exciting feature!'
    },
    {
      id: 'faq9',
      question: 'How do I log out of the app?',
      answer: 'To log out, open the side menu by tapping the menu icon (☰) in the top-left corner, then tap the "Logout" button at the bottom of the menu.'
    },
    {
      id: 'faq10',
      question: 'Is there a limit to how many tasks I can create?',
      answer: 'No, there is no limit to the number of tasks you can create in the free version of the app.'
    },
  ];

  const supportChannels = [
    {
      id: 'email',
      title: 'Email Support',
      description: 'Send us an email and we\'ll respond within 24 hours',
      icon: '📧',
      action: () => Linking.openURL('mailto:support@todoapp.com'),
    },
    {
      id: 'chat',
      title: 'Live Chat',
      description: 'Chat with our support team in real-time',
      icon: '💬',
      action: () => Alert.alert('Coming Soon', 'Live chat support will be available soon!'),
    },
    {
      id: 'phone',
      title: 'Phone Support',
      description: 'Call us directly for urgent issues',
      icon: '📞',
      action: () => Linking.openURL('tel:+18001234567'),
    },
    {
      id: 'faq',
      title: 'FAQ',
      description: 'Browse our frequently asked questions',
      icon: '❓',
      action: () => {
        // Scroll to FAQ section
        // In a real app, you would implement scrolling to the FAQ section
        Alert.alert('FAQ', 'Scroll down to see our frequently asked questions');
      },
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={openMenu} style={styles.menuButton}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
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
          <Image
            source={require('../assets/icon.png')}
            style={styles.heroImage}
            resizeMode="contain"
          />
          <Text style={styles.heroTitle}>How can we help you?</Text>
          <Text style={styles.heroSubtitle}>
            Find answers to common questions or contact our support team
          </Text>
        </View>



        {/* Support Channels */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <View style={styles.supportChannelsContainer}>
            {supportChannels.map((channel) => (
              <TouchableOpacity
                key={channel.id}
                style={styles.supportChannel}
                onPress={channel.action}
              >
                <Text style={styles.channelIcon}>{channel.icon}</Text>
                <Text style={styles.channelTitle}>{channel.title}</Text>
                <Text style={styles.channelDescription}>{channel.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>



        {/* FAQ Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          
          <View style={styles.faqContainer}>
            {faqs.map((faq) => (
                <View key={faq.id} style={styles.faqItem}>
                  <TouchableOpacity
                    style={styles.faqQuestion}
                    onPress={() => toggleFaq(faq.id)}
                  >
                    <Text style={styles.faqQuestionText}>{faq.question}</Text>
                    <Text style={styles.faqToggleIcon}>
                      {expandedFaq === faq.id ? '▼' : '▶'}
                    </Text>
                  </TouchableOpacity>
                  <Animated.View
                    style={[
                      styles.faqAnswer,
                      {
                        maxHeight: animatedValues[faq.id]?.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 500],
                        }),
                        opacity: animatedValues[faq.id],
                      },
                    ]}
                  >
                    <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                  </Animated.View>
                </View>
              ))}
            </View>
        </View>

        {/* Additional Resources */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Additional Resources</Text>
          <View style={styles.resourcesContainer}>
            <TouchableOpacity
              style={styles.resourceItem}
              onPress={() => openLink('https://example.com/user-guide')}
            >
              <Text style={styles.resourceIcon}>📚</Text>
              <View style={styles.resourceContent}>
                <Text style={styles.resourceTitle}>User Guide</Text>
                <Text style={styles.resourceDescription}>
                  Comprehensive guide to using all features
                </Text>
              </View>
              <Text style={styles.resourceArrow}>→</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.resourceItem}
              onPress={() => openLink('https://example.com/video-tutorials')}
            >
              <Text style={styles.resourceIcon}>🎬</Text>
              <View style={styles.resourceContent}>
                <Text style={styles.resourceTitle}>Video Tutorials</Text>
                <Text style={styles.resourceDescription}>
                  Step-by-step video guides for common tasks
                </Text>
              </View>
              <Text style={styles.resourceArrow}>→</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.resourceItem}
              onPress={() => openLink('https://example.com/blog')}
            >
              <Text style={styles.resourceIcon}>📝</Text>
              <View style={styles.resourceContent}>
                <Text style={styles.resourceTitle}>Blog</Text>
                <Text style={styles.resourceDescription}>
                  Tips, tricks, and productivity advice
                </Text>
              </View>
              <Text style={styles.resourceArrow}>→</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.resourceItem}
              onPress={() => openLink('https://example.com/community')}
            >
              <Text style={styles.resourceIcon}>👥</Text>
              <View style={styles.resourceContent}>
                <Text style={styles.resourceTitle}>Community Forum</Text>
                <Text style={styles.resourceDescription}>
                  Connect with other users and share ideas
                </Text>
              </View>
              <Text style={styles.resourceArrow}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © {new Date().getFullYear()} Todo App. All rights reserved.
          </Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => openLink('https://example.com/terms')}>
              <Text style={styles.footerLink}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.footerDivider}>•</Text>
            <TouchableOpacity onPress={() => openLink('https://example.com/privacy')}>
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
  heroImage: {
    width: 80,
    height: 80,
    marginBottom: 16,
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

  sectionContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  supportChannelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  supportChannel: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  channelIcon: {
    fontSize: 24,
    marginBottom: 12,
  },
  channelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  channelDescription: {
    fontSize: 14,
    color: '#6b7280',
  },

  faqContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  faqQuestionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  faqToggleIcon: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  faqAnswer: {
    overflow: 'hidden',
  },
  faqAnswerText: {
    fontSize: 16,
    color: '#4b5563',
    padding: 16,
    paddingTop: 0,
    lineHeight: 24,
  },

  resourcesContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  resourceIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  resourceContent: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  resourceDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  resourceArrow: {
    fontSize: 18,
    color: '#6b7280',
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