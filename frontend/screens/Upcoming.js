import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  RefreshControl,
  Modal,
  TextInput,
  Platform,
  Image
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { IP_ADDRESS } from '../ip';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppContext } from '../App';

export default function Upcoming({ navigation }) {
  const { refreshTrigger, triggerRefresh, updateCurrentRoute } = useAppContext();
  const [upcomingTodos, setUpcomingTodos] = useState([]);
  const [overdueTodos, setOverdueTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState(null);
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  
  // Date picker states
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [editSelectedDate, setEditSelectedDate] = useState(new Date());

  useEffect(() => {
    fetchUpcomingTodos();
    fetchOverdueTodos();
    fetchProfile();
    updateCurrentRoute('Upcoming');
  }, []);

  // Auto-refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchUpcomingTodos();
      fetchOverdueTodos();
      fetchProfile();
    }
  }, [refreshTrigger]);

  // Update current route when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      updateCurrentRoute('Upcoming');
      fetchUpcomingTodos();
      fetchOverdueTodos();
    });

    return unsubscribe;
  }, [navigation, updateCurrentRoute]);

  const fetchUpcomingTodos = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${IP_ADDRESS}/api/todos/upcoming`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUpcomingTodos(response.data);
    } catch (error) {
      console.error('Fetch upcoming todos error:', error.message);
      Alert.alert('Error', 'Failed to fetch upcoming todos');
    }
  };

  const fetchOverdueTodos = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${IP_ADDRESS}/api/todos/overdue`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOverdueTodos(response.data);
    } catch (error) {
      console.error('Fetch overdue todos error:', error.message);
      Alert.alert('Error', 'Failed to fetch overdue todos');
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
    await fetchUpcomingTodos();
    await fetchOverdueTodos();
    await fetchProfile();
    setRefreshing(false);
  };

  const toggleTodo = async (id) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.put(
        `${IP_ADDRESS}/api/todos/${id}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update the todo in both lists
      setUpcomingTodos(upcomingTodos.map(todo => 
        todo.id === id ? response.data : todo
      ));
      setOverdueTodos(overdueTodos.map(todo => 
        todo.id === id ? response.data : todo
      ));
      
      // Update selected todo if it's the one being toggled
      if (selectedTodo && selectedTodo.id === id) {
        setSelectedTodo(response.data);
      }
      
      triggerRefresh();
    } catch (error) {
      console.error('Toggle todo error:', error.message);
      Alert.alert('Error', 'Failed to toggle todo');
    }
  };

  const updateTodo = async (id, title, due_date) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.put(
        `${IP_ADDRESS}/api/todos/${id}`,
        { title, due_date },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update the todo in both lists
      setUpcomingTodos(upcomingTodos.map(todo => 
        todo.id === id ? response.data : todo
      ));
      setOverdueTodos(overdueTodos.map(todo => 
        todo.id === id ? response.data : todo
      ));
      
      setSelectedTodo(response.data);
      setIsEditing(false);
      setEditTitle('');
      setEditDueDate('');
      triggerRefresh();
    } catch (error) {
      console.error('Update todo error:', error.message);
      Alert.alert('Error', 'Failed to update todo');
    }
  };

  const deleteTodo = async (id) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.delete(`${IP_ADDRESS}/api/todos/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setUpcomingTodos(upcomingTodos.filter((todo) => todo.id !== id));
      setOverdueTodos(overdueTodos.filter((todo) => todo.id !== id));
      triggerRefresh();
    } catch (error) {
      console.error('Delete todo error:', error.message);
      Alert.alert('Error', 'Failed to delete todo');
    }
  };

  const openTodoDetail = (todo) => {
    setSelectedTodo(todo);
    setModalVisible(true);
  };

  const closeTodoDetail = () => {
    setModalVisible(false);
    setSelectedTodo(null);
    setIsEditing(false);
    setEditTitle('');
    setEditDueDate('');
    setEditSelectedDate(new Date());
  };

  const startEditing = () => {
    setIsEditing(true);
    setEditTitle(selectedTodo.title);
    setEditDueDate(selectedTodo.due_date || '');
    if (selectedTodo.due_date) {
      setEditSelectedDate(new Date(selectedTodo.due_date));
    } else {
      setEditSelectedDate(new Date());
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditTitle('');
    setEditDueDate('');
    setEditSelectedDate(new Date());
  };

  const saveEdit = () => {
    if (!editTitle.trim()) {
      Alert.alert('Error', 'Title cannot be empty');
      return;
    }
    updateTodo(selectedTodo.id, editTitle, editDueDate);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDueDateStatus = (dueDate) => {
    const days = getDaysUntilDue(dueDate);
    if (days < 0) return { text: `${Math.abs(days)} days overdue`, color: '#ef4444' };
    if (days === 0) return { text: 'Due today', color: '#f59e0b' };
    if (days === 1) return { text: 'Due tomorrow', color: '#3b82f6' };
    return { text: `Due in ${days} days`, color: '#6b7280' };
  };

  // Date picker handlers
  const onEditDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || new Date();
    setShowEditDatePicker(Platform.OS === 'ios');
    setEditSelectedDate(currentDate);
    
    if (event.type === 'set') {
      const formattedDate = currentDate.toISOString().split('T')[0];
      setEditDueDate(formattedDate);
    }
  };

  const showEditDatePickerModal = () => {
    if (editDueDate) {
      setEditSelectedDate(new Date(editDueDate));
    } else {
      setEditSelectedDate(new Date());
    }
    setShowEditDatePicker(true);
  };

  const clearEditDueDate = () => {
    setEditDueDate('');
    setEditSelectedDate(new Date());
  };

  const openMenu = () => {
    navigation.openDrawer();
  };

  const TodoItem = ({ item, isOverdue = false }) => {
    const dueDateStatus = getDueDateStatus(item.due_date);
    
    return (
      <TouchableOpacity 
        style={[
          styles.todoItem, 
          item.completed && styles.completedTodo,
          isOverdue && styles.overdueTodo
        ]}
        onPress={() => openTodoDetail(item)}
      >
        <View style={styles.todoContent}>
          <View style={styles.todoHeader}>
            <Text style={[styles.todoText, item.completed && styles.completedText]}>
              {item.title}
            </Text>
            <TouchableOpacity 
              onPress={() => toggleTodo(item.id)}
              style={[styles.checkButton, item.completed && styles.checkedButton]}
            >
              <Text style={styles.checkText}>
                {item.completed ? '✓' : '○'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.todoMeta}>
            <Text style={styles.dateText}>
              Created: {formatDate(item.created_at)}
            </Text>
            <Text style={[styles.dueDateStatus, { color: dueDateStatus.color }]}>
              {dueDateStatus.text}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={openMenu} style={styles.menuButton}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upcoming & Overdue</Text>
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
          <Text style={styles.loadingText}>Loading todos...</Text>
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
        <Text style={styles.headerTitle}>Upcoming & Overdue</Text>
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
          <Text style={styles.welcomeTitle}>📅 Upcoming & Overdue Tasks</Text>
          <Text style={styles.welcomeSubtitle}>Stay on top of your deadlines</Text>
        </View>

        {/* Overdue Section */}
        {overdueTodos.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>⚠️ Overdue Tasks</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{overdueTodos.length}</Text>
              </View>
            </View>
            {overdueTodos.map((item) => (
              <TodoItem key={item.id} item={item} isOverdue={true} />
            ))}
          </View>
        )}

        {/* Upcoming Section */}
        {upcomingTodos.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📅 Upcoming Tasks</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{upcomingTodos.length}</Text>
              </View>
            </View>
            {upcomingTodos.map((item) => (
              <TodoItem key={item.id} item={item} />
            ))}
          </View>
        )}

        {/* Empty State */}
        {overdueTodos.length === 0 && upcomingTodos.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🎉</Text>
            <Text style={styles.emptyStateTitle}>All Caught Up!</Text>
            <Text style={styles.emptyStateText}>
              You have no overdue or upcoming tasks. Great job staying organized!
            </Text>
            <TouchableOpacity 
              style={styles.goHomeButton}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.goHomeButtonText}>Go to Home</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Todo Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeTodoDetail}
        presentationStyle="overFullScreen"
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            onPress={closeTodoDetail}
            activeOpacity={1}
          />
          <View style={styles.modalContainer}>
            {/* Modal Handle */}
            <View style={styles.modalHandle}>
              <View style={styles.modalHandleBar} />
            </View>
            
            {selectedTodo && (
              <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                {/* Todo Card Style Header */}
                <View style={styles.modalTodoCard}>
                  <View style={styles.modalTodoHeader}>
                    <View style={styles.modalTodoTitleContainer}>
                      {isEditing ? (
                        <TextInput
                          style={styles.modalEditInput}
                          value={editTitle}
                          onChangeText={setEditTitle}
                          placeholder="Enter todo title"
                          placeholderTextColor="#888"
                          multiline
                        />
                      ) : (
                        <Text style={[styles.modalTodoTitle, selectedTodo.completed && styles.modalCompletedText]}>
                          {selectedTodo.title}
                        </Text>
                      )}
                    </View>
                    
                    <View style={styles.modalActionButtons}>
                      {!isEditing ? (
                        <>
                          <TouchableOpacity onPress={startEditing} style={styles.modalEditButton}>
                            <Text style={styles.modalEditButtonText}>✏️</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={closeTodoDetail} style={styles.modalCloseButton}>
                            <Text style={styles.modalCloseButtonText}>×</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity onPress={closeTodoDetail} style={styles.modalCloseButton}>
                          <Text style={styles.modalCloseButtonText}>×</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  
                  {/* Status Section */}
                  <View style={styles.modalStatusSection}>
                    <View style={[styles.modalStatusBadge, selectedTodo.completed && styles.modalCompletedBadge]}>
                      <Text style={[styles.modalStatusText, selectedTodo.completed && styles.modalCompletedStatusText]}>
                        {selectedTodo.completed ? '✓ Completed' : '○ Pending'}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => toggleTodo(selectedTodo.id)}
                      style={styles.modalToggleButton}
                    >
                      <Text style={styles.modalToggleButtonText}>
                        {selectedTodo.completed ? 'Mark Pending' : 'Mark Complete'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  {/* Date Information */}
                  <View style={styles.modalDateSection}>
                    <View style={styles.modalDateRow}>
                      <Text style={styles.modalDateLabel}>Created:</Text>
                      <Text style={styles.modalDateValue}>
                        {formatDate(selectedTodo.created_at)}
                      </Text>
                    </View>
                    
                    <View style={styles.modalDateRow}>
                      <Text style={styles.modalDateLabel}>Due Date:</Text>
                      {isEditing ? (
                        <View style={styles.modalEditDateContainer}>
                          <TouchableOpacity 
                            style={styles.modalDatePickerButton} 
                            onPress={showEditDatePickerModal}
                          >
                            <Text style={styles.modalDatePickerButtonText}>
                              {editDueDate ? formatDate(editDueDate) : '📅 Select Date'}
                            </Text>
                          </TouchableOpacity>
                          {editDueDate && (
                            <TouchableOpacity 
                              style={styles.modalClearDateButton} 
                              onPress={clearEditDueDate}
                            >
                              <Text style={styles.modalClearDateButtonText}>✕</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      ) : (
                        <View style={styles.modalDueDateContainer}>
                          <Text style={[styles.modalDateValue, !selectedTodo.due_date && styles.modalNoDueDateText]}>
                            {selectedTodo.due_date ? formatDate(selectedTodo.due_date) : 'No due date'}
                          </Text>
                          {selectedTodo.due_date && (
                            <Text style={[styles.modalDueDateStatus, { color: getDueDateStatus(selectedTodo.due_date).color }]}>
                              {getDueDateStatus(selectedTodo.due_date).text}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                
                {/* Action Buttons */}
                <View style={styles.modalActionsContainer}>
                  {isEditing ? (
                    <View style={styles.modalEditActions}>
                      <TouchableOpacity 
                        style={styles.modalSaveButton}
                        onPress={saveEdit}
                      >
                        <Text style={styles.modalSaveButtonText}>Save Changes</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.modalCancelButton}
                        onPress={cancelEditing}
                      >
                        <Text style={styles.modalCancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.modalDeleteButton}
                      onPress={() => {
                        Alert.alert(
                          'Delete Todo',
                          'Are you sure you want to delete this todo?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { 
                              text: 'Delete', 
                              style: 'destructive',
                              onPress: () => {
                                deleteTodo(selectedTodo.id);
                                closeTodoDetail();
                              }
                            }
                          ]
                        );
                      }}
                    >
                      <Text style={styles.modalDeleteButtonText}>Delete Todo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showEditDatePicker && (
        <DateTimePicker
          value={editSelectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onEditDateChange}
          minimumDate={new Date()}
        />
      )}
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  sectionBadge: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  sectionBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  todoItem: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    minHeight: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  completedTodo: {
    borderLeftColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  overdueTodo: {
    borderLeftColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  todoContent: {
    flex: 1,
    justifyContent: 'center',
  },
  todoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  todoText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
    fontWeight: '500',
    lineHeight: 22,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
    fontWeight: '400',
  },
  checkButton: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  checkedButton: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  checkText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  todoMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '400',
  },
  dueDateStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  goHomeButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  goHomeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: '#f1f5f9',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  modalHandle: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#f1f5f9',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
  },
  modalScrollView: {
    flexGrow: 1,
    flexShrink: 1,
    padding: 16,
    paddingBottom: 24,
  },
  modalTodoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalTodoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTodoTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  modalTodoTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 28,
  },
  modalCompletedText: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  modalEditInput: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 8,
  },
  modalActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalEditButton: {
    padding: 8,
    marginRight: 8,
  },
  modalEditButtonText: {
    fontSize: 18,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseButtonText: {
    fontSize: 24,
    color: '#6b7280',
    fontWeight: '300',
  },
  modalStatusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalStatusBadge: {
    backgroundColor: '#fef3c7',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modalCompletedBadge: {
    backgroundColor: '#d1fae5',
  },
  modalStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  modalCompletedStatusText: {
    color: '#065f46',
  },
  modalToggleButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalToggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  modalDateSection: {
    gap: 12,
  },
  modalDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalDateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalDateValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  modalNoDueDateText: {
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  modalDueDateContainer: {
    alignItems: 'flex-end',
  },
  modalDueDateStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  modalEditDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalDatePickerButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  modalDatePickerButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  modalClearDateButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClearDateButtonText: {
    fontSize: 16,
    color: '#dc2626',
    fontWeight: '600',
  },
  modalActionsContainer: {
    marginTop: 8,
  },
  modalEditActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalSaveButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    flex: 1,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCancelButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 16,
    flex: 1,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  modalDeleteButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  modalDeleteButtonText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '600',
  },
});