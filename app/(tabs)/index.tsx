import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { loadFromSQL, logRepository } from '../../repositories/logRepository';
import { Log, NewLog } from '../../services/api';
import { wsService } from '../../services/websocket';

export default function MainScreen() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLog, setNewLog] = useState<NewLog>({
    date: '',
    amount: 0,
    type: '',
    category: '',
    description: '',
  });

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await logRepository.getLogs();
      setLogs(result.data);
      setIsOffline(result.isOffline);
      if (result.isOffline) {
        showMessage({
          message: 'Offline',
          description: 'Showing cached data. Pull to retry.',
          type: 'warning',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('[UI] Error loading logs:', error);
      showMessage({
        message: 'Error',
        description: 'Failed to load logs',
        type: 'danger',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Load from SQL on app start
  const loadFromDatabase = useCallback(async () => {
    const cached = await loadFromSQL();
    if (cached) {
      setLogs(cached);
      setIsOffline(true);
    }
  }, []);

  useEffect(() => {
    // Load from SQL first, then try to fetch from server
    loadFromDatabase().then(() => {
      loadLogs();
    });
    wsService.connect();

    const unsubscribe = wsService.subscribe((log) => {
      showMessage({
        message: 'New Log',
        description: `${log.type} - ${log.category}: ${log.amount} calories`,
        type: 'success',
        duration: 3000,
      });
      logRepository.addToCache(log);
      setLogs((prev) => {
        if (prev.find((l) => l.id === log.id)) return prev;
        return [...prev, log];
      });
    });

    return () => {
      unsubscribe();
    };
  }, [loadLogs, loadFromDatabase]);

  const handleSelectLog = async (id: number) => {
    setDetailLoading(true);
    try {
      const log = await logRepository.getLog(id);
      setSelectedLog(log);
    } catch (error) {
      console.error('[UI] Error loading log details:', error);
      showMessage({
        message: 'Error',
        description: 'Failed to load log details',
        type: 'danger',
        duration: 3000,
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteLog = async (id: number) => {
    // Block deletion if offline
    if (isOffline) {
      showMessage({
        message: 'Error',
        description: 'Cannot delete log while offline. Please connect to the server.',
        type: 'danger',
        duration: 3000,
      });
      return;
    }

    setLoading(true);
    try {
      await logRepository.deleteLog(id);
      setLogs((prev) => prev.filter((l) => l.id !== id));
      setSelectedLog(null);
      showMessage({
        message: 'Success',
        description: 'Log deleted successfully',
        type: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('[UI] Error deleting log:', error);
      showMessage({
        message: 'Error',
        description: 'Failed to delete log. Online only.',
        type: 'danger',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddLog = async () => {
    if (!newLog.date || !newLog.amount || !newLog.type) {
      showMessage({
        message: 'Error',
        description: 'Please fill required fields (date, amount, type)',
        type: 'danger',
        duration: 3000,
      });
      return;
    }

    // Block creation if offline
    if (isOffline) {
      showMessage({
        message: 'Error',
        description: 'Cannot create log while offline. Please connect to the server.',
        type: 'danger',
        duration: 3000,
      });
      return;
    }

    setLoading(true);
    try {
      const createdLog = await logRepository.createLog(newLog);
      // Close modal and reset form
      setShowAddModal(false);
      setNewLog({ date: '', amount: 0, type: '', category: '', description: '' });
      // Add the new log to state (it's already saved to SQL by createLog)
      setLogs((prev) => {
        if (prev.find((l) => l.id === createdLog.id)) return prev;
        return [...prev, createdLog];
      });
      showMessage({
        message: 'Success',
        description: 'Log created successfully',
        type: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('[UI] Error creating log:', error);
      showMessage({
        message: 'Error',
        description: 'Failed to create log. Online only.',
        type: 'danger',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Log }) => (
    <TouchableOpacity style={styles.item} onPress={() => handleSelectLog(item.id)}>
      <View style={styles.itemRow}>
        <Text style={styles.itemTitle}>{item.type}</Text>
        <Text style={styles.amount}>{item.amount} cal</Text>
      </View>
      <Text style={styles.category}>{item.category}</Text>
      <Text style={styles.date}>{item.date}</Text>
      {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calorie Logs</Text>
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Offline Mode - Showing cached data</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadLogs}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && <ActivityIndicator size="large" style={styles.loader} />}

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        refreshing={loading}
        onRefresh={loadLogs}
        ListEmptyComponent={<Text style={styles.empty}>No logs</Text>}
      />

      <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
        <Text style={styles.addButtonText}>+ Add</Text>
      </TouchableOpacity>

      {/* Detail Modal */}
      <Modal visible={selectedLog !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {detailLoading ? (
              <ActivityIndicator size="large" />
            ) : selectedLog ? (
              <>
                <Text style={styles.modalTitle}>Log Details</Text>
                <Text style={styles.detailText}>ID: {selectedLog.id}</Text>
                <Text style={styles.detailText}>Date: {selectedLog.date}</Text>
                <Text style={styles.detailText}>Type: {selectedLog.type}</Text>
                <Text style={styles.detailText}>Amount: {selectedLog.amount} calories</Text>
                <Text style={styles.detailText}>Category: {selectedLog.category}</Text>
                <Text style={styles.detailText}>Description: {selectedLog.description || 'N/A'}</Text>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.deleteButton]}
                    onPress={() => handleDeleteLog(selectedLog.id)}
                  >
                    <Text style={styles.buttonText}>Delete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.closeButton]}
                    onPress={() => setSelectedLog(null)}
                  >
                    <Text style={styles.buttonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Add Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Log</Text>
            <TextInput
              style={styles.input}
              placeholder="Date (YYYY-MM-DD)"
              value={newLog.date}
              onChangeText={(text) => setNewLog({ ...newLog, date: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Amount (calories)"
              keyboardType="numeric"
              value={newLog.amount ? newLog.amount.toString() : ''}
              onChangeText={(text) => setNewLog({ ...newLog, amount: parseFloat(text) || 0 })}
            />
            <TextInput
              style={styles.input}
              placeholder="Type (intake/burn)"
              value={newLog.type}
              onChangeText={(text) => setNewLog({ ...newLog, type: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Category (e.g., lunch, running)"
              value={newLog.category}
              onChangeText={(text) => setNewLog({ ...newLog, category: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Description"
              value={newLog.description}
              onChangeText={(text) => setNewLog({ ...newLog, description: text })}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleAddLog}>
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.closeButton]} onPress={() => setShowAddModal(false)}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, marginTop: 40 },
  itemTitle: { fontSize: 16, fontWeight: '500' },
  offlineBanner: {
    backgroundColor: '#ffcc00',
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 8,
  },
  offlineText: { flex: 1, fontSize: 14, fontWeight: '500' },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 12,
  },
  retryButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  loader: { marginVertical: 16 },
  item: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: 16, fontWeight: 'bold', color: '#007AFF' },
  category: { fontSize: 14, color: '#666', marginTop: 4 },
  date: { fontSize: 12, color: '#666', marginTop: 4 },
  description: { fontSize: 12, color: '#999', marginTop: 4, fontStyle: 'italic' },
  empty: { textAlign: 'center', marginTop: 32, color: '#666' },
  addButton: { position: 'absolute', bottom: 32, right: 16, backgroundColor: '#007AFF', padding: 16, borderRadius: 8 },
  addButtonText: { color: '#fff', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  modalContent: { backgroundColor: '#fff', borderRadius: 8, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  detailText: { fontSize: 16, marginBottom: 8 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  modalButton: { flex: 1, padding: 12, borderRadius: 8, marginHorizontal: 4 },
  deleteButton: { backgroundColor: '#ff3b30' },
  closeButton: { backgroundColor: '#666' },
  saveButton: { backgroundColor: '#34c759' },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 12 },
});
