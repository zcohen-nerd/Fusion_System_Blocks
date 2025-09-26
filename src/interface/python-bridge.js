/**
 * PYTHON INTERFACE MODULE
 * 
 * Handles all communication with the Python backend including:
 * - Message sending/receiving
 * - Event handling from Python
 * - Data synchronization
 * - Error handling and retry logic
 * 
 * Author: GitHub Copilot
 * Created: September 26, 2025
 * Module: Python Interface
 */

class PythonInterface {
  constructor() {
    this.isConnected = false;
    this.messageQueue = [];
    this.pendingRequests = new Map();
    this.requestId = 0;
    this.retryAttempts = 3;
    this.retryDelay = 1000;
    
    this.initializeInterface();
  }

  initializeInterface() {
    this.setupGlobalFunctions();
    this.testConnection();
  }

  setupGlobalFunctions() {
    // Global functions that can be called from Python
    window.sendToPython = (action, data) => this.sendMessage(action, data);
    window.loadDiagramFromPython = (jsonData) => this.handleLoadDiagram(jsonData);
    window.receiveCADLinkFromPython = (blockId, occToken, docId, docPath) => 
      this.handleCADLink(blockId, occToken, docId, docPath);
    window.receiveImportFromPython = (responseData) => this.handleImportResponse(responseData);
    window.onPythonError = (error) => this.handlePythonError(error);
  }

  testConnection() {
    try {
      // Test if we can communicate with Python
      if (typeof adsk !== 'undefined' && adsk.core) {
        this.isConnected = true;
        console.log('Python interface connected');
      } else {
        console.warn('Running in standalone mode - Python interface not available');
        this.isConnected = false;
      }
    } catch (error) {
      console.warn('Python interface test failed:', error);
      this.isConnected = false;
    }
  }

  sendMessage(action, data = {}, expectResponse = false) {
    const message = {
      id: ++this.requestId,
      action: action,
      data: data,
      timestamp: Date.now()
    };

    if (expectResponse) {
      return new Promise((resolve, reject) => {
        this.pendingRequests.set(message.id, { resolve, reject, attempts: 0 });
        this._sendMessageToPython(message);
      });
    } else {
      this._sendMessageToPython(message);
    }
  }

  _sendMessageToPython(message) {
    try {
      if (this.isConnected) {
        // Send via Fusion 360 HTML bridge
        adsk.core.Application.get().userInterface.palettes.itemById('SystemBlocksPalette')
          .sendInfoToHTML(message.action, JSON.stringify(message.data));
      } else {
        // Queue message for when connection is available
        this.messageQueue.push(message);
        console.log('Message queued (no Python connection):', message);
      }
    } catch (error) {
      console.error('Failed to send message to Python:', error);
      this.handleSendError(message, error);
    }
  }

  handleSendError(message, error) {
    const pending = this.pendingRequests.get(message.id);
    if (pending) {
      pending.attempts++;
      
      if (pending.attempts < this.retryAttempts) {
        console.log(`Retrying message ${message.id} (attempt ${pending.attempts + 1})`);
        setTimeout(() => {
          this._sendMessageToPython(message);
        }, this.retryDelay * pending.attempts);
      } else {
        console.error(`Message ${message.id} failed after ${this.retryAttempts} attempts`);
        pending.reject(error);
        this.pendingRequests.delete(message.id);
      }
    }
  }

  // === MESSAGE HANDLERS ===

  handleLoadDiagram(jsonData) {
    try {
      console.log('Received diagram from Python:', jsonData);
      
      if (window.diagramEditor) {
        const success = window.diagramEditor.importDiagram(jsonData);
        if (success) {
          this.showNotification('Diagram loaded successfully', 'success');
        } else {
          this.showNotification('Failed to load diagram', 'error');
        }
      }
    } catch (error) {
      console.error('Failed to handle load diagram:', error);
      this.showNotification('Error loading diagram: ' + error.message, 'error');
    }
  }

  handleCADLink(blockId, occToken, docId, docPath) {
    try {
      console.log('Received CAD link from Python:', { blockId, occToken, docId, docPath });
      
      if (window.diagramEditor) {
        const block = window.diagramEditor.diagram.blocks.find(b => b.id === blockId);
        if (block) {
          // Add CAD link to block
          if (!block.links) block.links = [];
          
          const cadLink = {
            id: 'cad_' + Date.now(),
            target: 'cad',
            occurrenceToken: occToken,
            documentId: docId,
            documentPath: docPath,
            status: 'linked',
            linkedAt: new Date().toISOString()
          };
          
          block.links.push(cadLink);
          
          // Update visuals
          if (window.diagramRenderer) {
            window.diagramRenderer.renderBlock(block);
          }
          
          this.showNotification(`CAD component linked to ${block.name}`, 'success');
        }
      }
    } catch (error) {
      console.error('Failed to handle CAD link:', error);
      this.showNotification('Error linking CAD component: ' + error.message, 'error');
    }
  }

  handleImportResponse(responseData) {
    try {
      console.log('Received import response from Python:', responseData);
      
      if (responseData.success) {
        this.showNotification('Import completed successfully', 'success');
        
        if (responseData.diagram && window.diagramEditor) {
          window.diagramEditor.importDiagram(JSON.stringify(responseData.diagram));
        }
      } else {
        this.showNotification('Import failed: ' + responseData.error, 'error');
      }
    } catch (error) {
      console.error('Failed to handle import response:', error);
      this.showNotification('Error processing import: ' + error.message, 'error');
    }
  }

  handlePythonError(error) {
    console.error('Python error received:', error);
    this.showNotification('Python backend error: ' + error, 'error');
  }

  // === COMMON OPERATIONS ===

  saveDiagram() {
    if (!window.diagramEditor) return Promise.reject('No diagram editor available');
    
    const diagramJson = window.diagramEditor.exportDiagram();
    return this.sendMessage('save_diagram', { diagram: diagramJson }, true)
      .then(response => {
        if (response.success) {
          this.showNotification('Diagram saved successfully', 'success');
        } else {
          throw new Error(response.error || 'Save failed');
        }
        return response;
      })
      .catch(error => {
        this.showNotification('Failed to save diagram: ' + error.message, 'error');
        throw error;
      });
  }

  loadDiagram() {
    return this.sendMessage('load_diagram', {}, true)
      .then(response => {
        if (response.diagram) {
          this.handleLoadDiagram(response.diagram);
        }
        return response;
      })
      .catch(error => {
        this.showNotification('Failed to load diagram: ' + error.message, 'error');
        throw error;
      });
  }

  exportReports() {
    if (!window.diagramEditor) return Promise.reject('No diagram editor available');
    
    const diagramJson = window.diagramEditor.exportDiagram();
    return this.sendMessage('export_reports', { diagram: diagramJson }, true)
      .then(response => {
        if (response.success) {
          this.showNotification(`Reports exported: ${response.files.length} files created`, 'success');
        } else {
          throw new Error(response.error || 'Export failed');
        }
        return response;
      })
      .catch(error => {
        this.showNotification('Failed to export reports: ' + error.message, 'error');
        throw error;
      });
  }

  checkRules() {
    if (!window.diagramEditor) return Promise.reject('No diagram editor available');
    
    const diagramJson = window.diagramEditor.exportDiagram();
    return this.sendMessage('check_rules', { diagram: diagramJson }, true)
      .then(response => {
        if (response.success) {
          this.displayRuleResults(response.results);
        } else {
          throw new Error(response.error || 'Rule check failed');
        }
        return response;
      })
      .catch(error => {
        this.showNotification('Failed to check rules: ' + error.message, 'error');
        throw error;
      });
  }

  syncComponents() {
    if (!window.diagramEditor) return Promise.reject('No diagram editor available');
    
    const diagramJson = window.diagramEditor.exportDiagram();
    return this.sendMessage('sync_components', { diagram: diagramJson }, true)
      .then(response => {
        this.displaySyncResults(response);
        return response;
      })
      .catch(error => {
        this.showNotification('Failed to sync components: ' + error.message, 'error');
        throw error;
      });
  }

  // === UI HELPERS ===

  showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 16px',
      borderRadius: '4px',
      color: 'white',
      fontWeight: 'bold',
      zIndex: '10000',
      maxWidth: '400px',
      wordWrap: 'break-word'
    });
    
    // Set background color based on type
    const colors = {
      success: '#4CAF50',
      error: '#F44336',
      warning: '#FF9800',
      info: '#2196F3'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 4000);
  }

  displayRuleResults(results) {
    // This would display rule check results in the UI
    console.log('Rule check results:', results);
    
    const hasErrors = results.some(result => result.severity === 'error');
    const hasWarnings = results.some(result => result.severity === 'warning');
    
    if (hasErrors) {
      this.showNotification(`Rule check found ${results.length} issues`, 'error');
    } else if (hasWarnings) {
      this.showNotification(`Rule check found ${results.length} warnings`, 'warning');
    } else {
      this.showNotification('All rule checks passed', 'success');
    }
  }

  displaySyncResults(results) {
    const { total_blocks, sync_successful, sync_failed, errors } = results;
    
    if (sync_failed > 0) {
      this.showNotification(
        `Component sync: ${sync_successful} successful, ${sync_failed} failed`, 
        'warning'
      );
    } else {
      this.showNotification(
        `All ${sync_successful} components synced successfully`, 
        'success'
      );
    }
    
    if (errors.length > 0) {
      console.error('Sync errors:', errors);
    }
  }

  // === CONNECTION MANAGEMENT ===

  reconnect() {
    this.testConnection();
    
    if (this.isConnected && this.messageQueue.length > 0) {
      console.log(`Sending ${this.messageQueue.length} queued messages`);
      const queuedMessages = [...this.messageQueue];
      this.messageQueue = [];
      
      queuedMessages.forEach(message => {
        this._sendMessageToPython(message);
      });
    }
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      queuedMessages: this.messageQueue.length,
      pendingRequests: this.pendingRequests.size
    };
  }
}

// Global instance
window.pythonInterface = new PythonInterface();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PythonInterface;
} else {
  window.PythonInterface = PythonInterface;
}