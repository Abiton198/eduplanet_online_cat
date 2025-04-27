import React, { useEffect, useState } from 'react';
import Modal from 'react-modal';
import { useNavigate } from 'react-router-dom';

Modal.setAppElement('#root');  // Required for accessibility

export default function ResultsListPage() {
  const [results, setResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch all results - here we'll simulate with localStorage for now
    const savedResults = JSON.parse(localStorage.getItem('allResults')) || [];
    setResults(savedResults);
  }, []);

  const handleResultClick = (result) => {
    setSelectedResult(result);
  };

  const handleCloseModal = () => {
    setSelectedResult(null);
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6">
      <h2 className="text-2xl font-bold text-center mb-6">All Student Results</h2>
      <div className="space-y-4">
        {results.map((result) => (
          <div key={result.name} className="flex justify-between items-center bg-gray-100 p-4 rounded shadow-md hover:bg-gray-200 cursor-pointer" onClick={() => handleResultClick(result)}>
            <span>{result.name}</span>
            <span>{result.percentage}%</span>
          </div>
        ))}
      </div>

      {/* Modal for viewing result details */}
      {selectedResult && (
        <Modal
          isOpen={Boolean(selectedResult)}
          onRequestClose={handleCloseModal}
          className="modal-content"
          overlayClassName="modal-overlay"
        >
          <div className="p-6 max-w-md mx-auto bg-white rounded shadow-lg">
            <h3 className="text-xl font-bold mb-4">Result Details</h3>
            <p><b>Name:</b> {selectedResult.name}</p>
            <p><b>Score:</b> {selectedResult.score}</p>
            <p><b>Percentage:</b> {selectedResult.percentage}%</p>
            <p><b>Unanswered Questions:</b> {selectedResult.unanswered}</p>
            <p><b>Completed On:</b> {selectedResult.time}</p>

            <button
              onClick={handleCloseModal}
              className="mt-4 bg-red-500 text-white py-2 px-4 rounded-full"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
