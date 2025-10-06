import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface VersionControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  currentVersion: number;
  onVersionSelect?: (version: number) => void;
  onRollback?: (version: number) => void;
}

interface Version {
  _id: string;
  version: number;
  title: string;
  content: string;
  createdAt: string;
  createdBy: {
    username: string;
    email: string;
  };
  snapshot: boolean;
  snapshotName?: string;
  snapshotDescription?: string;
  changeSummary: {
    addedLines: number;
    removedLines: number;
    modifiedLines: number;
    totalChanges: number;
  };
  metadata: {
    wordCount: number;
    characterCount: number;
    lineCount: number;
  };
  tags: string[];
  isAutoSave: boolean;
}

interface VersionComparison {
  fromVersion: number;
  toVersion: number;
  changes: {
    added: string[];
    removed: string[];
    modified: string[];
  };
  statistics: {
    addedLines: number;
    removedLines: number;
    modifiedLines: number;
    totalChanges: number;
  };
}

const VersionControlModal: React.FC<VersionControlModalProps> = ({
  isOpen,
  onClose,
  documentId,
  currentVersion,
  onVersionSelect,
  onRollback
}) => {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<number[]>([]);
  const [comparison, setComparison] = useState<VersionComparison | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');
  const [snapshotDescription, setSnapshotDescription] = useState('');
  const [showSnapshotForm, setShowSnapshotForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'snapshots' | 'compare'>('history');

  useEffect(() => {
    if (isOpen && documentId) {
      loadVersions();
    }
  }, [isOpen, documentId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3003/api/versions/history/${documentId}?limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVersions(data.data.versions || []);
      }
    } catch (error) {
      console.error('Error loading versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSnapshot = async () => {
    if (!snapshotName.trim()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3003/api/versions/snapshot/${documentId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          snapshotName: snapshotName.trim(),
          snapshotDescription: snapshotDescription.trim(),
          tags: []
        })
      });

      if (response.ok) {
        setSnapshotName('');
        setSnapshotDescription('');
        setShowSnapshotForm(false);
        loadVersions();
      }
    } catch (error) {
      console.error('Error creating snapshot:', error);
    } finally {
      setLoading(false);
    }
  };

  const compareVersions = async () => {
    if (selectedVersions.length !== 2) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [fromVersion, toVersion] = selectedVersions.sort((a, b) => a - b);
      
      const response = await fetch(
        `http://localhost:3003/api/versions/compare/${documentId}/${fromVersion}/${toVersion}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setComparison(data.data);
        setShowComparison(true);
        setActiveTab('compare');
      }
    } catch (error) {
      console.error('Error comparing versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const rollbackToVersion = async (version: number) => {
    if (!window.confirm(`Are you sure you want to rollback to version ${version}? This will create a new version with the old content.`)) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3003/api/versions/rollback/${documentId}/${version}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: `Manual rollback to version ${version}`
        })
      });

      if (response.ok) {
        onRollback?.(version);
        loadVersions();
      }
    } catch (error) {
      console.error('Error rolling back:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectVersion = (version: number) => {
    if (selectedVersions.includes(version)) {
      setSelectedVersions(selectedVersions.filter(v => v !== version));
    } else if (selectedVersions.length < 2) {
      setSelectedVersions([...selectedVersions, version]);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getVersionIcon = (version: Version) => {
    if (version.snapshot) return '📸';
    if (version.isAutoSave) return '💾';
    return '📝';
  };

  const getVersionTitle = (version: Version) => {
    if (version.snapshot && version.snapshotName) {
      return version.snapshotName;
    }
    return `Version ${version.version}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Version Control</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'history' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📚 History
          </button>
          <button
            onClick={() => setActiveTab('snapshots')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'snapshots' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📸 Snapshots
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'compare' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🔍 Compare
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner />
            </div>
          )}

          {!loading && activeTab === 'history' && (
            <div className="h-full overflow-y-auto p-6">
              <div className="space-y-4">
                {versions.map((version) => (
                  <div
                    key={version._id}
                    className={`border rounded-lg p-4 ${
                      version.version === currentVersion 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getVersionIcon(version)}</span>
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {getVersionTitle(version)}
                          </h3>
                          <p className="text-sm text-gray-600">
                            by {version.createdBy.username} • {formatDate(version.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {version.version !== currentVersion && (
                          <button
                            onClick={() => rollbackToVersion(version.version)}
                            className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
                          >
                            Rollback
                          </button>
                        )}
                        <button
                          onClick={() => onVersionSelect?.(version.version)}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                        >
                          View
                        </button>
                      </div>
                    </div>
                    
                    {version.changeSummary.totalChanges > 0 && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="text-green-600">+{version.changeSummary.addedLines}</span>
                        <span className="text-red-600"> -{version.changeSummary.removedLines}</span>
                        <span className="text-blue-600"> ~{version.changeSummary.modifiedLines}</span>
                      </div>
                    )}

                    <div className="mt-2 text-sm text-gray-500">
                      {version.metadata.wordCount} words • {version.metadata.characterCount} characters
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && activeTab === 'snapshots' && (
            <div className="h-full overflow-y-auto p-6">
              <div className="mb-4">
                <button
                  onClick={() => setShowSnapshotForm(!showSnapshotForm)}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  📸 Create Snapshot
                </button>
              </div>

              {showSnapshotForm && (
                <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                  <h3 className="font-semibold mb-3">Create Snapshot</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Snapshot name"
                      value={snapshotName}
                      onChange={(e) => setSnapshotName(e.target.value)}
                      className="w-full px-3 py-2 border rounded"
                    />
                    <textarea
                      placeholder="Description (optional)"
                      value={snapshotDescription}
                      onChange={(e) => setSnapshotDescription(e.target.value)}
                      className="w-full px-3 py-2 border rounded"
                      rows={3}
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={createSnapshot}
                        disabled={!snapshotName.trim()}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => setShowSnapshotForm(false)}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {versions.filter(v => v.snapshot).map((version) => (
                  <div key={version._id} className="border rounded-lg p-4 bg-yellow-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">📸</span>
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {version.snapshotName || `Snapshot ${version.version}`}
                          </h3>
                          <p className="text-sm text-gray-600">
                            by {version.createdBy.username} • {formatDate(version.createdAt)}
                          </p>
                          {version.snapshotDescription && (
                            <p className="text-sm text-gray-500 mt-1">
                              {version.snapshotDescription}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => rollbackToVersion(version.version)}
                          className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => onVersionSelect?.(version.version)}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && activeTab === 'compare' && (
            <div className="h-full overflow-y-auto p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  Select two versions to compare (click on versions to select them)
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={compareVersions}
                    disabled={selectedVersions.length !== 2}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    Compare Selected ({selectedVersions.length}/2)
                  </button>
                  <button
                    onClick={() => setSelectedVersions([])}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>

              {showComparison && comparison && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="font-semibold mb-3">
                    Comparison: v{comparison.fromVersion} → v{comparison.toVersion}
                  </h3>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        +{comparison.statistics.addedLines}
                      </div>
                      <div className="text-sm text-gray-600">Added</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        -{comparison.statistics.removedLines}
                      </div>
                      <div className="text-sm text-gray-600">Removed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        ~{comparison.statistics.modifiedLines}
                      </div>
                      <div className="text-sm text-gray-600">Modified</div>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {comparison.changes.added.map((line, index) => (
                      <div key={index} className="text-green-600 bg-green-50 p-1 rounded">
                        {line}
                      </div>
                    ))}
                    {comparison.changes.removed.map((line, index) => (
                      <div key={index} className="text-red-600 bg-red-50 p-1 rounded">
                        {line}
                      </div>
                    ))}
                    {comparison.changes.modified.map((line, index) => (
                      <div key={index} className="text-blue-600 bg-blue-50 p-1 rounded">
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {versions.map((version) => (
                  <div
                    key={version._id}
                    className={`border rounded p-3 cursor-pointer ${
                      selectedVersions.includes(version.version)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => selectVersion(version.version)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedVersions.includes(version.version)}
                          onChange={() => selectVersion(version.version)}
                          className="mr-2"
                        />
                        <span>{getVersionIcon(version)}</span>
                        <span className="font-medium">{getVersionTitle(version)}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {formatDate(version.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VersionControlModal;

