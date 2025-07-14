import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  TextInput,
  Modal,
  BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { IP_ADDRESS } from '../ip';
import { useAppContext } from '../App';
import { processImage, formatFileSize, MAX_FILE_SIZE } from '../utils/imageUtils';

const { width } = Dimensions.get('window');

export default function Profile({ navigation }) {
  const { refreshTrigger, triggerRefresh, updateCurrentRoute } = useAppContext();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    //console.log('Profile screen mounted at:', new Date().toISOString());
    fetchProfile();
    updateCurrentRoute('Profile'); // Update current route when Profile mounts
  }, []);

  // Auto-refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchProfile();
    }
  }, [refreshTrigger]);

  // Update current route when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      updateCurrentRoute('Profile');
    });

    return unsubscribe;
  }, [navigation, updateCurrentRoute]);

  // Handle hardware back button
  useEffect(() => {
    const backAction = () => {
      if (isEditing) {
        handleCancelEdit();
        return true; // Prevent default back action
      } else {
        // Navigate to Home instead of going back to login
        navigation.navigate('Home');
        return true; // Prevent default back action
      }
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isEditing, navigation]);

  const fetchProfile = async () => {
    try {
     // console.log('Fetching profile data...');
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.log('No token found, redirecting to login');
        Alert.alert('Error', 'Please login again');
        navigation.navigate('Login');
        return;
      }

      //console.log('Making API request to:', `${IP_ADDRESS}/api/profile`);
      const response = await fetch(`${IP_ADDRESS}/api/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      //console.log('Profile API response status:', response.status);

      if (response.status === 401) {
        console.log('Unauthorized access, clearing token');
        await AsyncStorage.removeItem('token');
        Alert.alert('Session Expired', 'Please login again');
        navigation.navigate('Login');
        return;
      }

      if (!response.ok) {
        console.log('Profile fetch failed with status:', response.status);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // console.log('Profile data received successfully:', {
      //   id: data.id,
      //   name: data.name,
      //   email: data.email,
      //   phone: data.phone,
      //   hasProfilePhoto: !!data.profilePhoto,
      //   maskedPassword: data.maskedPassword,
      //   createdAt: data.createdAt,
      //   timestamp: new Date().toISOString()
      // });

      setProfileData(data);
      setEditData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        profilePhoto: data.profilePhoto || null
      });
    //  console.log('Profile state updated successfully');
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
   // console.log('Refreshing profile data...');
    setRefreshing(true);
    fetchProfile();
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.log('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const handleEditProfile = () => {
  //  console.log('Edit profile button pressed');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
 //   console.log('Cancel edit pressed');
    setIsEditing(false);
    setShowPassword(false);
    setNewPassword('');
    setConfirmPassword('');
    // Reset edit data to original profile data
    setEditData({
      name: profileData.name || '',
      email: profileData.email || '',
      phone: profileData.phone || '',
      profilePhoto: profileData.profilePhoto || null
    });
  };

  const handleSaveProfile = async () => {
    console.log('Save profile button pressed');
    
    // Validate password if changing
    if (newPassword || confirmPassword) {
      if (newPassword !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
      if (newPassword.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters long');
        return;
      }
    }
    
    setSaving(true);
    
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        Alert.alert('Error', 'Please login again');
        navigation.navigate('Login');
        return;
      }

      const updateData = {
        name: editData.name,
        email: editData.email,
        phone: editData.phone,
        profilePhoto: editData.profilePhoto
      };

      // Add password to update data if provided
      if (newPassword) {
        updateData.password = newPassword;
      }

      // console.log('Saving profile data:', {
      //   ...updateData,
      //   password: updateData.password ? '[HIDDEN]' : undefined
      // });
      
      const response = await fetch(`${IP_ADDRESS}/api/profile/update`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      //console.log('Profile update response status:', response.status);

      if (response.status === 401) {
        await AsyncStorage.removeItem('token');
        Alert.alert('Session Expired', 'Please login again');
        navigation.navigate('Login');
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedData = await response.json();
//      console.log('Profile updated successfully:', updatedData);
      
      setProfileData(updatedData);
      setIsEditing(false);
      setShowPassword(false);
      setNewPassword('');
      setConfirmPassword('');
      
      const successMessage = newPassword ? 
        'Profile and password updated successfully!' : 
        'Profile updated successfully!';
      Alert.alert('Success', successMessage);
      
      triggerRefresh(); // Trigger refresh across all components
      
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleImagePicker = async () => {
    console.log('Image picker pressed');
    
    Alert.alert(
      'Select Profile Photo',
      'Choose an option',
      [
        { text: 'Camera', onPress: () => openCamera() },
        { text: 'Gallery', onPress: () => openGallery() },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const openCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false, // We'll handle base64 in processImage
      });

      if (!result.canceled && result.assets[0]) {
        try {
          // Show loading indicator
          Alert.alert('Processing', 'Processing image...', [], { cancelable: false });
          
          // Process and compress image if needed
          const processedImage = await processImage(result.assets[0], MAX_FILE_SIZE);
          
          const imageUri = `data:image/jpeg;base64,${processedImage.base64}`;
          setEditData(prev => ({ ...prev, profilePhoto: imageUri }));
          
          // Show success message with size info
          const sizeInfo = processedImage.compressed 
            ? `Image compressed from ${formatFileSize(processedImage.originalSize)} to ${formatFileSize(processedImage.size)}`
            : `Image size: ${formatFileSize(processedImage.size)}`;
          
          console.log('Camera image processed:', sizeInfo);
          
          // Dismiss processing alert
          Alert.alert('Success', `Photo captured successfully!\n${sizeInfo}`);
          
        } catch (error) {
          console.error('Error processing camera image:', error);
          Alert.alert('Error', 'Failed to process image. Please try again.');
        }
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const openGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Gallery permission is required to select photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false, // We'll handle base64 in processImage
      });

      if (!result.canceled && result.assets[0]) {
        try {
          // Show loading indicator
          Alert.alert('Processing', 'Processing image...', [], { cancelable: false });
          
          // Process and compress image if needed
          const processedImage = await processImage(result.assets[0], MAX_FILE_SIZE);
          
          const imageUri = `data:image/jpeg;base64,${processedImage.base64}`;
          setEditData(prev => ({ ...prev, profilePhoto: imageUri }));
          
          // Show success message with size info
          const sizeInfo = processedImage.compressed 
            ? `Image compressed from ${formatFileSize(processedImage.originalSize)} to ${formatFileSize(processedImage.size)}`
            : `Image size: ${formatFileSize(processedImage.size)}`;
          
          console.log('Gallery image processed:', sizeInfo);
          
          // Dismiss processing alert
          Alert.alert('Success', `Photo selected successfully!\n${sizeInfo}`);
          
        } catch (error) {
          console.error('Error processing gallery image:', error);
          Alert.alert('Error', 'Failed to process image. Please try again.');
        }
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to select photo');
    }
  };



  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </View>
    );
  }

  if (!profileData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load profile data</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
           // console.log('Back button pressed');
            if (isEditing) {
              handleCancelEdit();
            } else {
              navigation.navigate('Home');
            }
          }}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Profile' : 'Profile'}</Text>
        {isEditing ? (
          <TouchableOpacity
            style={[styles.editButton, saving && styles.disabledButton]}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            <Text style={styles.editButtonText}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditProfile}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Profile Photo Section */}
      <View style={styles.photoSection}>
        <TouchableOpacity 
          style={styles.photoContainer}
          onPress={isEditing ? handleImagePicker : null}
          disabled={!isEditing}
        >
          {(isEditing ? editData.profilePhoto : profileData.profilePhoto) ? (
            <Image
              source={{ uri: isEditing ? editData.profilePhoto : profileData.profilePhoto }}
              style={styles.profilePhoto}
              onError={(error) => {
                console.log('Profile photo load error:', error);
              }}
            />
          ) : (
            <View style={styles.defaultPhoto}>
              <Text style={styles.defaultPhotoText}>
                {(isEditing ? editData.name : profileData.name) ? 
                  (isEditing ? editData.name : profileData.name).charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          )}
          {isEditing && (
            <View style={styles.photoEditOverlay}>
              <Text style={styles.photoEditText}>📷</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.userName}>
          {isEditing ? editData.name || 'Unknown User' : profileData.name || 'Unknown User'}
        </Text>
        <Text style={styles.userEmail}>
          {isEditing ? editData.email || 'No email' : profileData.email || 'No email'}
        </Text>
        {isEditing && (
          <Text style={styles.photoHint}>
            Tap photo to change (Max size: {formatFileSize(MAX_FILE_SIZE)})
          </Text>
        )}
      </View>

      {/* Profile Information */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>User ID</Text>
            <Text style={styles.infoValue}>#{profileData.id}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Full Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.editInput}
                value={editData.name}
                onChangeText={(text) => setEditData(prev => ({ ...prev, name: text }))}
                placeholder="Enter your name"
                placeholderTextColor="#9ca3af"
              />
            ) : (
              <Text style={styles.infoValue}>{profileData.name || 'Not provided'}</Text>
            )}
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email Address</Text>
            {isEditing ? (
              <TextInput
                style={styles.editInput}
                value={editData.email}
                onChangeText={(text) => setEditData(prev => ({ ...prev, email: text }))}
                placeholder="Enter your email"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            ) : (
              <Text style={styles.infoValue}>{profileData.email || 'Not provided'}</Text>
            )}
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone Number</Text>
            {isEditing ? (
              <TextInput
                style={styles.editInput}
                value={editData.phone}
                onChangeText={(text) => setEditData(prev => ({ ...prev, phone: text }))}
                placeholder="Enter your phone"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.infoValue}>{profileData.phone || 'Not provided'}</Text>
            )}
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Password</Text>
            {isEditing ? (
              <TouchableOpacity
                style={styles.passwordEditButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.passwordEditText}>
                  {showPassword ? 'Hide Password Fields' : 'Change Password'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.passwordContainer}>
                <Text style={styles.maskedPassword}>{profileData.maskedPassword || '********'}</Text>
              </View>
            )}
          </View>
          
          {isEditing && showPassword && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>New Password</Text>
                <TextInput
                  style={styles.editInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={true}
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Confirm Password</Text>
                <TextInput
                  style={styles.editInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={true}
                  autoCapitalize="none"
                />
              </View>
            </>
          )}
          
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Member Since</Text>
            <Text style={styles.infoValue}>
              {profileData.createdAt ? formatDate(profileData.createdAt) : 'Unknown'}
            </Text>
          </View>
        </View>
      </View>

      {/* Editing Instructions */}
      {isEditing && (
        <View style={styles.editingInstructions}>
          <Text style={styles.instructionText}>
            💡 Tap the profile photo to change it, edit any fields above, click "Change Password" to update your password, then tap "Save" to update your profile.
          </Text>
        </View>
      )}

      {/* Profile Guide */}
      {!isEditing && (
        <View style={styles.guideSection}>
          <Text style={styles.sectionTitle}>About Your Profile</Text>
          
          <View style={styles.guideCard}>
            <View style={styles.guideItem}>
              <Text style={styles.guideIcon}>👤</Text>
              <View style={styles.guideContent}>
                <Text style={styles.guideTitle}>Personal Information</Text>
                <Text style={styles.guideDescription}>
                  View and manage your personal details including name, email, and phone number. Keep your information up to date for better app experience.
                </Text>
              </View>
            </View>
            
            <View style={styles.guideDivider} />
            
            <View style={styles.guideItem}>
              <Text style={styles.guideIcon}>📷</Text>
              <View style={styles.guideContent}>
                <Text style={styles.guideTitle}>Profile Photo</Text>
                <Text style={styles.guideDescription}>
                  Add or change your profile picture to personalize your account. You can take a new photo or choose from your gallery.
                </Text>
              </View>
            </View>
            
            <View style={styles.guideDivider} />
            
            <View style={styles.guideItem}>
              <Text style={styles.guideIcon}>🔒</Text>
              <View style={styles.guideContent}>
                <Text style={styles.guideTitle}>Security & Password</Text>
                <Text style={styles.guideDescription}>
                  Your password is securely encrypted and displayed in masked format. You can update it anytime while editing your profile.
                </Text>
              </View>
            </View>
            
            <View style={styles.guideDivider} />
            
            <View style={styles.guideItem}>
              <Text style={styles.guideIcon}>✏️</Text>
              <View style={styles.guideContent}>
                <Text style={styles.guideTitle}>How to Edit</Text>
                <Text style={styles.guideDescription}>
                  Tap the "Edit" button at the top to modify your information. You can update multiple fields at once and save all changes together.
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Bottom Spacing */}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: '#374151',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2563eb',
    borderRadius: 20,
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  photoContainer: {
    marginBottom: 16,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#e5e7eb',
  },
  defaultPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#e5e7eb',
  },
  defaultPhotoText: {
    fontSize: 48,
    color: '#ffffff',
    fontWeight: '700',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  infoLabel: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  maskedPassword: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
    marginRight: 12,
    fontFamily: 'monospace',
  },
  changePasswordButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  changePasswordText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 20,
  },
  actionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  actionButtonIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  actionButtonArrow: {
    fontSize: 16,
    color: '#9ca3af',
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 32,
  },
  disabledButton: {
    opacity: 0.6,
  },
  photoEditOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2563eb',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  photoEditText: {
    fontSize: 16,
    color: '#ffffff',
  },
  photoHint: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  editInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
    textAlign: 'right',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: 16,
  },
  editingInstructions: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  instructionText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  passwordEditButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    marginLeft: 16,
  },
  passwordEditText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
  },
  guideSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  guideCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  guideItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  guideIcon: {
    fontSize: 24,
    marginRight: 16,
    width: 32,
    textAlign: 'center',
  },
  guideContent: {
    flex: 1,
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  guideDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  guideDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 20,
  },
});