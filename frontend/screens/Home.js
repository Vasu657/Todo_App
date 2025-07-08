import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, StyleSheet, Modal, ScrollView } from 'react-native';
import axios from 'axios';
import { IP_ADDRESS } from '../ip';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Home({ navigation }) {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedTodo, setSelectedTodo] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${IP_ADDRESS}/api/todos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTodos(response.data);
    } catch (error) {
      console.error('Fetch todos error:', error.message);
      Alert.alert('Error', 'Failed to fetch todos');
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
    } catch (error) {
      console.error('Add todo error:', error.message);
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
      setTodos(todos.map(todo => 
        todo.id === id ? response.data : todo
      ));
      setSelectedTodo(response.data);
      setIsEditing(false);
      setEditTitle('');
      setEditDueDate('');
    } catch (error) {
      console.error('Update todo error:', error.message);
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
  };

  const startEditing = () => {
    setIsEditing(true);
    setEditTitle(selectedTodo.title);
    setEditDueDate(selectedTodo.due_date || '');
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditTitle('');
    setEditDueDate('');
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

  const deleteTodo = async (id) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.delete(`${IP_ADDRESS}/api/todos/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTodos(todos.filter((todo) => todo.id !== id));
    } catch (error) {
      console.error('Delete todo error:', error.message);
      Alert.alert('Error', 'Failed to delete todo');
    }
  };

  const openMenu = () => {
    console.log('Menu button clicked, opening sidebar');
    navigation.openDrawer();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={openMenu} style={styles.menuButton}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Todo App</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>My Todos</Text>
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => setShowAddForm(!showAddForm)}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        
        {showAddForm && (
          <View style={styles.addForm}>
            <TextInput
              style={styles.input}
              placeholder="Add a todo..."
              value={title}
              onChangeText={setTitle}
              placeholderTextColor="#888"
            />
            <TextInput
              style={styles.input}
              placeholder="Due date (YYYY-MM-DD)"
              value={dueDate}
              onChangeText={setDueDate}
              placeholderTextColor="#888"
            />
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
                  {item.due_date && (
                    <Text style={[styles.dateText, styles.dueDateText]}>
                      Due: {formatDate(item.due_date)}
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
        />
      </View>

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
          <View style={styles.modalContent}>
            <View style={styles.modalHandle}>
              <View style={styles.modalHandleBar} />
            </View>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditing ? 'Edit Todo' : 'Todo Details'}
              </Text>
              <View style={styles.headerButtons}>
                {!isEditing && (
                  <TouchableOpacity onPress={startEditing} style={styles.editButtonContainer}>
                    <Text style={styles.editButton}>✏️</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={closeTodoDetail} style={styles.closeButtonContainer}>
                  <Text style={styles.closeButton}>×</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {selectedTodo && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Title</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.editInput}
                      value={editTitle}
                      onChangeText={setEditTitle}
                      placeholder="Enter todo title"
                      placeholderTextColor="#888"
                    />
                  ) : (
                    <View style={styles.detailValueContainer}>
                      <Text style={styles.detailValue}>{selectedTodo.title}</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={styles.statusContainer}>
                    <View style={[styles.statusBadge, selectedTodo.completed && styles.completedBadge]}>
                      <Text style={[styles.statusText, selectedTodo.completed && styles.completedStatusText]}>
                        {selectedTodo.completed ? '✓ Completed' : '○ Pending'}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => toggleTodo(selectedTodo.id)}
                      style={styles.toggleButton}
                    >
                      <Text style={styles.toggleButtonText}>
                        {selectedTodo.completed ? 'Mark Pending' : 'Mark Complete'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Created</Text>
                  <View style={styles.detailValueContainer}>
                    <Text style={styles.detailValue}>
                      {formatDate(selectedTodo.created_at)} at {formatTime(selectedTodo.created_at)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Due Date</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.editInput}
                      value={editDueDate}
                      onChangeText={setEditDueDate}
                      placeholder="Due date (YYYY-MM-DD)"
                      placeholderTextColor="#888"
                    />
                  ) : (
                    <View style={styles.detailValueContainer}>
                      <Text style={[styles.detailValue, styles.dueDateValue]}>
                        {selectedTodo.due_date ? formatDate(selectedTodo.due_date) : 'No due date'}
                      </Text>
                    </View>
                  )}
                </View>
                
                {isEditing && (
                  <View style={styles.editButtonsContainer}>
                    <TouchableOpacity 
                      style={styles.saveEditButton}
                      onPress={saveEdit}
                    >
                      <Text style={styles.saveEditButtonText}>💾 Save </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.cancelEditButton}
                      onPress={cancelEditing}
                    >
                      <Text style={styles.cancelEditButtonText}>❌ Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                {!isEditing && (
                  <TouchableOpacity 
                    style={styles.deleteButton}
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
                    <Text style={styles.deleteButtonText}>🗑️ Delete Todo</Text>
                  </TouchableOpacity>
                )}
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
  },
  content: {
    flex: 1,
    padding: 24,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
  },
  addButton: {
    backgroundColor: '#2563eb',
    borderRadius: 50,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
  },
  addForm: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
  },
  todoItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedTodo: {
    backgroundColor: '#dcfce7',
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  todoContent: {
    flex: 1,
  },
  todoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  todoText: {
    fontSize: 16,
    color: '#1f2937',
    flex: 1,
    fontWeight: '500',
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#6b7280',
  },
  checkButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  checkedButton: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  checkText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  todoMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 12,
    color: '#6b7280',
  },
  dueDateText: {
    color: '#dc2626',
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '50%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 20,
  },
  modalHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButtonContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  editButton: {
    fontSize: 16,
    color: '#2563eb',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
  },
  closeButtonContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    fontSize: 24,
    color: '#6b7280',
    fontWeight: '400',
  },
  modalBody: {
    padding: 24,
    paddingTop: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValueContainer: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailValue: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 24,
    fontWeight: '500',
  },
  dueDateValue: {
    color: '#dc2626',
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  completedBadge: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  statusText: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '600',
  },
  completedStatusText: {
    color: '#047857',
  },
  toggleButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  editInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 48,
  },
  editButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  saveEditButton: {
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
  saveEditButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelEditButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cancelEditButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
});