import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { IP_ADDRESS } from '../ip';
import { useAppContext } from '../App';
import { processImage, formatFileSize, MAX_FILE_SIZE } from '../utils/imageUtils';

export default function Register({ navigation }) {
  const { triggerRefresh } = useAppContext();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
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
        Alert.alert('Permission Required', 'Camera permission is required to take photos!');
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
        await handleImageSelection(result.assets[0]);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const openGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
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
        await handleImageSelection(result.assets[0]);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  const handleImageSelection = async (imageAsset) => {
    try {
      setImageProcessing(true);
      
      // Process and compress image if needed
      const processedImage = await processImage(imageAsset, MAX_FILE_SIZE);
      
      // Create the profile photo object with processed data
      const photoData = {
        uri: processedImage.uri,
        base64: processedImage.base64,
        size: processedImage.size,
        compressed: processedImage.compressed,
        originalSize: processedImage.originalSize
      };
      
      setProfilePhoto(photoData);
      
      // Show success message with size info
      const sizeInfo = processedImage.compressed 
        ? `Image compressed from ${formatFileSize(processedImage.originalSize)} to ${formatFileSize(processedImage.size)}`
        : `Image size: ${formatFileSize(processedImage.size)}`;
      
      console.log('Image processed for registration:', sizeInfo);
      
      Alert.alert('Success', `Photo selected successfully!\n${sizeInfo}`);
      
    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert('Error', 'Failed to process image. Please try again.');
    } finally {
      setImageProcessing(false);
    }
  };

  const handleRegister = async () => {
    // Basic validation
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    
    if (!password) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }
    
    if (!confirmPassword) {
      Alert.alert('Error', 'Please confirm your password');
      return;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }
    
    if (!agreeToTerms) {
      Alert.alert('Error', 'Please agree to the terms and conditions');
      return;
    }

    setLoading(true);
    try {
      const registrationData = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        confirmPassword,
        agreeToTerms,
        profilePhoto: profilePhoto ? `data:image/jpeg;base64,${profilePhoto.base64}` : null
      };

      const response = await axios.post(`${IP_ADDRESS}/api/auth/register`, registrationData);
      Alert.alert('Success', 'Registration successful! Please login.');
      triggerRefresh(); // Trigger refresh across all components
      navigation.navigate('Login');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>Create Account</Text>
      
      {/* Profile Photo Section */}
      <View style={styles.photoSection}>
        <TouchableOpacity 
          style={[styles.photoContainer, imageProcessing && styles.disabledPhotoContainer]} 
          onPress={pickImage}
          disabled={imageProcessing}
        >
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto.uri }} style={styles.profileImage} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>
                {imageProcessing ? '⏳' : '+'}
              </Text>
              <Text style={styles.photoLabel}>
                {imageProcessing ? 'Processing...' : 'Add Photo'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.photoHint}>
          Profile photo (optional) - Max size: {formatFileSize(MAX_FILE_SIZE)}
        </Text>
        {profilePhoto && profilePhoto.compressed && (
          <Text style={styles.compressionHint}>
            ✓ Image compressed from {formatFileSize(profilePhoto.originalSize)} to {formatFileSize(profilePhoto.size)}
          </Text>
        )}
      </View>

      {/* Form Fields */}
      <TextInput
        style={styles.input}
        placeholder="Full Name *"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        placeholderTextColor="#888"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Email Address *"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor="#888"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Phone Number (optional)"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholderTextColor="#888"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password *"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor="#888"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Confirm Password *"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        placeholderTextColor="#888"
      />

      {/* Terms and Conditions */}
      <TouchableOpacity 
        style={styles.checkboxContainer} 
        onPress={() => setAgreeToTerms(!agreeToTerms)}
      >
        <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
          {agreeToTerms && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.checkboxText}>
          I agree to the <Text style={styles.linkText}>Terms and Conditions</Text>
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, loading && styles.disabledButton]} 
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Already have an account? Sign In</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 32,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photoContainer: {
    marginBottom: 8,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#2563eb',
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
  },
  photoPlaceholderText: {
    fontSize: 32,
    color: '#9ca3af',
    fontWeight: '300',
  },
  photoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  photoHint: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  compressionHint: {
    fontSize: 12,
    color: '#059669',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  disabledPhotoContainer: {
    opacity: 0.6,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    color: '#1f2937',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  linkText: {
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  link: {
    color: '#2563eb',
    textAlign: 'center',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
});