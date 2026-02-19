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

function _escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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
    // Known events are routed directly by parsing JSON; unknown events fall
    // back to executing the data as a JS snippet for backward-compatibility.
    window.fusionJavaScriptHandler = (action, data) => {
      try {
        logger.debug('fusionJavaScriptHandler received:', action);

        // Route known events to their handlers directly with JSON data.
        if (action === 'cad-link') {
          try {
            const payload = typeof data === 'string' ? JSON.parse(data) : data;
            this.handleCADLinkPayload(payload);
            return;
          } catch (parseErr) {
            // Fallback: data might be executable JS (older API path)
            logger.warn('cad-link JSON parse failed, trying script exec:', parseErr);
          }
        }

        // Default: execute data as JavaScript snippet
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

        // Fusion CEF: fusionSendData may return a Promise OR the
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
          // Restore groups from the imported diagram model
          if (window.advancedFeatures && typeof window.advancedFeatures._restoreGroupsFromDiagram === 'function') {
            window.advancedFeatures._restoreGroupsFromDiagram();
          }

          // Reset undo/redo stacks so the loaded diagram becomes the
          // new baseline.  Without this, the first undo would jump
          // back to the pre-load empty canvas.
          if (window.advancedFeatures) {
            window.advancedFeatures.undoStack = [];
            window.advancedFeatures.redoStack = [];
            window.advancedFeatures.saveState('Open diagram');
          }

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
          if (window.advancedFeatures && typeof window.advancedFeatures._restoreGroupsFromDiagram === 'function') {
            window.advancedFeatures._restoreGroupsFromDiagram();
          }
          // Reset undo/redo stacks so the imported diagram is the baseline
          if (window.advancedFeatures) {
            window.advancedFeatures.undoStack = [];
            window.advancedFeatures.redoStack = [];
            window.advancedFeatures.saveState('Import diagram');
          }
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

  saveDiagram(options = {}) {
    if (!window.diagramEditor) return Promise.reject('No diagram editor available');
    const silent = options.silent || false;
    const forceFull = options.forceFull || false;

    // Try delta-save: send only the diff instead of the full diagram.
    var delta = !forceFull ? window.diagramEditor.getDelta() : null;
    if (delta !== null && delta.length > 0) {
      return this.sendMessage(BridgeAction.APPLY_DELTA, { patch: delta }, true)
        .then(response => {
          if (response.success) {
            window.diagramEditor.markSaved();
            try { localStorage.removeItem('fsb_recovery_backup'); } catch (_) {}
            if (!silent) {
              this.showNotification('Diagram saved (delta)', 'success');
            }
          } else {
            // Delta failed — fall back to full save
            logger.warn('Delta save failed, falling back to full save:', response.error);
            return this.saveDiagram({ silent: silent, forceFull: true });
          }
          return response;
        })
        .catch(error => {
          logger.warn('Delta save error, falling back to full save:', error);
          return this.saveDiagram({ silent: silent, forceFull: true });
        });
    }

    // Full save (initial save, or delta unavailable/forced)
    const diagramJson = window.diagramEditor.exportDiagram();
    return this.sendMessage(BridgeAction.SAVE_DIAGRAM, { diagram: diagramJson }, true)
      .then(response => {
        if (response.success) {
          window.diagramEditor.markSaved();
          try { localStorage.removeItem('fsb_recovery_backup'); } catch (_) {}
          if (!silent) {
            this.showNotification('Diagram saved successfully', 'success');
          }
        } else {
          throw new Error(response.error || 'Save failed');
        }
        return response;
      })
      .catch(error => {
        if (!silent) {
          this.showNotification('Failed to save diagram: ' + error.message, 'error');
        }
        throw error;
      });
  }

  loadDiagram() {
    if (window.showLoadingSpinner) window.showLoadingSpinner('Loading diagram\u2026');
    return this.sendMessage(BridgeAction.LOAD_DIAGRAM, {}, true)
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
      })
      .finally(() => { if (window.hideLoadingSpinner) window.hideLoadingSpinner(); });
  }

  exportReports(formats, outputPath) {
    if (!window.diagramEditor) return Promise.reject(new Error('No diagram editor available'));
    
    const diagramJson = window.diagramEditor.exportDiagram();
    if (!diagramJson) {
      return Promise.reject(new Error('Diagram data is empty'));
    }

    const payload = { diagram: diagramJson };

    // Pass selected formats (array of keys) if provided
    if (Array.isArray(formats) && formats.length > 0) {
      payload.formats = formats;
    }

    // Pass custom output path if user chose one via Browse
    if (outputPath) {
      payload.outputPath = outputPath;
    }

    logger.debug('Export payload keys:', Object.keys(payload),
      'formats:', formats, 'outputPath:', outputPath);

    return this.sendMessage(BridgeAction.EXPORT_REPORTS, payload, true)
      .then(response => {
        logger.debug('Export response:', response);
        if (response && response.success) {
          // files may be a dict {format: path} or an array
          const fileCount = Array.isArray(response.files)
            ? response.files.length
            : Object.keys(response.files || {}).length;
          const path = response.path || '';
          this.showNotification(
            `Exported ${fileCount} file${fileCount !== 1 ? 's' : ''} to ${path}`,
            'success'
          );
        } else if (response && response.error) {
          throw new Error(response.error);
        } else {
          // Response was empty or malformed — likely a bridge issue
          logger.error('Export: unexpected response shape:', response);
          throw new Error(
            'No response from Python — check the Fusion Text Commands log'
          );
        }
        return response;
      })
      .catch(error => {
        const msg = error && error.message ? error.message : String(error);
        this.showNotification('Export failed: ' + msg, 'error');
        throw error;
      });
  }

  checkRules() {
    if (!window.diagramEditor) return Promise.reject('No diagram editor available');
    if (window.showLoadingSpinner) window.showLoadingSpinner('Running rule checks\u2026');
    
    const diagramJson = window.diagramEditor.exportDiagram();
    return this.sendMessage(BridgeAction.CHECK_RULES, { diagram: diagramJson }, true)
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
      })
      .finally(() => { if (window.hideLoadingSpinner) window.hideLoadingSpinner(); });
  }

  syncComponents() {
    if (!window.diagramEditor) return Promise.reject('No diagram editor available');
    if (window.showLoadingSpinner) window.showLoadingSpinner('Syncing components\u2026');
    
    const diagramJson = window.diagramEditor.exportDiagram();
    return this.sendMessage(BridgeAction.SYNC_COMPONENTS, { diagram: diagramJson }, true)
      .then(response => {
        this.displaySyncResults(response);
        return response;
      })
      .catch(error => {
        this.showNotification('Failed to sync components: ' + error.message, 'error');
        throw error;
      })
      .finally(() => { if (window.hideLoadingSpinner) window.hideLoadingSpinner(); });
  }

  // === NAMED DOCUMENT OPERATIONS ===

  listDocuments() {
    return this.sendMessage(BridgeAction.LIST_DOCUMENTS, {}, true)
      .then(response => response.documents || [])
      .catch(() => []);
  }

  saveNamedDiagram(label) {
    if (!window.diagramEditor) return Promise.reject('No diagram editor available');
    const diagramJson = window.diagramEditor.exportDiagram();
    return this.sendMessage(BridgeAction.SAVE_NAMED_DIAGRAM, { label, diagram: diagramJson }, true)
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
    if (window.showLoadingSpinner) window.showLoadingSpinner('Opening document\u2026');
    return this.sendMessage(BridgeAction.LOAD_NAMED_DIAGRAM, { slug }, true)
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
      })
      .finally(() => { if (window.hideLoadingSpinner) window.hideLoadingSpinner(); });
  }

  deleteNamedDiagram(slug) {
    return this.sendMessage(BridgeAction.DELETE_NAMED_DIAGRAM, { slug }, true)
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

  // === REQUIREMENTS & VERSION CONTROL (Issue #31) ===

  /**
   * Validate all requirements on the current diagram.
   * @returns {Promise<Array>} Array of requirement result objects.
   */
  validateRequirements() {
    if (!window.diagramEditor) return Promise.reject('No diagram editor available');
    const diagramJson = window.diagramEditor.exportDiagram();
    return this.sendMessage(BridgeAction.VALIDATE_REQUIREMENTS, { diagram: diagramJson }, true)
      .then(response => {
        if (response.success) {
          return response.results || [];
        }
        throw new Error(response.error || 'Validation failed');
      });
  }

  /**
   * Create a version-control snapshot of the current diagram.
   * @param {string} [description=''] - Commit message.
   * @param {string} [author=''] - Author name.
   * @returns {Promise<Object>} Response with snapshotId and snapshots list.
   */
  createSnapshot(description = '', author = '') {
    if (!window.diagramEditor) return Promise.reject('No diagram editor available');
    const diagramJson = window.diagramEditor.exportDiagram();
    return this.sendMessage(BridgeAction.CREATE_SNAPSHOT, {
      diagram: diagramJson,
      description: description,
      author: author
    }, true)
      .then(response => {
        if (response.success) {
          this.showNotification('Snapshot created', 'success');
          return response;
        }
        throw new Error(response.error || 'Snapshot failed');
      })
      .catch(error => {
        this.showNotification('Failed to create snapshot: ' + error.message, 'error');
        throw error;
      });
  }

  /**
   * List all stored snapshots.
   * @returns {Promise<Array>} Array of snapshot summary objects.
   */
  listSnapshots() {
    return this.sendMessage(BridgeAction.LIST_SNAPSHOTS, {}, true)
      .then(response => response.snapshots || [])
      .catch(() => []);
  }

  /**
   * Restore the diagram from a previous snapshot.
   * @param {string} snapshotId - ID of the snapshot to restore.
   * @returns {Promise<Object>} Response with the restored diagram.
   */
  restoreSnapshot(snapshotId) {
    if (window.showLoadingSpinner) window.showLoadingSpinner('Restoring snapshot\u2026');
    return this.sendMessage(BridgeAction.RESTORE_SNAPSHOT, { snapshotId }, true)
      .then(response => {
        if (response.success && response.diagram) {
          this.handleLoadDiagram(response.diagram);
          this.showNotification('Snapshot restored', 'success');
        } else {
          throw new Error(response.error || 'Restore failed');
        }
        return response;
      })
      .catch(error => {
        this.showNotification('Restore failed: ' + error.message, 'error');
        throw error;
      })
      .finally(() => { if (window.hideLoadingSpinner) window.hideLoadingSpinner(); });
  }

  /**
   * Compare two snapshots and return a structured diff.
   * @param {string} oldId - Baseline snapshot ID.
   * @param {string} newId - Target snapshot ID.
   * @returns {Promise<Object>} Diff result object.
   */
  compareSnapshots(oldId, newId) {
    return this.sendMessage(BridgeAction.COMPARE_SNAPSHOTS, { oldId, newId }, true)
      .then(response => {
        if (response.success) {
          return response.diff;
        }
        throw new Error(response.error || 'Comparison failed');
      });
  }

  // === UI HELPERS ===

  showNotification(message, type = 'info') {
    logger.debug(`[${type.toUpperCase()}] ${message}`);

    // Announce to screen readers via ARIA live region
    var announcer = document.getElementById('aria-live-announcer');
    if (announcer) {
      announcer.textContent = message;
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    // Accessibility: mark errors/warnings as alerts for screen readers
    if (type === 'error' || type === 'warning') {
      notification.setAttribute('role', 'alert');
    } else {
      notification.setAttribute('role', 'status');
    }
    
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

    // Defensive: ensure results is always an array
    if (!Array.isArray(results)) results = [];

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
          '<strong>' + _escapeHtml(result.rule || 'check') + '</strong>: ' +
          _escapeHtml(result.message || '') +
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
    const { total_blocks: totalBlocks, sync_successful: syncSuccessful, sync_failed: syncFailed, errors } = results;
    
    if (syncFailed > 0) {
      this.showNotification(
        `Component sync: ${syncSuccessful} successful, ${syncFailed} failed`, 
        'warning'
      );
    } else {
      this.showNotification(
        `All ${syncSuccessful} components synced successfully`, 
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