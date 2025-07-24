import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  RefreshControl,
  Dimensions,
  Image
} from 'react-native';
import axios from 'axios';
import { IP_ADDRESS } from '../ip';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppContext } from '../App';

const { width } = Dimensions.get('window');

export default function Stats({ navigation }) {
  const { refreshTrigger, triggerRefresh, updateCurrentRoute } = useAppContext();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchProfile();
    updateCurrentRoute('Stats');
  }, []);

  // Auto-refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchStats();
      fetchProfile();
    }
  }, [refreshTrigger]);

  // Update current route when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      updateCurrentRoute('Stats');
      fetchStats(); // Refresh stats when screen comes into focus
    });

    return unsubscribe;
  }, [navigation, updateCurrentRoute]);

  const fetchStats = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${IP_ADDRESS}/api/todos/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(response.data);
    } catch (error) {
      console.error('Fetch stats error:', error.message);
      Alert.alert('Error', 'Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      
      const response = await axios.get(`${IP_ADDRESS}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setProfileData(response.data);
    } catch (error) {
      console.error('Fetch profile error:', error.message);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    await fetchProfile();
    setRefreshing(false);
  };

  const openMenu = () => {
    navigation.openDrawer();
  };

  const calculatePercentage = (completed, total) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const StatCard = ({ title, total, completed, pending, color, icon }) => {
    const percentage = calculatePercentage(completed, total);
    
    return (
      <View style={[styles.statCard, { borderLeftColor: color }]}>
        <View style={styles.statHeader}>
          <View style={styles.statTitleContainer}>
            <Text style={styles.statIcon}>{icon}</Text>
            <Text style={styles.statTitle}>{title}</Text>
          </View>
          <Text style={[styles.statPercentage, { color }]}>{percentage}%</Text>
        </View>
        
        <View style={styles.statNumbers}>
          <View style={styles.statNumberItem}>
            <Text style={styles.statNumber}>{total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statNumberItem}>
            <Text style={[styles.statNumber, { color: '#10b981' }]}>{completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statNumberItem}>
            <Text style={[styles.statNumber, { color: '#f59e0b' }]}>{pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>
        
        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${percentage}%`, backgroundColor: color }
              ]} 
            />
          </View>
        </View>
      </View>
    );
  };

  const AlertCard = ({ title, count, color, icon, onPress }) => (
    <TouchableOpacity style={[styles.alertCard, { borderColor: color }]} onPress={onPress}>
      <View style={styles.alertHeader}>
        <Text style={styles.alertIcon}>{icon}</Text>
        <View style={styles.alertTextContainer}>
          <Text style={styles.alertTitle}>{title}</Text>
          <Text style={[styles.alertCount, { color }]}>{count} todos</Text>
        </View>
      </View>
      <Text style={styles.alertArrow}>→</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={openMenu} style={styles.menuButton}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Statistics</Text>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            {profileData && profileData.profilePhoto ? (
              <Image 
                source={{ uri: profileData.profilePhoto }} 
                style={styles.profilePhoto} 
                onError={() => {}}
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
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading statistics...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={openMenu} style={styles.menuButton}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Statistics</Text>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          {profileData && profileData.profilePhoto ? (
            <Image 
              source={{ uri: profileData.profilePhoto }} 
              style={styles.profilePhoto} 
              onError={() => {}}
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

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Message */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>📊 Your Todo Statistics</Text>
          <Text style={styles.welcomeSubtitle}>Track your productivity and progress</Text>
        </View>

        {/* Alert Cards */}
        {stats && (
          <View style={styles.alertSection}>
            <Text style={styles.sectionTitle}>Quick Overview</Text>
            <AlertCard
              title="Overdue Tasks"
              count={stats.overdue}
              color="#ef4444"
              icon="⚠️"
              onPress={() => navigation.navigate('Upcoming')}
            />
            <AlertCard
              title="Upcoming Tasks"
              count={stats.upcoming}
              color="#3b82f6"
              icon="📅"
              onPress={() => navigation.navigate('Upcoming')}
            />
          </View>
        )}

        {/* Statistics Cards */}
        {stats && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Detailed Statistics</Text>
            
            <StatCard
              title="Overall Progress"
              total={stats.total.total}
              completed={stats.total.completed}
              pending={stats.total.pending}
              color="#2563eb"
              icon="📈"
            />
            
            <StatCard
              title="Today's Progress"
              total={stats.today.total}
              completed={stats.today.completed}
              pending={stats.today.pending}
              color="#10b981"
              icon="📅"
            />
            
            <StatCard
              title="This Week"
              total={stats.week.total}
              completed={stats.week.completed}
              pending={stats.week.pending}
              color="#8b5cf6"
              icon="📊"
            />
            
            <StatCard
              title="This Month"
              total={stats.month.total}
              completed={stats.month.completed}
              pending={stats.month.pending}
              color="#f59e0b"
              icon="📆"
            />
          </View>
        )}

        {/* Summary Card */}
        {stats && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>🎉 Great Job!</Text>
            <Text style={styles.summaryText}>
              You've completed {stats.total.completed} out of {stats.total.total} todos overall.
              {stats.total.total > 0 && ` That's ${calculatePercentage(stats.total.completed, stats.total.total)}% completion rate!`}
            </Text>
            {stats.overdue > 0 && (
              <Text style={styles.summaryWarning}>
                Don't forget about {stats.overdue} overdue task{stats.overdue > 1 ? 's' : ''}!
              </Text>
            )}
          </View>
        )}
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  welcomeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e0e7ff',
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  alertSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  alertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alertIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  alertTextContainer: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  alertCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  alertArrow: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: '600',
  },
  statsSection: {
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  statTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  statPercentage: {
    fontSize: 18,
    fontWeight: '700',
  },
  statNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statNumberItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  summaryText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  summaryWarning: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 8,
  },
});