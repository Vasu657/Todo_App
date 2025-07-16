import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, StyleSheet, Modal, ScrollView, Platform, BackHandler, Image } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { IP_ADDRESS } from '../ip';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppContext } from '../App';

export default function Home({ navigation }) {
  const { refreshTrigger, triggerRefresh, updateCurrentRoute } = useAppContext();
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedTodo, setSelectedTodo] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  
  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editSelectedDate, setEditSelectedDate] = useState(new Date());
  
  // Selection mode states
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTodos, setSelectedTodos] = useState([]);
  
  // Auto-sliding welcome card state
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // User profile state
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    fetchTodos();
    fetchProfile();
    updateCurrentRoute('Home'); // Update current route when Home mounts
  }, []);

  // Auto-refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchTodos();
      fetchProfile();
    }
  }, [refreshTrigger]);

  // Update current route when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      updateCurrentRoute('Home');
    });

    return unsubscribe;
  }, [navigation, updateCurrentRoute]);

  useEffect(() => {
    const backAction = () => {
      if (isSelectionMode) {
        exitSelectionMode();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isSelectionMode]);

  // Auto-sliding effect for welcome card
  useEffect(() => {
    if (!isSelectionMode) {
      const interval = setInterval(() => {
        setCurrentSlide((prevSlide) => (prevSlide + 1) % 3);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isSelectionMode]);

  const fetchTodos = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${IP_ADDRESS}/api/todos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTodos(response.data);
    } catch (error) {
      //console.error('Fetch todos error:', error.message);
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
      // Silent fail for profile fetch
      console.error('Fetch profile error:', error.message);
    }
  };

  const addTodo = async () => {
    if (!title.trim()) return;
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post(
        `${IP_ADDRESS}/api/todos`,
        { title, due_date: dueDate || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTodos([response.data, ...todos]);
      setTitle('');
      setDueDate('');
      setShowAddForm(false);
      triggerRefresh(); // Trigger refresh across all components
    } catch (error) {
      //console.error('Add todo error:', error.message);
      Alert.alert('Error', 'Failed to add todo');
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
      // Update selected todo if it's the one being toggled
      if (selectedTodo && selectedTodo.id === id) {
        setSelectedTodo(response.data);
      }
      triggerRefresh(); // Trigger refresh across all components
    } catch (error) {
      //console.error('Toggle todo error:', error.message);
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
      setTodos(todos.map(todo => 
        todo.id === id ? response.data : todo
      ));
      setSelectedTodo(response.data);
      setIsEditing(false);
      setEditTitle('');
      setEditDueDate('');
      triggerRefresh(); // Trigger refresh across all components
    } catch (error) {
      //console.error('Update todo error:', error.message);
      Alert.alert('Error', 'Failed to update todo');
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

  // Date picker handlers
  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || new Date();
    setShowDatePicker(Platform.OS === 'ios');
    setSelectedDate(currentDate);
    
    if (event.type === 'set') {
      const formattedDate = currentDate.toISOString().split('T')[0];
      setDueDate(formattedDate);
    }
  };

  const onEditDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || new Date();
    setShowEditDatePicker(Platform.OS === 'ios');
    setEditSelectedDate(currentDate);
    
    if (event.type === 'set') {
      const formattedDate = currentDate.toISOString().split('T')[0];
      setEditDueDate(formattedDate);
    }
  };

  const showDatePickerModal = () => {
    if (dueDate) {
      setSelectedDate(new Date(dueDate));
    }
    setShowDatePicker(true);
  };

  const showEditDatePickerModal = () => {
    if (editDueDate) {
      setEditSelectedDate(new Date(editDueDate));
    } else {
      setEditSelectedDate(new Date());
    }
    setShowEditDatePicker(true);
  };

  const clearDueDate = () => {
    setDueDate('');
    setSelectedDate(new Date());
  };

  const clearEditDueDate = () => {
    setEditDueDate('');
    setEditSelectedDate(new Date());
  };

  // Selection mode functions
  const enterSelectionMode = (todoId) => {
    setIsSelectionMode(true);
    setSelectedTodos([todoId]);
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedTodos([]);
  };

  const toggleTodoSelection = (todoId) => {
    if (selectedTodos.includes(todoId)) {
      const newSelected = selectedTodos.filter(id => id !== todoId);
      setSelectedTodos(newSelected);
      if (newSelected.length === 0) {
        setIsSelectionMode(false);
      }
    } else {
      setSelectedTodos([...selectedTodos, todoId]);
    }
  };

  const selectAllTodos = () => {
    if (selectedTodos.length === todos.length) {
      setSelectedTodos([]);
      setIsSelectionMode(false);
    } else {
      setSelectedTodos(todos.map(todo => todo.id));
    }
  };

  const deleteSelectedTodos = async () => {
    if (selectedTodos.length === 0) return;
    
    Alert.alert(
      'Delete Todos',
      `Are you sure you want to delete ${selectedTodos.length} todo${selectedTodos.length > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              
              // Delete all selected todos
              await Promise.all(
                selectedTodos.map(id => 
                  axios.delete(`${IP_ADDRESS}/api/todos/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  })
                )
              );
              
              // Update the todos list
              setTodos(todos.filter(todo => !selectedTodos.includes(todo.id)));
              exitSelectionMode();
              triggerRefresh(); // Trigger refresh across all components
            } catch (error) {
              Alert.alert('Error', 'Failed to delete todos');
            }
          }
        }
      ]
    );
  };

  const deleteTodo = async (id) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.delete(`${IP_ADDRESS}/api/todos/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTodos(todos.filter((todo) => todo.id !== id));
      triggerRefresh(); // Trigger refresh across all components
    } catch (error) {
      //console.error('Delete todo error:', error.message);
      Alert.alert('Error', 'Failed to delete todo');
    }
  };

  const openMenu = () => {
    //console.log('Menu button clicked, opening sidebar');
    navigation.openDrawer();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={openMenu} style={styles.menuButton}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Todo App</Text>
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
        {isSelectionMode ? (
          <View style={styles.selectionContainer}>
            <View style={styles.selectionHeader}>
              <TouchableOpacity onPress={exitSelectionMode} style={styles.cancelSelectionButton}>
                <Text style={styles.cancelSelectionText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.selectionTitle}>
                {selectedTodos.length} selected
              </Text>
            </View>
            <View style={styles.selectionActions}>
              <TouchableOpacity 
                style={styles.selectAllButton} 
                onPress={selectAllTodos}
              >
                <Text style={styles.selectAllText}>
                  {selectedTodos.length === todos.length ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.deleteSelectedButton, selectedTodos.length === 0 && styles.disabledButton]} 
                onPress={deleteSelectedTodos}
                disabled={selectedTodos.length === 0}
              >
                <Text style={[styles.deleteSelectedText, selectedTodos.length === 0 && styles.disabledText]}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.welcomeCard}>
            <View style={styles.slideContainer}>
              {currentSlide === 0 && (
                <View style={styles.slide}>
                  <View style={styles.slideIcon}>
                    <Text style={styles.slideIconText}>✨</Text>
                  </View>
                  <Text style={styles.slideTitle}>Welcome to Todo App</Text>
                  <Text style={styles.slideSubtitle}>Organize your life with ease</Text>
                </View>
              )}
              {currentSlide === 1 && (
                <View style={styles.slide}>
                  <View style={styles.slideIcon}>
                    <Text style={styles.slideIconText}>🎯</Text>
                  </View>
                  <Text style={styles.slideTitle}>Stay Productive</Text>
                  <Text style={styles.slideSubtitle}>Track tasks & set due dates</Text>
                </View>
              )}
              {currentSlide === 2 && (
                <View style={styles.slide}>
                  <View style={styles.slideIcon}>
                    <Text style={styles.slideIconText}>⚡</Text>
                  </View>
                  <Text style={styles.slideTitle}>Quick Actions</Text>
                  <Text style={styles.slideSubtitle}>Long press to select multiple</Text>
                </View>
              )}
            </View>
            <View style={styles.slideIndicators}>
              {[0, 1, 2].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    currentSlide === index && styles.activeIndicator,
                  ]}
                />
              ))}
            </View>
          </View>
        )}
        
        {showAddForm && (
          <View style={styles.addForm}>
            <TextInput
              style={styles.input}
              placeholder="Add a todo..."
              value={title}
              onChangeText={setTitle}
              placeholderTextColor="#888"
            />
            
            <View style={styles.datePickerContainer}>
              <Text style={styles.dateLabel}>Due Date</Text>
              <View style={styles.dateButtonRow}>
                <TouchableOpacity 
                  style={styles.datePickerButton} 
                  onPress={showDatePickerModal}
                >
                  <Text style={styles.datePickerButtonText}>
                    {dueDate ? formatDate(dueDate) : '📅 Select Date'}
                  </Text>
                </TouchableOpacity>
                {dueDate && (
                  <TouchableOpacity 
                    style={styles.clearDateButton} 
                    onPress={clearDueDate}
                  >
                    <Text style={styles.clearDateButtonText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            <View style={styles.formButtons}>
              <TouchableOpacity style={styles.saveButton} onPress={addTodo}>
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => {
                  setShowAddForm(false);
                  setTitle('');
                  setDueDate('');
                  setSelectedDate(new Date());
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        <FlatList
          data={todos}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            const isSelected = selectedTodos.includes(item.id);
            return (
              <TouchableOpacity 
                style={[
                  styles.todoItem, 
                  item.completed && styles.completedTodo,
                  isSelected && styles.selectedTodo,
                  isSelectionMode && styles.selectionModeTodo
                ]}
                onPress={() => {
                  if (isSelectionMode) {
                    toggleTodoSelection(item.id);
                  } else {
                    openTodoDetail(item);
                  }
                }}
                onLongPress={() => {
                  if (!isSelectionMode) {
                    enterSelectionMode(item.id);
                  }
                }}
                delayLongPress={500}
              >
                {isSelectionMode && (
                  <View style={styles.selectionCheckbox}>
                    <View style={[styles.checkbox, isSelected && styles.checkedCheckbox]}>
                      {isSelected && <Text style={styles.checkboxText}>✓</Text>}
                    </View>
                  </View>
                )}
                <View style={[styles.todoContent, isSelectionMode && styles.todoContentSelection]}>
                  <View style={styles.todoHeader}>
                    <Text style={[styles.todoText, item.completed && styles.completedText]}>
                      {item.title}
                    </Text>
                    {!isSelectionMode && (
                      <TouchableOpacity 
                        onPress={() => toggleTodo(item.id)}
                        style={[styles.checkButton, item.completed && styles.checkedButton]}
                      >
                        <Text style={styles.checkText}>
                          {item.completed ? '✓' : '○'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.todoMeta}>
                    <Text style={styles.dateText}>
                      Created: {formatDate(item.created_at)}
                    </Text>
                    {item.due_date && (
                      <Text style={[styles.dateText, styles.dueDateText]}>
                        Due: {formatDate(item.due_date)}
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.list}
        />
      </View>

      {/* Notification Banner */}
      <NotificationBanner 
        todos={todos} 
        onDismiss={() => {/* Handle dismiss */}} 
        onViewOverdue={() => {/* Handle view overdue */}}
      />

      {/* Floating Add Button */}
      {!isSelectionMode && (
        <TouchableOpacity 
          style={styles.floatingAddButton} 
          onPress={() => {
            if (isSelectionMode) {
              exitSelectionMode();
            }
            setShowAddForm(!showAddForm);
          }}
        >
          <Text style={styles.floatingAddButtonText}>+</Text>
        </TouchableOpacity>
      )}

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
                        <Text style={[styles.modalDateValue, !selectedTodo.due_date && styles.modalNoDueDateText]}>
                          {selectedTodo.due_date ? formatDate(selectedTodo.due_date) : 'No due date'}
                        </Text>
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

      {/* Date Pickers */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}

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
    paddingBottom: 16,
  },
  // Welcome Card Styles
  welcomeCard: {
    backgroundColor: '#ffffff',
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  slideContainer: {
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  slideIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  slideIconText: {
    fontSize: 24,
  },
  slideTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  slideSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  slideIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d1d5db',
    opacity: 0.6,
  },
  activeIndicator: {
    backgroundColor: '#2563eb',
    opacity: 1,
    width: 20,
    borderRadius: 3,
  },
  // Selection Container
  selectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  // Floating Add Button
  floatingAddButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#2563eb',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  floatingAddButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '300',
    lineHeight: 24,
  },
  addForm: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginBottom: 16,
    borderTopWidth: 2,
    borderTopColor: '#2563eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  input: {
    backgroundColor: '#fafafa',
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
    color: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    marginTop: 8,
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
  dueDateText: {
    color: '#ef4444',
    fontWeight: '500',
    fontSize: 11,
  },
  // Modal Styles - Todo Card Design
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
  modalEditInput: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 28,
    padding: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  modalActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalEditButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalEditButtonText: {
    fontSize: 16,
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
  modalEditDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalDatePickerButton: {
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalDatePickerButtonText: {
    fontSize: 14,
    color: '#111827',
  },
  modalClearDateButton: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  modalClearDateButtonText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
  },
  modalActionsContainer: {
    paddingHorizontal: 4,
  },
  modalEditActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalSaveButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modalSaveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCancelButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalCancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
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
  // Date Picker Styles
  datePickerContainer: {
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  datePickerButton: {
    backgroundColor: '#fafafa',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flex: 1,
    marginRight: 12,
  },
  datePickerButtonText: {
    fontSize: 16,
    color: '#111827',
    textAlign: 'left',
  },
  clearDateButton: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
    width: 44,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearDateButtonText: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
  },
  editDatePickerContainer: {
    marginBottom: 8,
  },
  editDatePickerButton: {
    backgroundColor: '#fafafa',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flex: 1,
    marginRight: 12,
  },
  editDatePickerButtonText: {
    fontSize: 16,
    color: '#111827',
    textAlign: 'left',
  },
  clearEditDateButton: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
    width: 44,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearEditDateButtonText: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
  },
  // Selection Mode Styles
  selectedTodo: {
    backgroundColor: '#eff6ff',
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
  },
  selectionModeTodo: {
    paddingLeft: 8,
  },
  selectionCheckbox: {
    paddingRight: 12,
    justifyContent: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  checkedCheckbox: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkboxText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  todoContentSelection: {
    flex: 1,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cancelSelectionButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cancelSelectionText: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: '400',
  },
  selectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#111827',
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  selectAllText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  deleteSelectedButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#dc2626',
  },
  deleteSelectedText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  disabledText: {
    color: '#9ca3af',
  },
});