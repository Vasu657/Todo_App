import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Modal, ScrollView, Alert, Image } from 'react-native';
import { Calendar } from 'react-native-calendars';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IP_ADDRESS } from '../ip';
import { useAppContext } from '../App';

export default function CalendarPage({ navigation }) {
  const { refreshTrigger, triggerRefresh, updateCurrentRoute } = useAppContext();
  const [todos, setTodos] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedTodo, setSelectedTodo] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    fetchTodos();
    fetchProfile();
    updateCurrentRoute('Calendar');
  }, [selectedDate]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchTodos();
      fetchProfile();
    }
  }, [refreshTrigger]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      updateCurrentRoute('Calendar');
    });
    return unsubscribe;
  }, [navigation, updateCurrentRoute]);

  const fetchTodos = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token found');
        return;
      }

     // console.log('Fetching todos for created date:', selectedDate);
      const response = await axios.get(`${IP_ADDRESS}/api/todos/created/${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
 //     console.log('Todos fetched:', response.data);
      setTodos(response.data);

      const allTodosResponse = await axios.get(`${IP_ADDRESS}/api/todos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
  //    console.log('All todos fetched:', allTodosResponse.data);
      const marked = {};
      allTodosResponse.data.forEach(todo => {
        if (todo.created_at) {
          const date = new Date(todo.created_at).toISOString().split('T')[0];
          marked[date] = {
            marked: true,
            dotColor: todo.completed ? '#10b981' : '#ef4444',
          };
        }
      });
      marked[selectedDate] = { ...marked[selectedDate], selected: true, selectedColor: '#2563eb' };
      setMarkedDates(marked);
    } catch (error) {
      console.error('Fetch todos error:', error.message, error.response?.data);
      Alert.alert('Error', 'Failed to fetch todos');
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

  const toggleTodo = async (id) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.put(
        `${IP_ADDRESS}/api/todos/${id}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTodos(todos.map(todo => 
        todo.id === id ? response.data : todo
      ));
      if (selectedTodo && selectedTodo.id === id) {
        setSelectedTodo(response.data);
      }
      triggerRefresh();
      fetchTodos();
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle todo');
    }
  };

  const deleteTodo = async (id) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.delete(`${IP_ADDRESS}/api/todos/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTodos(todos.filter((todo) => todo.id !== id));
      triggerRefresh();
      fetchTodos();
    } catch (error) {
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
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No creation date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const onDayPress = (day) => {
    const newDate = day.dateString;
  //  console.log('Selected created date:', newDate);
    setSelectedDate(newDate);
  };

  const openMenu = () => {
    navigation.openDrawer();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={openMenu} style={styles.menuButton}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calendar</Text>
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
      
      <View style={styles.content}>
        <Calendar
          onDayPress={onDayPress}
          markedDates={markedDates}
          style={styles.calendar}
          theme={{
            backgroundColor: '#ffffff',
            calendarBackground: '#ffffff',
            textSectionTitleColor: '#6b7280',
            selectedDayBackgroundColor: '#2563eb',
            selectedDayTextColor: '#ffffff',
            todayTextColor: '#2563eb',
            dayTextColor: '#111827',
            textDisabledColor: '#d1d5db',
            dotColor: '#ef4444',
            selectedDotColor: '#ffffff',
            arrowColor: '#2563eb',
            monthTextColor: '#111827',
            indicatorColor: '#2563eb',
            textDayFontWeight: '400',
            textMonthFontWeight: '600',
            textDayHeaderFontWeight: '500',
          }}
        />
        
        <View style={styles.todoContainer}>
          <Text style={styles.dateTitle}>{formatDate(selectedDate)}</Text>
          {todos.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No todos created on this date</Text>
            </View>
          ) : (
            <FlatList
              data={todos}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.todoItem, item.completed && styles.completedTodo]}
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
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.list}
            />
          )}
        </View>
      </View>

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
            <View style={styles.modalHandle}>
              <View style={styles.modalHandleBar} />
            </View>
            {selectedTodo && (
              <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.modalTodoCard}>
                  <View style={styles.modalTodoHeader}>
                    <View style={styles.modalTodoTitleContainer}>
                      <Text style={[styles.modalTodoTitle, selectedTodo.completed && styles.modalCompletedText]}>
                        {selectedTodo.title}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={closeTodoDetail} style={styles.modalCloseButton}>
                      <Text style={styles.modalCloseButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
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
                  <View style={styles.modalDateSection}>
                    <View style={styles.modalDateRow}>
                      <Text style={styles.modalDateLabel}>Created:</Text>
                      <Text style={styles.modalDateValue}>
                        {formatDate(selectedTodo.created_at)}
                      </Text>
                    </View>
                    <View style={styles.modalDateRow}>
                      <Text style={styles.modalDateLabel}>Due Date:</Text>
                      <Text style={[styles.modalDateValue, !selectedTodo.due_date && styles.modalNoDueDateText]}>
                        {formatDate(selectedTodo.due_date)}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.modalActionsContainer}>
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
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  calendar: {
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  todoContainer: {
    flex: 1,
  },
  dateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  todoItem: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    minHeight: 60,
  },
  completedTodo: {
    backgroundColor: '#fafafa',
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  todoContent: {
    flex: 1,
    justifyContent: 'center',
  },
  todoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  todoText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
    fontWeight: '400',
    lineHeight: 22,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
    fontWeight: '300',
  },
  checkButton: {
    width: 24,
    height: 24,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
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
    fontSize: 12,
    fontWeight: '600',
  },
  todoMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  dateText: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '400',
  },
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
    color: '#6b7280',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 20,
    color: '#6b7280',
    fontWeight: '300',
  },
  modalStatusSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalStatusBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  modalCompletedBadge: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  modalStatusText: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '600',
  },
  modalCompletedStatusText: {
    color: '#047857',
  },
  modalToggleButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalToggleButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
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
    color: '#6b7280',
    fontWeight: '500',
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
  modalActionsContainer: {
    paddingHorizontal: 4,
  },
  modalDeleteButton: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modalDeleteButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});