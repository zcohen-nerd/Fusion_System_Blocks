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

var logger = window.getSystemBlocksLogger
  ? window.getSystemBlocksLogger()
  : {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {}
    };

class PythonInterface {
  constructor() {
    this.isConnected = false;
    this.messageQueue = [];
    this.pendingRequests = new Map();
    this.requestId = 0;

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
    window.receiveCADLinkFromPython = (payload) => 
      this.handleCADLinkPayload(payload);
    window.receiveImportFromPython = (responseData) => this.handleImportResponse(responseData);
    window.onPythonError = (error) => this.handlePythonError(error);

    // Handler for Python → JS async messages via palette.sendInfoToHTML().
    // With useNewWebBrowser=True, Fusion calls this instead of eval'ing scripts.
    // The Python side sends executable JS snippets as the data parameter.
    window.fusionJavaScriptHandler = (action, data) => {
      try {
        logger.debug('fusionJavaScriptHandler received:', action);
        new Function(data)();
      } catch (e) {
        logger.error('fusionJavaScriptHandler error for action ' + action + ':', e);
      }
    };
  }

  testConnection() {
    try {
      // Test if we can communicate with Python
      if (typeof adsk !== 'undefined' && typeof adsk.fusionSendData === 'function') {
        const wasDisconnected = !this.isConnected;
        this.isConnected = true;
        logger.info('Python interface connected');

        // Flush any queued messages from before connection was available
        if (wasDisconnected && this.messageQueue.length > 0) {
          logger.info(`Flushing ${this.messageQueue.length} queued message(s)`);
          const queued = [...this.messageQueue];
          this.messageQueue = [];
          queued.forEach(({ message, expectResponse }) => {
            this._sendMessageToPython(message, expectResponse);
          });
        }
      } else {
        logger.warn('Running in standalone mode - Python interface not available');
        this.isConnected = false;
      }
    } catch (error) {
      logger.warn('Python interface test failed:', error);
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

    // Retry connection check — adsk.fusionSendData may not be available
    // at page load time but becomes available after Fusion injects it.
    if (!this.isConnected) {
      this.testConnection();
    }

    if (!this.isConnected) {
      if (expectResponse) {
        return Promise.reject(new Error('Python interface not connected'));
      }

      this.messageQueue.push({ message, expectResponse: false });
      logger.debug('Message queued (no Python connection):', message);
      return Promise.resolve();
    }

    if (expectResponse) {
      return new Promise((resolve, reject) => {
        this.pendingRequests.set(message.id, { resolve, reject });
        this._sendMessageToPython(message, true);
      });
    }

    this._sendMessageToPython(message, false);
    return Promise.resolve();
  }

  _sendMessageToPython(message, expectResponse) {
    try {
      if (typeof adsk === 'undefined' || typeof adsk.fusionSendData !== 'function') {
        throw new Error('Fusion sendData bridge unavailable');
      }

      const payload = JSON.stringify(message.data ?? {});
      const result = adsk.fusionSendData(message.action, payload);

      if (expectResponse) {
        const resolvePending = (rawResponse) => {
          const pending = this.pendingRequests.get(message.id);
          if (!pending) return;
          try {
            const parsed = rawResponse ? JSON.parse(rawResponse) : {};
            pending.resolve(parsed);
          } catch (parseError) {
            pending.resolve(rawResponse);
          } finally {
            this.pendingRequests.delete(message.id);
          }
        };

        const rejectPending = (error) => {
          const pending = this.pendingRequests.get(message.id);
          if (pending) {
            pending.reject(error);
            this.pendingRequests.delete(message.id);
          }
        };

        // Fusion 360 CEF: fusionSendData may return a Promise OR the
        // response string synchronously, depending on the API version.
        if (result && typeof result.then === 'function') {
          result.then(resolvePending).catch(rejectPending);
        } else {
          // Synchronous return — resolve immediately
          resolvePending(result);
        }
      } else {
        if (result && typeof result.catch === 'function') {
          result.catch((error) => {
            logger.error('Failed to send message to Python:', error);
          });
        }
      }
    } catch (error) {
      logger.error('Failed to send message to Python:', error);
      // If we expected a response, reject the pending promise so callers
      // don't hang forever.
      if (expectResponse) {
        const pending = this.pendingRequests.get(message.id);
        if (pending) {
          pending.reject(error);
          this.pendingRequests.delete(message.id);
        }
      }
    }
  }

  // === MESSAGE HANDLERS ===

  handleLoadDiagram(jsonData) {
    try {
    logger.debug('Received diagram from Python:', jsonData);
      
      if (window.diagramEditor) {
        // Ensure jsonData is a string for importDiagram (which calls JSON.parse)
        const jsonString = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData);
        const success = window.diagramEditor.importDiagram(jsonString);
        if (success) {
          // Hide the empty-canvas placeholder when a diagram is loaded
          var emptyState = document.getElementById('empty-canvas-state');
          if (emptyState) emptyState.style.display = 'none';

          this.showNotification('Diagram loaded successfully', 'success');
        } else {
          this.showNotification('Failed to load diagram', 'error');
        }
      }
    } catch (error) {
    logger.error('Failed to handle load diagram:', error);
      this.showNotification('Error loading diagram: ' + error.message, 'error');
    }
  }

  handleCADLinkPayload(payload) {
    try {
      const data = typeof payload === 'string' ? JSON.parse(payload) : payload || {};

      if (data.success === false) {
        const message = data.error || 'CAD linking cancelled';
    logger.warn('CAD link cancelled:', message);
        this.showNotification(`CAD link cancelled: ${message}`, 'warning');
        return;
      }

      const {
        blockId,
        occToken,
        docId = '',
        docPath = '',
        componentName = '',
        metadata = {}
      } = data;

      if (!blockId || !occToken) {
        throw new Error('CAD link payload missing blockId or occToken');
      }

      this.handleCADLink(blockId, occToken, docId, docPath, componentName, metadata);
    } catch (error) {
    logger.error('Failed to process CAD link payload:', error, payload);
      this.showNotification('Error processing CAD link: ' + error.message, 'error');
    }
  }

  handleCADLink(blockId, occToken, docId, docPath, componentName = '', metadata = {}) {
    try {
    logger.debug('Received CAD link from Python:', { blockId, occToken, docId, docPath });
      
      if (window.diagramEditor) {
        const block = window.diagramEditor.diagram.blocks.find(b => b.id === blockId);
        if (block) {
          // Add CAD link to block
          if (!block.links) block.links = [];
          
          const cadLink = {
            id: 'cad_' + Date.now(),
            target: 'cad',
            occToken,
            docId,
            docPath,
            status: 'linked',
            linkedAt: new Date().toISOString(),
            metadata
          };
          
          // Remove any existing CAD link to avoid duplicates
          block.links = block.links.filter(link => link.target !== 'cad');
          block.links.push(cadLink);

          if (componentName) {
            block.attributes = block.attributes || {};
            block.attributes.linkedComponent = componentName;
          }
          
          // Update visuals
          if (window.diagramRenderer) {
            window.diagramRenderer.renderBlock(block);
          }
          if (window.toolbarManager) {
            window.toolbarManager.updateButtonStates();
          }
          
          this.showNotification(`CAD component linked to ${block.name}`, 'success');
        }
      }
    } catch (error) {
    logger.error('Failed to handle CAD link:', error);
      this.showNotification('Error linking CAD component: ' + error.message, 'error');
    }
  }

  handleImportResponse(responseData) {
    try {
    logger.debug('Received import response from Python:', responseData);
      
      if (responseData.success) {
        this.showNotification('Import completed successfully', 'success');
        
        if (responseData.diagram && window.diagramEditor) {
          window.diagramEditor.importDiagram(JSON.stringify(responseData.diagram));
        }
      } else {
        this.showNotification('Import failed: ' + responseData.error, 'error');
      }
    } catch (error) {
    logger.error('Failed to handle import response:', error);
      this.showNotification('Error processing import: ' + error.message, 'error');
    }
  }

  handlePythonError(error) {
    logger.error('Python error received:', error);
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
        if (response.success === false) {
          throw new Error(response.error || 'Load failed');
        }
        if (response.diagram) {
          this.handleLoadDiagram(response.diagram);
        } else {
          this.showNotification('No saved diagram found', 'info');
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
          // files may be a dict {format: path} or an array
          const fileCount = Array.isArray(response.files)
            ? response.files.length
            : Object.keys(response.files || {}).length;
          this.showNotification(`Reports exported: ${fileCount} files created`, 'success');
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

  // === NAMED DOCUMENT OPERATIONS ===

  listDocuments() {
    return this.sendMessage('list_documents', {}, true)
      .then(response => response.documents || [])
      .catch(() => []);
  }

  saveNamedDiagram(label) {
    if (!window.diagramEditor) return Promise.reject('No diagram editor available');
    const diagramJson = window.diagramEditor.exportDiagram();
    return this.sendMessage('save_named_diagram', { label, diagram: diagramJson }, true)
      .then(response => {
        if (response.success) {
          this.showNotification('Saved as "' + label + '"', 'success');
        } else {
          throw new Error(response.error || 'Save As failed');
        }
        return response;
      })
      .catch(error => {
        this.showNotification('Failed to save as: ' + error.message, 'error');
        throw error;
      });
  }

  loadNamedDiagram(slug) {
    return this.sendMessage('load_named_diagram', { slug }, true)
      .then(response => {
        if (response.success && response.diagram) {
          this.handleLoadDiagram(response.diagram);
        } else {
          throw new Error(response.error || 'Load failed');
        }
        return response;
      })
      .catch(error => {
        this.showNotification('Failed to open document: ' + error.message, 'error');
        throw error;
      });
  }

  deleteNamedDiagram(slug) {
    return this.sendMessage('delete_named_diagram', { slug }, true)
      .then(response => {
        if (response.success) {
          this.showNotification('Document deleted', 'info');
        }
        return response;
      })
      .catch(error => {
        this.showNotification('Failed to delete: ' + error.message, 'error');
        throw error;
      });
  }

  // === UI HELPERS ===

  showNotification(message, type = 'info') {
    logger.debug(`[${type.toUpperCase()}] ${message}`);
    
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
    logger.debug('Rule check results:', results);

    const panel = document.getElementById('rule-results');
    const hasErrors = results.some(r => r.severity === 'error');
    const hasWarnings = results.some(r => r.severity === 'warning');
    const failures = results.filter(r => !r.success);

    // Summary toast
    if (hasErrors) {
      this.showNotification(`Rule check found ${failures.length} issue(s)`, 'error');
    } else if (hasWarnings) {
      this.showNotification(`Rule check found ${failures.length} warning(s)`, 'warning');
    } else {
      this.showNotification('All rule checks passed', 'success');
    }

    // Populate detail panel
    if (!panel) return;
    panel.innerHTML = '';

    // Show the rule panel container
    var rulePanel = document.getElementById('rule-panel');
    if (rulePanel) {
      rulePanel.style.display = '';
    }

    // Clear previous highlights
    if (window.diagramRenderer) {
      window.diagramRenderer.clearConnectionHighlights();
      (window.diagramEditor || {}).diagram &&
        window.diagramEditor.diagram.blocks.forEach(b => {
          window.diagramRenderer.highlightBlock(b.id, false);
        });
    }

    if (results.length === 0) {
      panel.innerHTML = '<div class="rule-result info"><span class="rule-icon">ℹ️</span><span class="rule-message">No rules to check</span></div>';
      return;
    }

    results.forEach(result => {
      const div = document.createElement('div');
      const cls = result.success ? 'success' : (result.severity === 'error' ? 'error' : 'warning');
      div.className = 'rule-result ' + cls;

      const iconMap = { success: '✅', error: '❌', warning: '⚠️' };
      const icon = result.success ? iconMap.success : (iconMap[result.severity] || '⚠️');

      div.innerHTML =
        '<span class="rule-icon">' + icon + '</span>' +
        '<span class="rule-message">' +
          '<strong>' + (result.rule || 'check') + '</strong>: ' +
          (result.message || '') +
        '</span>';

      // Click to highlight offending blocks/connections
      const blockIds = result.blocks || [];
      const connId = result.connection || null;
      if (blockIds.length > 0 || connId) {
        div.style.cursor = 'pointer';
        div.addEventListener('click', () => {
          // Clear previous
          if (window.diagramRenderer) {
            window.diagramRenderer.clearConnectionHighlights();
            window.diagramEditor.diagram.blocks.forEach(b =>
              window.diagramRenderer.highlightBlock(b.id, false));
          }
          // Highlight relevant items
          blockIds.forEach(bid => {
            if (window.diagramRenderer) {
              window.diagramRenderer.highlightBlock(bid, true);
            }
          });
          if (connId && window.diagramRenderer) {
            window.diagramRenderer.highlightConnection(connId, true);
          }
        });
      }

      panel.appendChild(div);
    });

    // Auto-highlight errors on canvas
    failures.forEach(r => {
      (r.blocks || []).forEach(bid => {
        if (window.diagramRenderer) {
          window.diagramRenderer.highlightBlock(bid, true);
        }
      });
      if (r.connection && window.diagramRenderer) {
        window.diagramRenderer.highlightConnection(r.connection, true);
      }
    });
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
  logger.error('Sync errors:', errors);
    }
  }

  // === CONNECTION MANAGEMENT ===

  reconnect() {
    this.testConnection();
    
    if (this.isConnected && this.messageQueue.length > 0) {
  logger.debug(`Sending ${this.messageQueue.length} queued messages`);
      const queuedMessages = [...this.messageQueue];
      this.messageQueue = [];
      
      queuedMessages.forEach(({ message, expectResponse }) => {
        this._sendMessageToPython(message, expectResponse);
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